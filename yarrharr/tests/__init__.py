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

from twisted.internet.interfaces import IReactorTime
from zope.interface import implementer


@implementer(IReactorTime)
class PoisonReactor(object):
    """
    A reactor which answers all requests with a `NotImplementedError`. It
    exists only to be importable as ``from twisted.internet import reactor`` to
    make it easier to find code which uses the global reactor.
    """

    # We must define callLater because the bound method is plucked off by
    # twisted.web.http.HTTPFActory.buildProtocol().
    def callLater(self, delay, callable, *args, **kw):
        raise NotImplementedError

    def seconds(self):
        raise NotImplementedError

    def getDelayedCalls(self):
        raise NotImplementedError


if os.environ.get("POISON_REACTOR"):
    from twisted.internet.main import installReactor

    installReactor(PoisonReactor())
