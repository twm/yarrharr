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
import logging

from treq.testing import StubTreq
from twisted.logger import Logger, LogPublisher, FileLogObserver
from twisted.python.log import LogPublisher as LegacyLogPublisher
from twisted.python.failure import Failure
from twisted.python.threadpool import ThreadPool
from twisted.test.proto_helpers import MemoryReactorClock
from twisted.trial.unittest import SynchronousTestCase

from ..application import Root
from ..application import TwistedLoggerLogHandler, formatForSystemd


class RootTests(SynchronousTestCase):
    def test_referrer_policy(self):
        """
        The ``Referrer-Policy: no-referrer`` header is injected into every response.
        """
        reactor = MemoryReactorClock()  # unused
        threadpool = ThreadPool(minthreads=0)  # unused
        self.addCleanup(threadpool.stop)
        treq = StubTreq(Root(reactor, threadpool))

        # This test runs against /static/ as it is a pure-Twisted codepath. Any
        # route handled by Django will try to run stuff in a threadpool, which
        # requires a real reactor (or at least a much more complete fake).
        # Someday the test suite may need to be run with Trial so that
        # twisted.trial.unittest.TestCase's real reactor works, but we'll avoid
        # that for now.
        d = treq.get('http://127.0.0.1:8888/static/')
        response = self.successResultOf(d)
        self.assertEqual(['no-referrer'], response.headers.getRawHeaders('Referrer-Policy'))


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
