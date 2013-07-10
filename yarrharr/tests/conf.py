# Copyright 2013 Tom Most <twm@freecog.net>

import unittest
from tempfile import NamedTemporaryFile
from ConfigParser import NoOptionError

from yarrharr.conf import read_yarrharr_conf


class ConfTests(unittest.TestCase):
    def test_read_defaults(self):
        """
        The defaults are not sufficient.  At least ``secret_key`` must be
        defined.
        """
        self.assertRaisesRegexp(NoOptionError, r'secret_key',
                                read_yarrharr_conf, [], {})

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
            'LOGGING_CONFIG': None,
            'YARR_LAYOUT_FIXED': False,
            'YARR_ITEM_EXPIRY': 60,
        })
