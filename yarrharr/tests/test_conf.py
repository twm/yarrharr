# See COPYING for details.

import re
import unittest
from tempfile import NamedTemporaryFile
from ConfigParser import NoOptionError

import mock

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
            f.write("[secrets]\nsecret_key = sarlona\n")
            f.seek(0)

            settings = {}
            read_yarrharr_conf([f.name], settings)

        self.assertEqual(settings, {
            'DEBUG': False,
            'TEMPLATE_DEBUG': False,
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
            'ALLOWED_HOSTS': ['localhost'],
            'SERVER_ENDPOINT': 'tcp:8888:interface=localhost',
            'ROOT_URLCONF': 'yarrharr.urls',
            'LOGIN_URL': '/login/',
            'LOGIN_REDIRECT_URL': '/yarr/',
            'LOGOUT_URL': '/logout/',
            'LANGUAGE_CODE': 'en-us',
            'USE_I18N': True,
            'USE_L10N': True,
            'USE_TZ': False,
            'TIME_ZONE': 'UTC',
            'STATIC_ROOT': '/var/lib/yarrharr/static/',
            'STATIC_URL': '/static/',
            'STATICFILES_FINDERS': (
                'django.contrib.staticfiles.finders.AppDirectoriesFinder',),
            'TEMPLATE_LOADERS': (
                'django.template.loaders.app_directories.Loader',),
            'SECRET_KEY': 'sarlona',
            'X_FRAME_OPTIONS': 'DENY',
            'MIDDLEWARE_CLASSES': (
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
                'django.contrib.admin',
                'south',
                'yarrharr',
                'yarr',
            ),
            'LOG_ACCESS': '/var/log/yarrharr/access.log',
            'LOG_SERVER': '/var/log/yarrharr/server.log',
            'LOG_UPDATE': '/var/log/yarrharr/update.log',
            'LOGGING_CONFIG': None,
            'YARR_LAYOUT_FIXED': False,
            'YARR_ITEM_EXPIRY': 365,
        })
