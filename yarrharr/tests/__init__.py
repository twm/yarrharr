# Copyright 2013 Tom Most <twm@freecog.net>

import os
from unittest import TestLoader, TestSuite


def suite():
    """
    Hook called by Django's ``manage.py test`` to get the test suite.
    Automatically introspects all of the tests in the package.
    """
    package_dir = os.path.dirname(__file__)
    return TestSuite(TestLoader().discover(package_dir, pattern='*.py'))
