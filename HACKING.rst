===================
Hacking on Yarrharr
===================

You want to help?  Awesome!  I accept pull requests on `Github`_.

.. _Github: https://github.com/twm/yarrharr

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

I suggesting using ``virtualenv`` to manage Python dependencies.  Runtime
dependencies are limited to pure Python for portability, but the build-time
deps are pretty extensive.

``lessc``, installed via ``npm``, is used for building the CSS.  The goal is to
keep to the version used in the current Ubuntu LTS release, despite how
difficult the Node.js and npm folks make that.

Building Yarrharr
-----------------

Because Yarrharr is intended as an end-user application, it has a more complex
build process than the typical Python package.  Normally the ``python setup.py
sdist`` step is as simple as scraping all of the ``.py`` files out of
a repository checkout, along with some documentation, but a web application
includes a number of assets which `Distribute`_ doesn't know how to deal with:

 * CSS — compiled from `LESS`_ sources, combined, and minified
 * JavaScript — combined and minified
 * Images — rasterized from SVG sources, crushed

.. _Distribute: http://pythonhosted.org/distribute/
.. _LESS: http://lesscss.org/

As the software required to do all of this is pretty extensive, it's done
before the ``sdist`` stage so that Yarrharr can be installed via PIP without
non-Python dependencies.  All of the raw assets are stored in ``assets``, and
outputs go in ``yarrharr/static``.  The build system is a simple GNU makefile.

On Ubuntu 12.04, install all the dependencies with::

  $ sudo apt-get install inkscape icoutils python-scour optipng nodejs npm

Grab Node.js dependencies with this command in the package root::

  $ npm install

Then build the static assets::

  $ make static-assets

Releases
--------

 1. Bump the version number in ``setup.py`` per `semantic versioning`_.
 2. Tag the release: ``git tag "v$(python setup.py --version)"``
 3. Type ``make release`` to output a tarball to the ``dist`` directory.

.. _semantic versioning: http://semver.org/
