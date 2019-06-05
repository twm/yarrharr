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

"""
Django signals
"""

from django.dispatch import Signal

schedule_changed = Signal()
"""
The `schedule_changed` signal is sent when feeds have been modified in the
database such that the polling schedule may be affected. This includes:

* A feed is created
* A feed is updated (the `Feed.next_check` field changes)
* Feed(s) are deleted

After these events it may be necessary to poll immediately, or to sleep longer.
As the process is already awake and the filesystem cache hot, this is an ideal
time to make that scheduling decision.

This signal must be emitted *after* the transaction which updates the database
has committed to ensure that the schedule changes are visible to the polling
routine.

The sender of this signal is always ``None``.
"""
