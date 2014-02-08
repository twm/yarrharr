===================
Hacking on Yarrharr
===================

You want to help?  Awesome!  I accept pull requests on `GitHub`_.

.. _GitHub: https://github.com/twm/yarrharr

Project Goals
=============

``Straightforward, friendly web-based user interface``
    Styling should be familiar rather than exotic—a button should look like
    a button.  Chrome should be kept to a minimum to emphasize content, as is
    appropriate for a feed reader, however this should not be done at the
    expense of discoverability.
``Easy to install and maintain``
    A moderately-technical user should be able to install and start using the
    software with minimal configuration (such as creating users, but not
    including database initialization).

Non-Goals
=========

``Social nonsense``
    No "friends", no "following", no suggestions of what you might "like".
``High scalability``
    Intended for personal or family use; maximum number of users is expected to
    be 10 to 20, and number of unique feeds in the thousands.
``Old IE``
    No, just no.

Development
===========

Create a new `virtualenv`_ and use PIP install editable versions of django-yarr
and Yarrharr::

  $ virtualenv ~/yarrharr-dev
  $ cd ~/yarrharr-dev
  $ . bin/activate
  $ pip install -e 'git+https://github.com/radiac/django-yarr.git#egg=django-yarr'
  $ pip install -e 'git+https://github.com/twm/yarrharr.git#egg=yarrharr'

Install additional development dependencies, submodules, and build tools::

  $ cd src/yarrharr
  $ pip install -r requirements-dev.txt
  $ git submodule update --init

On Ubuntu 12.04, install all the build dependencies with::

  $ sudo apt-get install inkscape icoutils python-scour optipng nodejs npm \
                         python-dev build-essential

Install `lessc`_ via `npm`_::

  $ npm install

Then build the static assets::

  $ make static-assets

.. _lessc: http://lesscss.org/
.. _virtualenv: http://www.virtualenv.org/en/latest/
.. _npm: https://npmjs.org/

Running Tests
-------------

.. ::

  $ make test

Dependency Policy
-----------------

Because Yarrharr is intended as an end-user application, it has a more complex
build process than the typical Python package.  For ease of installation, the
Python distribution must be kept ``pip``-installable, and all the heavy
dependencies pushed to the build stage (``python setup.py sdist``).

Normally the sdist step is as simple as scraping all of the ``.py`` files out
of a repository checkout but a web application includes a number of assets
which `setuptools`_ doesn't know how to deal with:

 * CSS — compiled from `LESS`_ sources, combined, and minified
 * JavaScript — combined and minified
 * Images — rasterized from SVG sources, crushed

To make it easy to get started, keep Node.js build dependencies compatible with
the version shipped with the current Ubuntu LTS release, currently 0.6.x on
Ubuntu 12.04.  Unfortunately the Node.js and npm folks make this pretty
difficult, but things should get better in Ubuntu 14.04.

.. _setuptools: https://pythonhosted.org/setuptools/
.. _LESS: http://lesscss.org/

Releases
--------

 1. Bump the version number in ``setup.py`` per `semantic versioning`_.
 2. Tag the release: ``git tag "v$(python setup.py --version)"``
 3. Type ``make release`` to output a tarball to the ``dist`` directory.

.. _semantic versioning: http://semver.org/
