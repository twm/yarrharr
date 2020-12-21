# Copyright © 2018, 2020 Tom Most <twm@freecog.net>
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

CREATE_TRIGGERS = [
    """
    CREATE TRIGGER IF NOT EXISTS feed_all_count_insert
    AFTER INSERT ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET
            all_count = all_count + 1,
            unread_count = unread_count + (NOT NEW.read),
            fave_count = fave_count + NEW.fave
        WHERE yarrharr_feed.id = NEW.feed_id;
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS feed_all_count_delete
    AFTER DELETE ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET
            all_count = all_count - 1,
            unread_count = unread_count - (NOT OLD.read),
            fave_count = fave_count - OLD.fave
        WHERE yarrharr_feed.id = OLD.feed_id;
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS feed_update_unread_count
    AFTER UPDATE OF read ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET unread_count = unread_count - (NEW.read - OLD.read)
        WHERE yarrharr_feed.id = OLD.feed_id;
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS feed_update_fave_count
    AFTER UPDATE OF fave ON yarrharr_article FOR EACH ROW
    BEGIN
        UPDATE yarrharr_feed SET fave_count = fave_count + (NEW.fave - OLD.fave)
        WHERE yarrharr_feed.id = OLD.feed_id;
    END
    """,
]


# These statements include "IF EXISTS" because these triggers _don't_ exist in
# test when running tests, since tests use the
# 0001_squashed_0012_feed_count_constraint migration where they are elided.
DROP_TRIGGERS = [
    """DROP TRIGGER IF EXISTS feed_all_count_insert""",
    """DROP TRIGGER IF EXISTS feed_all_count_delete""",
    """DROP TRIGGER IF EXISTS feed_update_unread_count""",
    """DROP TRIGGER IF EXISTS feed_update_fave_count""",
]
