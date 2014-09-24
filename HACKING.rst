===================
Hacking on Yarrharr
===================

You want to help?  Awesome!  I accept pull requests on `GitHub`_.

.. _GitHub: https://github.com/twm/yarrharr

Project Goals
=============

Straightforward, friendly web-based user interface
    Styling should be familiar rather than exotic—a button should look like
    a button.  Chrome should be kept to a minimum to emphasize content, as is
    appropriate for a feed reader, however this should not be done at the
    expense of discoverability.
Easy to install and maintain
    A moderately-technical user should be able to install and start using the
    software with minimal configuration (such as creating users, but not
    including database initialization).

Non-Goals
=========

Social nonsense
    No "friends", no "following", no suggestions of what you might "like".
High scalability
    Intended for personal or family use; maximum number of users is expected to
    be 10 to 20, and number of unique feeds in the thousands.
Old IE
    No, just no.

Development
===========

Yarrharr is a Python application, but also a modern web app, so its
dependencies are substantial.  The following steps are known to work on Ubuntu
14.04; slight modification may be necessary for Debian.

Gett the Source and Dependencies
--------------------------------

Grab the build dependencies with::

  $ sudo apt-get install inkscape icoutils git python-scour optipng \
                         nodejs npm python-dev build-essential python-tox

Check out the repository and the git submodules::

  $ git checkout https://github.com/twm/yarrharr.git
  $ cd yarrharr
  $ git submodule update --init

Next install ``lessc``, which used to build the CSS::

  $ npm install

.. note::

    If ``npm install`` fails with an SSL error you'll need to either install
    more recent versions of Node.js and npm, or disable SSL cert verification
    with ``npm config set strict-ssl false``.  The `npm folks changed the SSL
    certs`_.

.. _npm folks changed the ssl certs: http://blog.npmjs.org/post/71267056460/fastly-manta-loggly-and-couchdb-attachments

Building Yarrharr
-----------------

Yarharr's web assets are processed into a production-ready state before the
Python source package is generated so that the Python package can be installed
from PyPI without all of the build dependencies.  You can build the static
assets with the ``static-assets`` make target::

  $ make static-assets

The build products are placed in ``yarrharr/static``.

Releases
--------

 1. Bump the version number in ``setup.py`` per `semantic versioning`_.
 2. Tag the release: ``git tag "v$(python setup.py --version)"``
 3. Type ``make release`` to output a tarball to the ``dist`` directory.

.. _semantic versioning: http://semver.org/
