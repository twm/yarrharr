# Copyright © 2013, 2015, 2016, 2017, 2018, 2020, 2022 Tom Most <twm@freecog.net>
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.
#
# Additional permission under GNU GPL version 3 section 7
#
# If you modify this Program, or any covered work, by linking or
# combining it with OpenSSL (or a modified version of that library),
# containing parts covered by the terms of the OpenSSL License, the
# licensors of this Program grant you additional permission to convey
# the resulting work.  Corresponding Source for a non-source form of
# such a combination shall include the source code for the parts of
# OpenSSL used as well as that of the covered work.

"""
Yarrharr production server via Twisted Web
"""

import io
import json
import logging
import os
import re
import sys
from base64 import b64encode

import attr
from django.conf import settings
from django.dispatch import receiver
from twisted.internet import defer
from twisted.internet.endpoints import serverFromString
from twisted.logger import (
    FileLogObserver,
    FilteringLogObserver,
    ILogFilterPredicate,
    Logger,
    LogLevel,
    PredicateResult,
    formatEvent,
    globalLogBeginner,
    globalLogPublisher,
)
from twisted.python.filepath import FilePath
from twisted.web.resource import ErrorPage, NoResource, Resource
from twisted.web.server import Site
from twisted.web.static import File
from twisted.web.wsgi import WSGIResource
from zope.interface import implementer

from . import __version__
from .signals import schedule_changed
from .wsgi import application

log = Logger()


@attr.s
class CSPReport(object):
    url = attr.ib()
    referrer = attr.ib()
    resource = attr.ib()
    violatedDirective = attr.ib()
    effectiveDirective = attr.ib()
    source = attr.ib()
    sample = attr.ib()
    status = attr.ib()
    policy = attr.ib()
    disposition = attr.ib()

    def __str__(self):
        bits = []
        for a in attr.fields(self.__class__):
            value = getattr(self, a.name)
            if value is None:
                continue
            bits.append("{}={!r}".format(a.name, value))
        return "\n".join(bits)

    @classmethod
    def fromJSON(cls, data):
        """
        Construct a :class:`CSPReport` from the serialization of a violation
        per CSP Level 3 §5.3.
        """
        if {"source-file", "line-number", "column-number"} <= data.keys():
            source = "{source-file} {line-number}:{column-number}".format_map(data)
        elif {"source-file", "line-number"} <= data.keys():
            source = "{source-file} {line-number}".format_map(data)
        else:
            source = data.get("source-file")
        return cls(
            url=data["document-uri"],
            referrer=data["referrer"] or None,  # Always seems to be an empty string.
            resource=data["blocked-uri"],
            violatedDirective=data.get("violated-directive"),
            effectiveDirective=data.get("effective-directive"),
            policy=data["original-policy"],
            disposition=data.get("disposition"),
            status=data.get("status-code"),
            sample=data.get("script-sample") or None,
            source=source,
        )


class CSPReportLogger(Resource):
    isLeaf = True
    _log = Logger()

    def render(self, request):
        if request.method != b"POST":
            request.setResponseCode(405)
            request.setHeader("Allow", "POST")
            return b"HTTP 405: Method Not Allowed\n"
        if request.requestHeaders.getRawHeaders("Content-Type") != ["application/csp-report"]:
            request.setResponseCode(415)
            return b"HTTP 415: Only application/csp-report requests are accepted\n"
        # Process the JSON text produced per
        # https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation
        report = CSPReport.fromJSON(json.load(io.TextIOWrapper(request.content, encoding="utf-8"))["csp-report"])
        if report.sample and report.sample.startswith(";(function installGlobalHook(window) {"):
            # This seems to be a misbehavior in some Firefox extension.
            # I cannot reproduce it with a clean profile.
            return b""
        if report.sample and report.sample == "call to eval() or related function blocked by CSP":
            # This is caused by Tridactyl due to a Firefox issue. It's quite
            # chatty so we'll disable for now, even though the message is
            # generated by the browser and might indicate a script injection.
            # See <https://github.com/cmcaine/tridactyl/issues/109> and
            # <https://bugzilla.mozilla.org/show_bug.cgi?id=1267027>.
            return b""
        self._log.debug(
            "Content Security Policy violation reported by {userAgent!r}:\n{report}",
            userAgent=", ".join(request.requestHeaders.getRawHeaders("User-Agent", [])),
            report=report,
        )
        return b""  # Browser ignores the response.


class FallbackResource(Resource):
    """
    Resource which falls back to an alternative resource tree if it doesn't
    have a matching child resource.
    """

    def __init__(self, fallback):
        Resource.__init__(self)
        self.fallback = fallback

    def render(self, request):
        """
        Render this path with the fallback resource.
        """
        return self.fallback.render(request)

    def getChild(self, path, request):
        """
        Dispatch unhandled requests to the fallback resource.
        """
        # Mutate the request path such that it's like FallbackResource didn't handle
        # the request at all.  This is a bit of a nasty hack, since we're
        # relying on the t.w.server implementation's behavior to not break when
        # we do this.  A better way would be to create a wrapper for the request object
        request.postpath.insert(0, request.prepath.pop())
        return self.fallback


class Static(Resource):
    """
    Serve up Yarrharr's static assets directory. The files in this directory
    have names like::

    In development, the files are served uncompressed and named like so::

        main-afffb00fd22ca3ce0250.js

    The second dot-delimited section is a hash of the file's contents or source
    material. As the filename changes each time the content does, these files
    are served with a long max-age and the ``immutable`` flag in the
    `Cache-Control`_ header.

    In production, each file has two pre-compressed variants: one with
    a ``.gz`` extension, and one with a ``.br`` extension. For example::

        main-afffb00fd22ca3ce0250.js
        main-afffb00fd22ca3ce0250.js.br
        main-afffb00fd22ca3ce0250.js.gz

    The actual serving of the files is done by `twisted.web.static.File`, which
    is fancy and supports range requests, conditional gets, etc.

    .. note::

        Several features used here are only available to HTTPS origins.
        Cache-Control: immutable and Brotli compression both are in Firefox.

    .. _cache-control: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
    """

    _dir = FilePath(settings.STATIC_ROOT)
    _validName = re.compile(rb"^[a-zA-Z0-9]+-[a-zA-Z0-9]+(\.[a-z]+)+$")
    # NOTE: RFC 7231 § 5.3.4 is not completely clear about whether
    # content-coding tokens are case-sensitive or not. The "identity" token
    # appears in EBNF and is therefore definitely case-insensitive, but the
    # other tokens only appear in IANA registry tables in lowercase form. In
    # contrast, the transfer-coding possibilities are clearly defined in EBNF
    # so are definitely case-insensitive. For content-coding every implementer
    # seems to agree on lowercase, so I'm not going to worry about it.
    _brToken = re.compile(rb"(:?^|[\s,])br(:?$|[\s,;])")
    _gzToken = re.compile(rb"(:?^|[\s,])(:?x-)?gzip(:?$|[\s,;])")
    _contentTypes = {
        b".js": "application/javascript",
        b".css": "text/css",
        b".map": "application/octet-stream",
        b".ico": "image/x-icon",
        b".svg": "image/svg+xml",
        b".png": "image/png",
    }

    def _file(self, path, type, encoding=None):
        """
        Construct a `twisted.web.static.File` customized to serve Yarrharr
        static assets.

        :param path: `twisted.internet.filepath.FilePath` instance
        :returns: `twisted.web.resource.IResource`
        """
        f = File(path.path)
        f.type = type
        f.encoding = encoding
        return f

    def getChild(self, path, request):
        """
        Serve a file for the given path.

        The Content-Type header is set based on the file extension.

        A limited form of content negotiation is done based on the
        Accept-Encoding header and the files on disk. Apart from the default of
        ``identity``, two encodings are supported:

         *  ``br``, which selects any Brotli-compressed ``.br`` variant of
            the file.
         * ``gzip``, which selects any gzip-compressed ``.br`` variant of the
            file. ``x-gzip`` is also supported.

        qvalues are ignored as browsers don't use them. This may produce an
        incorrect response if a variant is disabled like ``identity;q=0``.
        """
        if not self._validName.match(path):
            return NoResource("Not found.")

        ext = path[path.rindex(b".") :]
        try:
            type = self._contentTypes[ext]
        except KeyError:
            return NoResource("Unknown type.")

        acceptEncoding = request.getHeader(b"accept-encoding") or b"*"

        file = None
        if self._brToken.search(acceptEncoding):
            br = self._dir.child(path + b".br")
            if br.isfile():
                file = self._file(br, type, "br")

        if file is None and self._gzToken.search(acceptEncoding):
            gz = self._dir.child(path + b".gz")
            if gz.isfile():
                file = self._file(gz, type, "gzip")

        if file is None:
            file = self._file(self._dir.child(path), type)

        request.setHeader(b"Vary", b"accept-encoding")
        request.setHeader(b"Cache-Control", b"public, max-age=31536000, immutable")
        return file


class Root(FallbackResource):
    """
    Root of the Yarrharr URL hierarchy.
    """

    def __init__(self, reactor, threadpool):
        wsgi = WSGIResource(reactor, threadpool, application)

        FallbackResource.__init__(self, wsgi)

        self.putChild(b"csp-report", CSPReportLogger())
        self.putChild(b"static", Static())
        # Handle requests for /favicon.ico and paths hit by script kiddies at
        # the Twisted level so that they don't make it down to Django, which
        # logs 404s as errors:
        a404 = ErrorPage(404, "Not Found", "")
        for path in (b"favicon.ico", b"index.php", b"wp-login.php"):
            self.putChild(path, a404)

    def getChildWithDefault(self, name, request):
        # Disable the Referer header in some browsers. This is complemented by
        # the injection of rel="noopener noreferrer" on all links by the HTML
        # sanitizer.
        request.setHeader(b"Referrer-Policy", b"same-origin")
        request.setHeader(b"X-Content-Type-Options", b"nosniff")
        request.setHeader(b"Cross-Origin-Opener-Policy", b"same-origin")

        script_nonce = b64encode(os.urandom(32))
        request.requestHeaders.setRawHeaders(b"Yarrharr-Script-Nonce", [script_nonce])
        request.setHeader(
            b"Content-Security-Policy",
            (
                # b"default-src 'none'; "
                b"img-src *; "
                b"script-src 'self' 'nonce-%s'; "
                b"style-src 'self'; "
                b"frame-ancestors 'none'; "
                b"form-action 'self'; "
                b"report-uri /csp-report"
            )
            % (script_nonce,),
        )

        return super().getChildWithDefault(name, request)


def updateFeeds(reactor, max_fetch=5):
    """
    Poll any feeds due for a check.
    """
    from .fetch import poll

    def _failed(reason):
        """
        Log unexpected errors and schedule a retry in one second.
        """
        log.failure("Unexpected failure polling feeds", failure=reason)
        return 1.0  # seconds until next poll

    d = poll(reactor, max_fetch)
    # Last gasp error handler to avoid terminating the LoopingCall.
    d.addErrback(_failed)
    return d


_txLevelToPriority = {
    LogLevel.debug: "<7>",
    LogLevel.info: "<6>",
    LogLevel.warn: "<4>",
    LogLevel.error: "<3>",
    LogLevel.critical: "<2>",
}


def formatForSystemd(event):
    # Events generated by twisted.python.log have a "system", while ones
    # generated with twisted.logger have a "namespace" with similar
    # meaning.
    #
    s = "[{}] ".format(event.get("log_system") or event.get("log_namespace") or "-")
    s += formatEvent(event)

    if not s:
        return None

    if "log_failure" in event:
        try:
            s += "\n" + event["log_failure"].getTraceback().rstrip("\n")
        except:  # noqa
            pass

    prefix = _txLevelToPriority.get(event.get("log_level")) or "<6>"
    return prefix + s.replace("\n", "\n" + prefix + "  ") + "\n"


@implementer(ILogFilterPredicate)
def dropUnhandledHTTP2Shutdown(event):
    """
    Suppress the log messages which result from an unhandled error in HTTP/2
    connection shutdown. See #282 and Twisted #9462.

    This log message is relayed from the :mod:`twisted.python.log` so the
    fields are a little odd:

     *  ``'log_namespace'`` is ``'log_legacy'``, and there is a ``'system'``
        field with a value of ``'-'``.
     *  ``'log_text'`` contains the actual log text, including a pre-formatted
        traceback.
     *  ``'failure'`` used instead of ``'log_failure'``.
    """
    if event.get("log_namespace") != "log_legacy":
        return PredicateResult.maybe
    if event.get("log_level") != LogLevel.critical:
        return PredicateResult.maybe
    if "failure" not in event or not event["failure"].check(AttributeError):
        return PredicateResult.maybe
    if event["log_text"].startswith("Unhandled Error") and "no attribute 'shutdown'" in event["log_text"]:
        return PredicateResult.no
    return PredicateResult.maybe


class TwistedLoggerLogHandler(logging.Handler):
    publisher = globalLogPublisher

    def _mapLevel(self, levelno):
        """
        Convert a stdlib logging level into a Twisted :class:`LogLevel`.
        """
        if levelno <= logging.DEBUG:
            return LogLevel.debug
        elif levelno <= logging.INFO:
            return LogLevel.info
        elif levelno <= logging.WARNING:
            return LogLevel.warn
        elif levelno <= logging.ERROR:
            return LogLevel.error
        return LogLevel.critical

    def emit(self, record):
        self.publisher(
            {
                "log_level": self._mapLevel(record.levelno),
                "log_namespace": record.name,
                "log_format": "{msg}",
                "msg": self.format(record),
            }
        )


class AdaptiveLoopingCall(object):
    """
    :class:`AdaptiveLoopingCall` invokes a function periodically. Each time it
    is called it returns the time to wait until the next invocation.

    :ivar _clock: :class:`IReactorTime` implementer
    :ivar _f: The function to call.
    :ivar _deferred: Deferred returned by :meth:`.start()`.
    :ivar _call: `IDelayedCall` when waiting for the next poll period.
        Otherwise `None`.
    :ivar bool _poked: `True` when the function should be immediately invoked
        again after it completes.
    :ivar bool _stopped: `True` once `stop()` has been called.
    """

    _deferred = None
    _call = None
    _poked = False
    _stopped = False

    def __init__(self, clock, f):
        """
        :param clock: :class:`IReactorTime` provider to use when scheduling
            calls.
        :param f: The function to call when the loop is started. It must return
            the number of seconds to wait before calling it again, or
            a deferred for the same.
        """
        self._clock = clock
        self._f = f

    def start(self):
        """
        Call the function immediately, and schedule future calls according to
        its result.

        :returns:
            :class:`Deferred` which will succeed when :meth:`stop()` is called
            and the loop cleanly exits, or fail when the function produces
            a failure.
        """
        assert self._deferred is None
        assert self._call is None
        assert not self._stopped
        self._deferred = d = defer.Deferred()
        self._callIt()
        return d

    def stop(self):
        self._stopped = True
        if self._call:
            self._call.cancel()
            self._deferred.callback(self)

    def poke(self):
        """
        Run the function as soon as possible: either immediately or once it has
        finished any current execution. This is a no-op if the service has been
        stopped. Pokes coalesce if received while the function is executing.
        """
        if self._stopped or self._poked:
            return
        if self._call:
            self._call.cancel()
            self._callIt()
        else:
            self._poked = True

    def _callIt(self):
        self._call = None
        d = defer.maybeDeferred(self._f)
        d.addCallback(self._schedule)
        d.addErrback(self._failLoop)

    def _schedule(self, seconds):
        """
        Schedule the next call.
        """
        assert isinstance(seconds, (int, float))
        if self._stopped:
            d, self._deferred = self._deferred, None
            d.callback(self)
        elif self._poked:
            self._poked = False
            self._callIt()
        else:
            self._call = self._clock.callLater(seconds, self._callIt)

    def _failLoop(self, failure):
        """
        Terminate the loop due to an unhandled failure.
        """
        d, self._deferred = self._deferred, None
        d.errback(failure)


def run():
    from twisted.internet import reactor

    root = logging.getLogger()
    logging.getLogger("django").setLevel(logging.INFO)
    logging.raiseExceptions = settings.DEBUG
    logging._srcfile = None  # Disable expensive collection of location information.
    root.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    root.addHandler(TwistedLoggerLogHandler())
    observer = FilteringLogObserver(
        FileLogObserver(sys.stdout, formatForSystemd),
        [dropUnhandledHTTP2Shutdown],
    )
    globalLogBeginner.beginLoggingTo([observer], redirectStandardIO=False)

    log.info("Yarrharr {version} starting", version=__version__)

    factory = Site(Root(reactor, reactor.getThreadPool()), logPath=None)
    endpoint = serverFromString(reactor, settings.SERVER_ENDPOINT)
    reactor.addSystemEventTrigger("before", "startup", endpoint.listen, factory)

    updateLoop = AdaptiveLoopingCall(reactor, lambda: updateFeeds(reactor))
    loopEndD = updateLoop.start()
    loopEndD.addErrback(lambda f: log.failure("Polling loop broke", f))

    @receiver(schedule_changed)
    def threadPollNow(sender, **kwargs):
        """
        When the `schedule_changed` signal is sent poke the polling loop. If it
        is sleeping this will cause it to poll immediately. Otherwise this will
        cause it to run the poll function immediately once it returns (running
        it again protects against races).
        """
        log.debug("Immediate poll triggered by {sender}", sender=sender)
        reactor.callFromThread(updateLoop.poke)

    def stopUpdateLoop():
        updateLoop.stop()
        return loopEndD

    reactor.addSystemEventTrigger("before", "shutdown", stopUpdateLoop)

    reactor.run()
