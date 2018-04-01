# -*- coding: utf-8 -*-
# Copyright © 2013, 2015, 2016, 2017, 2018 Tom Most <twm@freecog.net>
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
from pprint import pformat
import sys

from django.conf import settings
from twisted.logger import globalLogBeginner
from twisted.logger import FileLogObserver, Logger, LogLevel, globalLogPublisher
from twisted.internet import task
from twisted.logger import formatEvent
from twisted.web.wsgi import WSGIResource
from twisted.web.server import Site
from twisted.web.static import File
from twisted.web.resource import Resource
from twisted.internet.endpoints import serverFromString

from . import __version__
from .wsgi import application


log = Logger()


class CSPReportLogger(Resource):
    isLeaf = True

    def render(self, request):
        if request.method != b'POST':
            request.setResponseCode(405)
            request.setHeader('Allow', 'POST')
            return b'HTTP 405: Method Not Allowed\n'
        if request.requestHeaders.getRawHeaders('Content-Type') != ['application/csp-report']:
            request.setResponseCode(415)
            return b'HTTP 415: Only application/csp-report requests are accepted\n'
        # Process the JSON text produced per
        # https://w3c.github.io/webappsec-csp/#deprecated-serialize-violation
        report = json.load(io.TextIOWrapper(request.content, encoding='utf-8'))['csp-report']
        log.debug("Content Security Policy violation reported by {userAgent!r}:\n{report}",
                  userAgent=', '.join(request.requestHeaders.getRawHeaders('User-Agent')),
                  report=pformat(report))
        return b''  # Browser ignores the response.


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


class Root(FallbackResource):
    """
    Root of the Yarrharr URL hierarchy.
    """
    def __init__(self, reactor, threadpool):
        wsgi = WSGIResource(reactor, threadpool, application)

        FallbackResource.__init__(self, wsgi)

        self.putChild(b'csp-report', CSPReportLogger())
        self.putChild(b'static', File(settings.STATIC_ROOT))

    def getChildWithDefault(self, name, request):
        # Disable the Referer header in some browsers. This is complemented by
        # the injection of rel="noopener noreferrer" on all links by the HTML
        # sanitizer.
        request.setHeader(b'Referrer-Policy', b'no-referrer')
        request.setHeader(b'X-Content-Type-Options', b'nosniff')

        request.setHeader(b'Content-Security-Policy',
                          # b"default-src 'none'; "
                          b"img-src *; "
                          b"script-src 'self'; "
                          b"style-src 'self'; "
                          b"frame-ancestors 'none'; "
                          b"form-action 'self'; "
                          b"report-uri /csp-report")

        return super().getChildWithDefault(name, request)


def updateFeeds(reactor, max_fetch=5):
    """
    Poll any feeds due for a check.
    """
    from .fetch import poll

    d = poll(reactor, max_fetch)
    # Last gasp error handler to avoid terminating the LoopingCall.
    d.addErrback(log.failure, "Unexpected failure polling feeds")
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
    s = "[{}] ".format(event.get("log_system") or
                       event.get("log_namespace") or "-")
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
        self.publisher({
            'log_level': self._mapLevel(record.levelno),
            'log_namespace': record.name,
            'log_format': '{msg}',
            'msg': self.format(record),
        })


def run():
    from twisted.internet import reactor

    root = logging.getLogger()
    logging.getLogger('django').setLevel(logging.INFO)
    logging.raiseExceptions = settings.DEBUG
    logging._srcfile = None  # Disable expensive collection of location information.
    root.setLevel(logging.DEBUG if settings.DEBUG else logging.INFO)
    root.addHandler(TwistedLoggerLogHandler())
    globalLogBeginner.beginLoggingTo([FileLogObserver(sys.stdout, formatForSystemd)],
                                     redirectStandardIO=False)

    log.info("Yarrharr {version} starting", version=__version__)

    factory = Site(Root(reactor, reactor.getThreadPool()), logPath=None)
    endpoint = serverFromString(reactor, settings.SERVER_ENDPOINT)
    reactor.addSystemEventTrigger('before', 'startup', endpoint.listen, factory)

    updateLoop = task.LoopingCall(updateFeeds, reactor)
    # TODO: Adjust the loop period dynamically according to the time the next check is due.
    loopEndD = updateLoop.start(15)
    loopEndD.addErrback(log.failure, "Polling loop broke")

    def stopUpdateLoop():
        updateLoop.stop()
        return loopEndD

    reactor.addSystemEventTrigger('before', 'shutdown', stopUpdateLoop)

    reactor.run()
