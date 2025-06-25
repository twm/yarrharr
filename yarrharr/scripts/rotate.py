# Copyright © 2025 Tom Most <twm@freecog.net>
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

import argparse
import sys
from datetime import UTC, datetime, timedelta

from yarrharr.conf import Conf, SecretKey, dump_secret_keys, find_conf_file, load_secret_keys


def main(argv=sys.argv[1:]):
    parser = argparse.ArgumentParser(description="Yarrharr secret rotation utility")
    args = parser.parse_args()
    args

    now = datetime.now(UTC)
    doa_at = now - timedelta(days=60)
    fresh_at = now - timedelta(days=30)

    conf = Conf.from_file(find_conf_file())
    keys = [sk for sk in load_secret_keys(conf.secret_key_store) if sk.created_at >= doa_at]

    if not any(sk.created_at >= fresh_at for sk in keys):
        keys.append(SecretKey.cut())

    dump_secret_keys(conf.secret_key_store, keys)
