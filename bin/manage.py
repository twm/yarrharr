#!/usr/bin/env python

import os
import sys

os.environ['DJANGO_SETTINGS_MODULE'] = 'yarrharr.settings'

from django.core.management import execute_from_command_line

execute_from_command_line(sys.argv)
