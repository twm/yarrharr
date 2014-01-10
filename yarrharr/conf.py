# Copyright 2013 Tom Most <twm@freecog.net>

"""
Yarrharr configuration defaults and parsing
"""

from urlparse import urlparse
from cStringIO import StringIO
from ConfigParser import RawConfigParser


DEFAULT_CONF = """\
[yarrharr]
debug = no
; Per twisted.internet.endpoints.serverFromString
server_endpoint = tcp:8888:interface=localhost
; Must be kept in sync with server_endpoint, or may vary if proxying is in
; effect.
external_url = http://localhost:8888
static_root = /var/lib/yarrharr/static/

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


def read_yarrharr_conf(files, namespace):
    """
    Read the given configuration files, mutating the given dictionary to produce
    """
    conf = RawConfigParser()
    conf.readfp(StringIO(DEFAULT_CONF), '<defaults>')
    conf.read(files)

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
    namespace['LOGIN_REDIRECT_URL'] = '/yarr/'
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
    namespace['STATIC_URL'] = '/static/'
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
    namespace['YARR_ITEM_EXPIRY'] = 365

    return conf
