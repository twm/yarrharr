# -*- coding: utf-8 -*-
# Copyright © 2013, 2014, 2015, 2016 Tom Most <twm@freecog.net>
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

"""
Yarrharr configuration defaults and parsing
"""

import os
import glob
from urlparse import urlparse
from cStringIO import StringIO
from ConfigParser import RawConfigParser


USER_CONF_GLOB = '/etc/yarrharr/*.ini'

DEFAULT_CONF = """\
[yarrharr]
debug = no
; Per twisted.internet.endpoints.serverFromString
server_endpoint = tcp:8888:interface=localhost
; Must be kept in sync with server_endpoint, or may vary if proxying is in
; effect.
external_url = http://localhost:8888
static_root = /var/lib/yarrharr/static/
; URL of the files at static_root.  Normally this should only be overridden in
; development mode.
static_url = /static/

[db]
engine = django.db.backends.sqlite3
name = /var/lib/yarrharr/db.sqlite
user =
password =
host =
port =

[secrets]
; The secret_key key must be present and non-empty.

[logging]
; Set any of these to empty to disable.
; HTTP access log, in standard format.
access = /var/log/yarrharr/access.log
; General server messages; startup, shutdown, errors, etc.
server = /var/log/yarrharr/server.log
; Feed update logging.
update = /var/log/yarrharr/update.log
"""


class NoConfError(Exception):
    """
    Raised when no configuration files are given.
    """


class UnreadableConfError(Exception):
    """
    Raised when parsing a configuration file fails, likely because it doesn't
    exist or is unreadable.
    """
    def __init__(self, files_unread):
        msg = 'Unable to read these config files:'
        msg += '\n    {0}'.format('\n    '.join(sorted(files_unread)))
        msg += '\nAre these files readable?'
        Exception.__init__(self, msg)


def find_conf_files():
    """
    Get a list of configuration files to be read.  The location to look in may
    be overridden by setting :env:`YARRHARR_CONF` to a glob pattern.

    :returns: a list of filenames
    :raises NoConfError: when no files match the pattern
    """
    pattern = os.environ.get('YARRHARR_CONF', USER_CONF_GLOB)
    files = glob.glob(pattern)
    if not files:
        msg = 'No files were found matching {}\n'.format(pattern)
        msg += 'Set YARRHARR_CONF to change this search location'
        raise NoConfError(msg)
    return files


def read_yarrharr_conf(files, namespace):
    """
    Read the given configuration files, mutating the given dictionary to
    contain Django settings.

    :raises UnreadableConfError:
        if any of the given files are not read
    """
    conf = RawConfigParser()
    conf.readfp(StringIO(DEFAULT_CONF), '<defaults>')
    files_read = conf.read(files)
    files_unread = set(files) - set(files_read)
    if files_unread:
        raise UnreadableConfError(files_unread)

    namespace['DEBUG'] = conf.getboolean('yarrharr', 'debug')
    namespace['TEMPLATE_DEBUG'] = namespace['DEBUG']

    namespace['DATABASES'] = {
        'default': {
            'ENGINE': conf.get('db', 'engine'),
            'NAME': conf.get('db', 'name'),
            'USER': conf.get('db', 'user'),
            'PASSWORD': conf.get('db', 'password'),
            'HOST': conf.get('db', 'host'),
            'PORT': conf.get('db', 'port'),
        }
    }

    external_url = urlparse(conf.get('yarrharr', 'external_url'))
    if external_url.path != '':
        # Ensure that the URL doesn't contain a path, as some day we will
        # probably want to add the ability to add a prefix to the path.
        msg = "external_url must not include path: remove {!r}".format(
            external_url.path)
        raise ValueError(msg)
    namespace['ALLOWED_HOSTS'] = [external_url.hostname]

    # Config for the Twisted production server.
    namespace['SERVER_ENDPOINT'] = conf.get('yarrharr', 'server_endpoint')

    namespace['ROOT_URLCONF'] = 'yarrharr.urls'
    namespace['LOGIN_URL'] = '/login/'
    namespace['LOGIN_REDIRECT_URL'] = '/'
    namespace['LOGOUT_URL'] = '/logout/'

    namespace['LANGUAGE_CODE'] = 'en-us'
    namespace['USE_I18N'] = True
    namespace['USE_L10N'] = True

    # This must be False, because django-yarr supports Django 1.3. :'(  We set
    # the timezone to UTC so that non-timezone-aware databases (i.e.
    # everything but PostgreSQL) will store UTC dates, which will magically be
    # correct when we set USE_TZ=True later.
    namespace['USE_TZ'] = False
    namespace['TIME_ZONE'] = 'UTC'

    namespace['STATIC_ROOT'] = conf.get('yarrharr', 'static_root')
    namespace['STATIC_URL'] = conf.get('yarrharr', 'static_url')
    namespace['STATICFILES_FINDERS'] = (
        'django.contrib.staticfiles.finders.AppDirectoriesFinder',)

    namespace['TEMPLATE_LOADERS'] = (
        'django.template.loaders.app_directories.Loader',)

    namespace['SECRET_KEY'] = conf.get('secrets', 'secret_key')
    namespace['X_FRAME_OPTIONS'] = 'DENY'

    namespace['MIDDLEWARE_CLASSES'] = (
        'django.middleware.common.CommonMiddleware',
        'django.contrib.sessions.middleware.SessionMiddleware',
        'django.middleware.csrf.CsrfViewMiddleware',
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',
        'django.middleware.clickjacking.XFrameOptionsMiddleware',
    )

    namespace['WSGI_APPLICATION'] = 'yarrharr.wsgi.application'

    namespace['INSTALLED_APPS'] = (
        'django.contrib.auth',
        'django.contrib.contenttypes',
        'django.contrib.sessions',
        'django.contrib.messages',  # Used by yarr.
        'django.contrib.staticfiles',
        'django.contrib.admin',  # For user admin.
        'south',
        'yarrharr',
        'yarr',
    )

    namespace['LOG_ACCESS'] = conf.get('logging', 'access') or None
    namespace['LOG_SERVER'] = conf.get('logging', 'server') or None
    namespace['LOG_UPDATE'] = conf.get('logging', 'update') or None
    # Disable Django's logging configuration stuff.
    namespace['LOGGING_CONFIG'] = None

    # Yarr stuff.
    namespace['YARR_LAYOUT_FIXED'] = False
    namespace['YARR_ITEM_EXPIRY'] = 365 * 5

    return conf
