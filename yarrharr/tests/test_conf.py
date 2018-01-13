# -*- coding: utf-8 -*-
# Copyright © 2014–2018 Tom Most <twm@freecog.net>
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

import re
import unittest
from tempfile import NamedTemporaryFile

import mock
import pkg_resources
from six.moves.configparser import NoOptionError

from yarrharr.conf import (find_conf_files, read_yarrharr_conf,
                           NoConfError, UnreadableConfError)


class ConfTests(unittest.TestCase):
    maxDiff = None

    def test_no_conf(self):
        """
        A :env:`YARRHARR_CONF` pattern which doesn't match anything results in
        an exception.
        """
        with mock.patch('os.environ', {'YARRHARR_CONF': '/does-not-exist/*.ini'}):
            self.assertRaises(NoConfError, find_conf_files)

    def test_file_exists(self):
        """
        A file given in the environment variable is picked up on.
        """
        with NamedTemporaryFile() as f:
            with mock.patch('os.environ', {'YARRHARR_CONF': f.name}):
                self.assertEqual([f.name], find_conf_files())

    def test_unreadable(self):
        """
        If a conf file doesn't exist an exception results.
        """
        fn = '/foo/bar/does-not-exist'
        self.assertRaisesRegexp(UnreadableConfError, re.escape(fn),
                                read_yarrharr_conf, [fn], {})

    def test_read_defaults(self):
        """
        The defaults are not sufficient.  At least ``secret_key`` must be
        defined.
        """
        # Since at least one file is required, use an empty temp file.
        with NamedTemporaryFile() as f:
            self.assertRaisesRegexp(NoOptionError, r'secret_key',
                                    read_yarrharr_conf, [f.name], {})

    def test_read_minimal(self):
        """
        Once ``secret_key`` is defined, the read succeeds and gives settings
        appropriate for the app installed globally on a Debian system.
        """
        # This will fail in Windows.  I'm okay with that for now.
        with NamedTemporaryFile() as f:
            f.write(b"[secrets]\nsecret_key = sarlona\n")
            f.seek(0)

            settings = {}
            read_yarrharr_conf([f.name], settings)

        self.assertEqual(settings, {
            'DEBUG': False,
            'DATABASES': {
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': '/var/lib/yarrharr/db.sqlite',
                    'USER': '',
                    'PASSWORD': '',
                    'HOST': '',
                    'PORT': '',
                },
            },
            'ALLOWED_HOSTS': ['127.0.0.1'],
            'SERVER_ENDPOINT': 'tcp:8888:interface=127.0.0.1',
            'ROOT_URLCONF': 'yarrharr.urls',
            'LOGIN_URL': 'login',
            'LOGIN_REDIRECT_URL': 'home',
            'LOGOUT_URL': 'logout',
            'LANGUAGE_CODE': 'en-us',
            'USE_I18N': True,
            'USE_L10N': True,
            'USE_TZ': True,
            'TIME_ZONE': 'UTC',
            'STATIC_ROOT': '/var/lib/yarrharr/static/',
            'STATIC_URL': '/static/',
            'STATICFILES_FINDERS': (
                'django.contrib.staticfiles.finders.AppDirectoriesFinder',),
            'TEMPLATES': [{
                'APP_DIRS': True,
                'BACKEND': 'django.template.backends.django.DjangoTemplates',
                'DIRS': [],
                'OPTIONS': {
                    'context_processors': [
                        'django.contrib.auth.context_processors.auth',
                        'django.contrib.messages.context_processors.messages',
                    ],
                },
            }],
            'SECRET_KEY': 'sarlona',
            'X_FRAME_OPTIONS': 'DENY',
            'MIDDLEWARE': (
                'django.middleware.common.CommonMiddleware',
                'django.contrib.sessions.middleware.SessionMiddleware',
                'django.middleware.csrf.CsrfViewMiddleware',
                'django.contrib.auth.middleware.AuthenticationMiddleware',
                'django.contrib.messages.middleware.MessageMiddleware',
                'django.middleware.clickjacking.XFrameOptionsMiddleware',
            ),
            'WSGI_APPLICATION': 'yarrharr.wsgi.application',
            'INSTALLED_APPS': (
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.messages',
                'django.contrib.staticfiles',
                'yarrharr',
            ),
            'LOGGING_CONFIG': None,
        })

    def test_read_test_config(self):
        """
        Once ``secret_key`` is defined, the read succeeds and gives settings
        appropriate for the app installed globally on a Debian system.
        """
        f = pkg_resources.resource_stream('yarrharr.tests', 'test_config.ini')
        settings = {}
        try:
            read_yarrharr_conf([f.name], settings)
        finally:
            f.close()

        self.assertEqual(settings, {
            'DEBUG': True,
            'DATABASES': {
                'default': {
                    'ENGINE': 'django.db.backends.sqlite3',
                    'NAME': 'testdb.sqlite',
                    'USER': '',
                    'PASSWORD': '',
                    'HOST': '',
                    'PORT': '',
                },
            },
            'ALLOWED_HOSTS': ['127.0.0.1'],
            'INTERNAL_IPS': ['127.0.0.1'],
            'SERVER_ENDPOINT': 'tcp:8888:interface=127.0.0.1',
            'ROOT_URLCONF': 'yarrharr.urls',
            'LOGIN_URL': 'login',
            'LOGIN_REDIRECT_URL': 'home',
            'LOGOUT_URL': 'logout',
            'LANGUAGE_CODE': 'en-us',
            'USE_I18N': True,
            'USE_L10N': True,
            'USE_TZ': True,
            'TIME_ZONE': 'UTC',
            'STATIC_ROOT': 'static/',
            'STATIC_URL': '/static/',
            'STATICFILES_FINDERS': (
                'django.contrib.staticfiles.finders.AppDirectoriesFinder',),
            'TEMPLATES': [{
                'APP_DIRS': True,
                'BACKEND': 'django.template.backends.django.DjangoTemplates',
                'DIRS': [],
                'OPTIONS': {
                    'context_processors': [
                        'django.contrib.auth.context_processors.auth',
                        'django.template.context_processors.debug',
                        'django.contrib.messages.context_processors.messages',
                    ],
                },
            }],
            'SECRET_KEY': 'supersekrit',
            'X_FRAME_OPTIONS': 'DENY',
            'MIDDLEWARE': (
                'django.middleware.common.CommonMiddleware',
                'django.contrib.sessions.middleware.SessionMiddleware',
                'django.middleware.csrf.CsrfViewMiddleware',
                'django.contrib.auth.middleware.AuthenticationMiddleware',
                'django.contrib.messages.middleware.MessageMiddleware',
                'django.middleware.clickjacking.XFrameOptionsMiddleware',
            ),
            'WSGI_APPLICATION': 'yarrharr.wsgi.application',
            'INSTALLED_APPS': (
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.messages',
                'django.contrib.staticfiles',
                'yarrharr',
            ),
            'LOGGING_CONFIG': None,
        })
