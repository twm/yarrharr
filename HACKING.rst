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

Get the Source and Dependencies
-------------------------------

Grab the build dependencies with::

  $ sudo apt-get install inkscape icoutils git python-scour optipng \
                         python-dev build-essential

Install `install pip`_, then install `Tox`_.
(I actually recommend installing this in your home directory, but that's outside the scope of this document.)

.. _install pip: https://pip.pypa.io/en/latest/installing/#get-pip
.. _tox: http://tox.readthedocs.org/en/latest/

Install `nvm`_.

.. _nvm: https://github.com/creationix/nvm

Check out the repository and the git submodules::

  $ git checkout https://github.com/twm/yarrharr.git
  $ cd yarrharr
  $ git submodule update --init

Next install the frontend build tools::

  $ nvm use
  $ npm install

This will take a minute to produce a ``node_modules`` directory with gobs of JavaScript in it.

Running the Django Development Server
-------------------------------------

When doing development you must run separate server processes for the Django backend and the Webpack frontend.

Run the Django development server via `Tox`_ with::

  $ make devserver

In another terminal, run the `Webpack`_ build process with::

  $ make webpack

.. _webpack: http://webpack.github.io/

Feed checks are not done automatically in this mode, but must be triggered
manually::

  $ make check-feeds

Releasing Yarrharr
------------------

Yarharr's web assets need to be processed into a production-ready state before
the Python source package is generated so that the Python package can be
installed from PyPI without all of the build dependencies.  You can build the
static assets with the ``static-assets`` make target::

  $ make static-assets

The build products are placed in ``yarrharr/static``.  Once they have been
generated the source distribution can be built in the usual Python way::

  $ python setup.py sdist

Or use the ``make release`` target.

Releases
--------

 1. Bump the version number in ``setup.py`` per `semantic versioning`_.
 2. Tag the release: ``git tag "v$(python setup.py --version)"``
 3. Type ``make release`` to output a tarball to the ``dist`` directory.

.. _semantic versioning: http://semver.org/
