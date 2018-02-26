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

import os
import sys
import argparse
import pprint

from twisted.internet import defer, task


@defer.inlineCallbacks
def _txmain(reactor, url):
    from yarrharr.fetch import poll_feed, MaybeUpdated
    from yarrharr.tests.test_fetch import FetchFeed

    f = FetchFeed(url=url)
    result = yield poll_feed(f)
    pprint.pprint(result)
    if isinstance(result, MaybeUpdated):
        pprint.pprint(result.articles)


def main(argv=sys.argv[1:]):
    parser = argparse.ArgumentParser(description='Yarrharr fetch debug utility')
    parser.add_argument('url')
    args = parser.parse_args()

    os.environ['DJANGO_SETTINGS_MODULE'] = 'yarrharr.settings'
    import yarrharr.application
    yarrharr.application

    # TODO config logging
    task.react(_txmain, [args.url])
