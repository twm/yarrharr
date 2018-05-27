# Copyright © 2018 Tom Most <twm@freecog.net>
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

from io import StringIO
import json
import logging
import unittest
from unittest import mock

from treq.testing import StubTreq
from twisted.logger import Logger, LogPublisher, FileLogObserver
from twisted.internet import defer, task
from twisted.python.log import LogPublisher as LegacyLogPublisher
from twisted.python.failure import Failure
from twisted.python.threadpool import ThreadPool
from twisted.test.proto_helpers import MemoryReactorClock
from twisted.trial.unittest import SynchronousTestCase

from ..application import AdaptiveLoopingCall
from ..application import CSPReport
from ..application import Root
from ..application import TwistedLoggerLogHandler, formatForSystemd


class CSPReportTests(unittest.TestCase):
    def test_fromJSONFirefox(self):
        """
        The fromJSON constructor can handle a report generated by Firefox 59.
        """
        report = CSPReport.fromJSON({
            'blocked-uri': 'self',
            'document-uri': 'http://127.0.0.1:8888/feed/243/unread/',
            'line-number': 26,
            'original-policy': 'img-src *; script-src http://127.0.0.1:8888; style-src '
                               "http://127.0.0.1:8888; frame-ancestors 'none'; "
                               'form-action http://127.0.0.1:8888; report-uri '
                               'http://127.0.0.1:8888/csp-report',
            'referrer': '',
            'script-sample': '\n        var props = {"feedsById": {"1":...',
            'source-file': 'http://127.0.0.1:8888/feed/243/unread/',
            'violated-directive': 'script-src',
        })

        self.assertEqual(report.source, "http://127.0.0.1:8888/feed/243/unread/ 26")

    def test_fromJSONChrome(self):
        """
        The fromJSON constructor can handle a report generated by Chrome 65.
        """
        report = CSPReport.fromJSON({
            "document-uri": "http://127.0.0.1:8888/feed/243/unread/",
            "referrer": "",
            "violated-directive": "script-src",
            "effective-directive": "script-src",
            "original-policy": "img-src *; script-src 'self'; style-src 'self'; "
                               "frame-ancestors 'none'; form-action 'self'; report-uri /csp-report",
            "disposition": "enforce",
            "blocked-uri": "inline",
            "line-number": 14,
            "source-file": "http://127.0.0.1:8888/feed/243/unread/",
            "status-code": 200,
            "script-sample": "",
        })

        self.assertIs(report.referrer, None)


class RootTests(SynchronousTestCase):
    def mkTreq(self):
        """
        Construct a :class:`treq.testing.StubTreq` which wraps
        a :class:`yarrharr.application.Root` resource.
        """
        reactor = MemoryReactorClock()  # unused
        threadpool = ThreadPool(minthreads=0)  # unused
        self.addCleanup(threadpool.stop)
        return StubTreq(Root(reactor, threadpool))

    def test_referrer_policy(self):
        """
        The ``Referrer-Policy: same-origin`` header is injected into every response.
        ``same-origin`` is used instead of ``no-referrer`` as <Django's CSRF
        protection uses the Referrer header in some circumstances
        <https://www.b-list.org/weblog/2018/mar/06/two-new-projects/>`_.
        """
        treq = self.mkTreq()

        # This test runs against /static/ as it is a pure-Twisted codepath. Any
        # route handled by Django will try to run stuff in a threadpool, which
        # requires a real reactor (or at least a much more complete fake).
        # Someday the test suite may need to be run with Trial so that
        # twisted.trial.unittest.TestCase's real reactor works, but we'll avoid
        # that for now.
        response = self.successResultOf(treq.get('http://127.0.0.1:8888/static/'))

        self.assertEqual(['same-origin'], response.headers.getRawHeaders('Referrer-Policy'))

    def test_x_content_type_options(self):
        """
        The ``X-Content-Type-Options: nosniff`` header is injected into every
        response.
        """
        treq = self.mkTreq()

        response = self.successResultOf(treq.get('http://127.0.0.1:8888/static/'))

        self.assertEqual(['nosniff'], response.headers.getRawHeaders('X-Content-Type-Options'))

    def test_csp_reporter(self):
        """
        The ``/csp-report`` endpoint should accept and log a Content Security
        Policy report.
        """
        treq = self.mkTreq()

        response = self.successResultOf(treq.post('http://127.0.0.1:8888/csp-report', data=json.dumps({
            'csp-report': {
                'blocked-uri': 'self',
                'document-uri': 'http://127.0.0.1:8888/feed/243/unread/',
                'line-number': 26,
                'original-policy': 'img-src *; script-src http://127.0.0.1:8888; style-src '
                                   "http://127.0.0.1:8888; frame-ancestors 'none'; "
                                   'form-action http://127.0.0.1:8888; report-uri '
                                   'http://127.0.0.1:8888/csp-report',
                'referrer': '',
                'script-sample': '\n        var props = {"feedsById": {"1":...',
                'source-file': 'http://127.0.0.1:8888/feed/243/unread/',
                'violated-directive': 'script-src',
            },
        }).encode(), headers={'Content-Type': ['application/csp-report']}))

        self.assertEqual(200, response.code)


class FormatForSystemdTests(SynchronousTestCase):
    def test_logger_namespace(self):
        """
        A `twisted.logger.Logger` with a namespace gets that namespace as a prefix.
        """
        fout = StringIO()
        log = Logger(namespace="ns", observer=FileLogObserver(fout, formatForSystemd))

        log.info("info\n{more}", more="info")
        log.error("err")

        self.assertEqual((
            "<6>[ns] info\n"
            "<6>  info\n"
            "<3>[ns] err\n"
        ), fout.getvalue())

    def test_logger_namespace_failure(self):
        """
        An unexpected failure, logged as critical, is displayed across multiple
        lines.
        """
        fout = StringIO()
        log = Logger(namespace="ns", observer=FileLogObserver(fout, formatForSystemd))

        log.failure("Something went wrong", Failure(Exception("1\n2\n3")))

        self.assertEqual((
            "<2>[ns] Something went wrong\n"
            "<2>  Traceback (most recent call last):\n"
            "<2>  Failure: builtins.Exception: 1\n"
            "<2>  2\n"
            "<2>  3\n"
        ), fout.getvalue())

    def test_log_legacy(self):
        fout = StringIO()
        p = LegacyLogPublisher(publishPublisher=LogPublisher(FileLogObserver(fout, formatForSystemd)))

        p.msg('msg')
        p.msg('msg', system='system')
        p.msg('m\ns\ng', logLevel=logging.DEBUG)

        self.assertEqual((
            "<6>[-] msg\n"
            "<6>[system] msg\n"
            "<7>[-] m\n"
            "<7>  s\n"
            "<7>  g\n"
        ), fout.getvalue())

    def _get_stdlib_logger(self, name):
        fout = StringIO()
        handler = TwistedLoggerLogHandler()
        handler.publisher = LogPublisher(FileLogObserver(fout, formatForSystemd))
        log = logging.getLogger(name)
        log.setLevel(logging.DEBUG)
        log.propagate = False
        log.addHandler(handler)
        return log, fout

    def test_logging_formatter(self):
        log, fout = self._get_stdlib_logger('test_logging_formatter')

        log.debug("debug")
        log.info("info")
        log.warning("warn")
        log.error("error")
        log.critical("critical")

        self.assertEqual((
            "<7>[test_logging_formatter] debug\n"
            "<6>[test_logging_formatter] info\n"
            "<4>[test_logging_formatter] warn\n"
            "<3>[test_logging_formatter] error\n"
            "<2>[test_logging_formatter] critical\n"
        ), fout.getvalue())

    def test_logging_exception(self):
        log, fout = self._get_stdlib_logger('test_logging_exception')

        try:
            raise Exception('...')
        except Exception:
            log.exception("...")

        output = fout.getvalue()
        self.assertTrue(all(l.startswith(('<3>[', '<3>  ')) for l in output.splitlines()))
        self.assertIn('Traceback (most recent call last):\n', output)


class AdaptiveLoopingCallTests(SynchronousTestCase):
    def test_start(self):
        """
        start() immediately calls the function and schedules a call according
        to its return value.
        """
        clock = task.Clock()
        loop = AdaptiveLoopingCall(clock, lambda: 13)
        startD = loop.start()

        [call] = clock.getDelayedCalls()
        self.assertEqual(13.0, call.getTime())
        self.assertNoResult(startD)

    def test_deferred(self):
        """
        The function may return a Deferred which is waited on before the next
        call is scheduled.
        """
        clock = task.Clock()
        d = defer.Deferred()
        loop = AdaptiveLoopingCall(clock, lambda: d)
        startD = loop.start()

        self.assertEqual([], clock.getDelayedCalls())
        self.assertNoResult(startD)

        d.callback(3.5)

        [call] = clock.getDelayedCalls()
        self.assertEqual(3.5, call.getTime())
        self.assertNoResult(startD)

    def test_stop_waits(self):
        """
        The stop() method waits for any pending call to complete.
        """
        clock = task.Clock()
        d = defer.Deferred()
        loop = AdaptiveLoopingCall(clock, lambda: d)
        startD = loop.start()

        loop.stop()
        self.assertNoResult(startD)

        d.callback(1.0)
        self.assertIs(loop, self.successResultOf(startD))

    def test_fail_loop(self):
        """
        The deferred returned by start() fails when the function throws.
        """
        def thrower():
            raise IndentationError

        clock = task.Clock()
        loop = AdaptiveLoopingCall(clock, thrower)
        startD = loop.start()

        self.failureResultOf(startD).trap(IndentationError)

    def test_poke_while_sleeping(self):
        """
        The poke() method causes the scheduled delayed call to be cancelled and
        the function invoked immediately.
        """
        clock = task.Clock()
        func = mock.Mock(wraps=lambda: 100)
        loop = AdaptiveLoopingCall(clock, func)
        startD = loop.start()

        loop.poke()

        self.assertNoResult(startD)  # No internal failures.
        self.assertEqual([
            mock.call(),  # Invocation on start().
            mock.call(),  # Invocation on poke().
        ], func.mock_calls)
        self.assertEqual(1, len(clock.getDelayedCalls()))

    def test_poke_while_running(self):
        """
        The poke() method causes the function to be invoked again as soon as an
        ongoing execution completes.
        """
        clock = task.Clock()
        firstD = defer.Deferred()
        deferreds = [firstD, defer.succeed(2.0)]
        func = mock.Mock(wraps=lambda: deferreds.pop(0))
        loop = AdaptiveLoopingCall(clock, func)
        startD = loop.start()

        # Now the loop is waiting on firstD.
        self.assertEqual([], clock.getDelayedCalls())
        self.assertEqual([mock.call()], func.mock_calls)

        loop.poke()

        # Still waiting on firstD.
        self.assertEqual([], clock.getDelayedCalls())
        self.assertEqual([mock.call()], func.mock_calls)

        firstD.callback(1.0)

        # Now the function has been called twice, though no clock time has
        # elapsed.
        self.assertEqual([
            mock.call(),  # Invocation on start().
            mock.call(),  # Invocation on poke().
        ], func.mock_calls)
        [call] = clock.getDelayedCalls()
        self.assertEqual(2.0, call.getTime())
        self.assertNoResult(startD)  # No internal failures.
