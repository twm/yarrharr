# Yarrharr

[![Build Status](https://travis-ci.org/twm/yarrharr.svg?branch=master)](https://travis-ci.org/twm/yarrharr)

Yarrharr is a simple web-based feed reader intended for self-hosting.

## Project Status

This project is a personal passion project and learning tool.

* The user interface, which is written in <a href="https://reactjs.org/">React</a>, is prototype-quality, with many changes planned.
  “Prototype quality” means “is really ugly”, “changes frequently” and “has no tests”.
* The backend, [Django](https://www.djangoproject.com/) served via [Twisted](https://twistedmatrix.com/trac/) is in solid shape, though several functional improvements are planned.
  It has tests and does not change frequently.

Yarrharr isn’t ready for you to use it, and probably won't be anytime soon.
The [1.0 milestone](https://github.com/twm/yarrharr/milestone/1) tracks this.

## Development

Yarrharr is a Python application, but also a modern web app, so its dependencies are numerous.
The following steps work on Ubuntu 14.04 and 16.04; some modification may be necessary for Debian.

The [conventions document](./conventions.md) describes some idioms used in the codebase.

### Get the Source and Dependencies

Grab the build dependencies with:

    $ sudo apt-get install inkscape icoutils git python-scour optipng \
                           python-dev build-essential

Install [install pip](https://pip.pypa.io/en/latest/installing/#get-pip), then install [Tox](http://tox.readthedocs.org/en/latest/).
(I actually recommend installing this in your home directory, but that's outside the scope of this document.)

Install [nvm](https://github.com/creationix/nvm).

Check out the repository and the git submodules:

    $ git checkout https://github.com/twm/yarrharr.git
    $ cd yarrharr
    $ git submodule update --init

Next install the frontend build tools:

    $ nvm use
    $ npm install

This will take a minute to produce a ``node_modules`` directory with gobs of JavaScript in it.

### Running the Django Development Server

When doing development you must run separate server processes for the Django backend and the Webpack frontend.

Run the Django development server via Tox with:

    $ make devserver

In another terminal, run the [Webpack](http://webpack.github.io/) build process with:

    $ make webpack

If you make changes to the Django models you can generate migrations by running `django-admin` under Tox::

    $ tox -e run -- django-admin makemigrations
    $ git add yarrharr/migrations/*.py

If you wish to check feeds for updates:

    $ make poll-feeds

By default, polling for feeds will only poll feeds that have been scheduled to be checked.
To schedule an immediate check of all feeds:

    $ make force-poll

## Releasing Yarrharr

 1. Bump the version number in ``setup.py``.
 2. Tag the release: ``git tag "v$(python setup.py --version)"``
 3. Type ``nvm use`` to activate Node according to ``.nvmrc``.
 4. Type ``make release`` to output a tarball to the ``dist`` directory.

## License

Copyright © 2013, 2014, 2015, 2016, 2017, 2018 Tom Most

This program is free software; you can redistribute it and/or modify it under
the terms of the [GNU General Public License](./COPYING) as published by the Free Software
Foundation; either version 3 of the License, or (at your option) any later
version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with
this program; if not, see <http://www.gnu.org/licenses>.

Additional permission under GNU GPL version 3 section 7

If you modify this Program, or any covered work, by linking or combining it
with OpenSSL (or a modified version of that library), containing parts covered
by the terms of the OpenSSL License, the licensors of this Program grant you
additional permission to convey the resulting work.  Corresponding Source for a
non-source form of such a combination shall include the source code for the
parts of OpenSSL used as well as that of the covered work.
