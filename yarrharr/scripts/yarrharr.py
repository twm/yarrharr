# Copyright 2013, 2014 Tom Most <twm@freecog.net>
# See COPYING for details.

from __future__ import absolute_import

import os
import sys
import argparse


def main(argv=sys.argv[1:]):
    parser = argparse.ArgumentParser(description='Yarrharr feed reader')
    parser.add_argument('--sigstop', action='store_true', default=False,
                        help='Send SIGSTOP to self on startup')
    args = parser.parse_args(argv)

    os.environ['DJANGO_SETTINGS_MODULE'] = 'yarrharr.settings'
    from yarrharr.application import run
    run(args.sigstop)
