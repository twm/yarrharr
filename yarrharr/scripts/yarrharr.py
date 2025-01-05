# Copyright © 2013, 2014, 2017, 2020 Tom Most <twm@freecog.net>
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
import os
import sys

import yarrharr


def main(argv=sys.argv[1:]):
    parser = argparse.ArgumentParser(description="Yarrharr feed reader")
    parser.add_argument("--version", action="version", version=yarrharr.__version__)
    parser.parse_args(argv)

    os.environ["DJANGO_SETTINGS_MODULE"] = "yarrharr.settings"
    from yarrharr.application import run

    run()
