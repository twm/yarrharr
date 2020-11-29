# -*- coding: utf-8 -*-
# Copyright © 2014–2019 Tom Most <twm@freecog.net>
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
from configparser import NoOptionError
from importlib import resources
from tempfile import NamedTemporaryFile
from unittest import mock

from yarrharr.conf import (
    NoConfError,
    UnreadableConfError,
    find_conf_files,
    read_yarrharr_conf,
)


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
        self.assertRaisesRegex(UnreadableConfError, re.escape(fn),
                               read_yarrharr_conf, [fn], {})

    def test_read_defaults(self):
        """
        The defaults are not sufficient.  At least ``secret_key`` must be
        defined.
        """
        # Since at least one file is required, use an empty temp file.
        with NamedTemporaryFile() as f:
            self.assertRaisesRegex(NoOptionError, r'secret_key',
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
            'ATOMIC_REQUESTS': True,
            'DEBUG': False,
            'HOT': False,
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
            'USE_X_FORWARDED_HOST': False,
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
                        'yarrharr.context_processors.hot',
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
                'django.middleware.clickjacking.XFrameOptionsMiddleware',
            ),
            'SESSION_ENGINE': 'django.contrib.sessions.backends.signed_cookies',
            'SESSION_COOKIE_HTTPONLY': True,
            'SESSION_COOKIE_SECURE': False,
            'CSRF_TOKEN_SECURE': False,
            'WSGI_APPLICATION': 'yarrharr.wsgi.application',
            'INSTALLED_APPS': (
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.staticfiles',
                'yarrharr',
            ),
            'LOGGING_CONFIG': None,
        })

    def test_read_dev_config(self):
        """
        The development config decodes as expected.
        """
        settings = {}
        with resources.path('yarrharr.tests', 'dev.ini') as path:
            read_yarrharr_conf([str(path)], settings)

        self.assertEqual(settings, {
            'ATOMIC_REQUESTS': True,
            'DEBUG': True,
            'HOT': False,
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
            'USE_X_FORWARDED_HOST': False,
            'TIME_ZONE': 'UTC',
            'STATIC_ROOT': 'yarrharr/static/',
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
                        'yarrharr.context_processors.hot',
                        'django.template.context_processors.debug',
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
                'django.middleware.clickjacking.XFrameOptionsMiddleware',
            ),
            'SESSION_ENGINE': 'django.contrib.sessions.backends.signed_cookies',
            'SESSION_COOKIE_HTTPONLY': True,
            'SESSION_COOKIE_SECURE': False,
            'CSRF_TOKEN_SECURE': False,
            'WSGI_APPLICATION': 'yarrharr.wsgi.application',
            'INSTALLED_APPS': (
                'django.contrib.auth',
                'django.contrib.contenttypes',
                'django.contrib.sessions',
                'django.contrib.staticfiles',
                'yarrharr',
            ),
            'LOGGING_CONFIG': None,
        })

    def test_read_prod_proxy_config(self):
        """
        A configuration suitable for deployment behind a reverse proxy sets:

          * ``external_url`` to the reverse proxy's external URL.
          * ``proxied = x-forwarded`` to accept forwarded headers from the
            proxy.
        """
        with NamedTemporaryFile() as f:
            f.write(
                b'[yarrharr]\n'
                b'external_url = https://f.q.d.n\n'
                b'server_endpoint = tcp:8182:interface=127.0.0.1\n'
                b'proxied = x-forwarded\n'
                b'[secrets]\n'
                b'secret_key = sarlona\n',
            )
            f.flush()

            settings = {}
            read_yarrharr_conf([f.name], settings)

        self.assertEqual(['f.q.d.n'], settings['ALLOWED_HOSTS'])
        self.assertEqual('tcp:8182:interface=127.0.0.1', settings['SERVER_ENDPOINT'])
        self.assertTrue(settings['USE_X_FORWARDED_HOST'])
        self.assertTrue(settings['SESSION_COOKIE_SECURE'])
        self.assertTrue(settings['CSRF_TOKEN_SECURE'])
