# Copyright © 2013–2019, 2021, 2022, 2025 Tom Most <twm@freecog.net>
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

"""
Yarrharr configuration defaults and parsing
"""

import os
import sys
from configparser import RawConfigParser
from datetime import datetime
from io import StringIO
from urllib.parse import urlparse, urlunparse

import attrs
from cattrs.preconf.json import make_converter

DEFAULT_CONF = """\
[yarrharr]
debug = no
; Per twisted.internet.endpoints.serverFromString
server_endpoint = tcp:8888:interface=127.0.0.1
; Must be kept in sync with server_endpoint, or may vary if proxying is in
; effect.
external_url = http://127.0.0.1:8888
; Is Yarrharr deployed behind a reverse proxy such as Apache, nginx, or
; haproxy? Set to "x-forwarded" to respect the X-Forwarded-Host and
; X-Forwarded-Port headers.
proxied = no
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
secret_key_store = /var/lib/yarrharr/secret_keys.json
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
        msg = "Unable to read these config files:"
        msg += "\n    {0}".format("\n    ".join(sorted(files_unread)))
        msg += "\nAre these files readable?"
        Exception.__init__(self, msg)


def find_conf_file():
    """
    Get the path of the configuration file to be read. The path may
    be controlled by setting :env:`YARRHARR_CONF`.

    :returns: a filename
    :raises NoConfError: when no configuration file exists
    """
    path = os.environ.get("YARRHARR_CONF", "/etc/yarrharr/yarrharr.ini")
    if not os.path.isfile(path):
        raise NoConfError(f"No configuration file was found at {path}.Set YARRHARR_CONF to change this location.")
    return path


def read_yarrharr_conf(file, namespace):
    """
    Read the given configuration files, mutating the given dictionary to
    contain Django settings.

    :raises UnreadableConfError:
        if any of the given files are not read
    """
    conf = RawConfigParser()
    conf.read_file(StringIO(DEFAULT_CONF), "<defaults>")
    files_read = conf.read([file])
    files_unread = set([file]) - set(files_read)
    if files_unread:
        raise UnreadableConfError(files_unread)

    namespace["DEBUG"] = conf.getboolean("yarrharr", "debug")

    namespace["DATABASES"] = {
        "default": {
            "ENGINE": conf.get("db", "engine"),
            "NAME": conf.get("db", "name"),
            "USER": conf.get("db", "user"),
            "PASSWORD": conf.get("db", "password"),
            "HOST": conf.get("db", "host"),
            "PORT": conf.get("db", "port"),
        },
    }
    namespace["ATOMIC_REQUESTS"] = True
    namespace["DEFAULT_AUTO_FIELD"] = "django.db.models.AutoField"

    external_url = urlparse(conf.get("yarrharr", "external_url"))
    if external_url.path != "":
        # Ensure that the URL doesn't contain a path, as some day we will
        # probably want to add the ability to add a prefix to the path.
        msg = "external_url must not include path: remove {!r}".format(external_url.path)
        raise ValueError(msg)
    namespace["ALLOWED_HOSTS"] = [external_url.hostname]

    # The proxied config is an enumeration to ensure it can be extended to
    # support the Forwarded header (RFC 7239) in the future. We require expicit
    # configuration rather than auto-detecting these headers because the
    # frontend proxy *must* be configured to strip whatever header is in use,
    # lest clients be able to forge it.
    proxied = conf.get("yarrharr", "proxied")
    if proxied not in {"no", "x-forwarded"}:
        msg = "proxied must be 'no' or 'x-forwarded', not {!r}".format(proxied)
        raise ValueError(msg)
    namespace["USE_X_FORWARDED_HOST"] = proxied == "x-forwarded"

    # Config for the Twisted production server.
    namespace["SERVER_ENDPOINT"] = conf.get("yarrharr", "server_endpoint")

    namespace["ROOT_URLCONF"] = "yarrharr.urls"
    namespace["LOGIN_URL"] = "login"
    namespace["LOGIN_REDIRECT_URL"] = "home"
    namespace["LOGOUT_URL"] = "logout"

    namespace["LANGUAGE_CODE"] = "en-us"
    namespace["USE_I18N"] = True
    namespace["USE_TZ"] = True
    namespace["TIME_ZONE"] = "UTC"

    namespace["STATIC_ROOT"] = conf.get("yarrharr", "static_root")
    namespace["STATIC_URL"] = conf.get("yarrharr", "static_url")
    namespace["STATICFILES_FINDERS"] = ("django.contrib.staticfiles.finders.AppDirectoriesFinder",)

    # Template context processors. This list is missing most of the processors
    # in the default list as Yarrharr's templates don't use them.
    context_processors = [
        "django.contrib.auth.context_processors.auth",
        "yarrharr.context_processors.csp",
    ]
    if namespace["DEBUG"]:
        # When in debug mode, display SQL queries for requests coming from the
        # loopback interface.
        context_processors.append("django.template.context_processors.debug")
        namespace["INTERNAL_IPS"] = ["127.0.0.1"]

    namespace["TEMPLATES"] = [
        {
            "BACKEND": "django.template.backends.django.DjangoTemplates",
            "DIRS": [],
            "APP_DIRS": True,
            "OPTIONS": {"context_processors": context_processors},
        }
    ]

    secret_key_store = os.path.join(os.path.dirname(file), conf.get("secrets", "secret_key_store"))
    namespace["SECRET_KEY"], *namespace["SECRET_KEY_FALLBACKS"] = read_secret_keys(secret_key_store)
    namespace["X_FRAME_OPTIONS"] = "DENY"

    namespace["MIDDLEWARE"] = (
        "django.middleware.common.CommonMiddleware",
        "django.contrib.sessions.middleware.SessionMiddleware",
        "django.middleware.csrf.CsrfViewMiddleware",
        "django.contrib.auth.middleware.AuthenticationMiddleware",
        "django.middleware.clickjacking.XFrameOptionsMiddleware",
    )

    namespace["SESSION_ENGINE"] = "django.contrib.sessions.backends.signed_cookies"
    namespace["SESSION_COOKIE_HTTPONLY"] = True
    namespace["SESSION_COOKIE_SECURE"] = external_url.scheme == "https"
    namespace["CSRF_COOKIE_SECURE"] = external_url.scheme == "https"
    namespace["CSRF_TRUSTED_ORIGINS"] = [urlunparse(external_url[0:2] + ("", "", "", ""))]

    # Transitional setting as of Django 5.1; remove when updating to Django 6.0.
    namespace["FORMS_URLFIELD_ASSUME_HTTPS"] = True

    namespace["WSGI_APPLICATION"] = "yarrharr.wsgi.application"

    namespace["INSTALLED_APPS"] = (
        "django.contrib.auth",
        "django.contrib.contenttypes",
        "django.contrib.sessions",
        "django.contrib.staticfiles",
        "django.contrib.humanize",
        "yarrharr",
    )

    if "runserver" not in sys.argv:
        # Disable Django's logging configuration stuff (except when running under
        # the dev server).
        namespace["LOGGING_CONFIG"] = None
        namespace["YARRHARR_SCRIPT_NONCE"] = True
    else:
        # Under the dev server send the same headers as the real Twisted server.
        # See yarrharr.application.Root.
        namespace["SECURE_REFERRER_POLICY"] = "same-origin"
        namespace["SECURE_CROSS_ORIGIN_OPENER_POLICY"] = "same-origin"
        namespace["YARRHARR_SCRIPT_NONCE"] = False


@attrs.define
class _SecretKey:
    """A secret key and the date of its creation"""

    secret_key: str = attrs.field(repr=False)
    created_at: datetime


def load_secret_keys(path: str) -> list[_SecretKey]:
    converter = make_converter()
    with open(path, "r") as f:
        keys = converter.loads(f.read(), list[_SecretKey])
    keys.sort(key=lambda sk: sk.created_at, reverse=True)
    return keys


def read_secret_keys(path: str) -> list[str]:
    """
    Load a secret key store

    :param path: Path to the secret key file
    :returns: a list of secret keys, the most recent first
    """
    return [sk.secret_key for sk in load_secret_keys(path)]
