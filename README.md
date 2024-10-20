# Yarrharr

Yarrharr is a simple web-based feed reader intended for self-hosting.

## Project Status

This is a personal passion project and learning tool.
I’m not looking for collaborators.

It’s implemented as a [Django](https://www.djangoproject.com/) app served via [Twisted](https://twisted.org/).
The frontend is mostly static HTML with a few web components for in-page interactivity.

Yarrharr isn’t ready for you to use it, and probably won't be any time soon.
The [1.0 milestone](https://github.com/twm/yarrharr/milestone/1) tracks whether the project is ready for general use.

## Development

Yarrharr is a Python application, but also a modern web app, so its dependencies are numerous.
The following steps work on Ubuntu 20.04; some modification may be necessary for Debian.

The [conventions document](./conventions.md) describes some idioms used in the codebase.

### Get the Source and Dependencies

Grab the build dependencies with:

    $ sudo apt install brotli inkscape icoutils git scour optipng \
                       python3-dev build-essential

[Install pip](https://pip.pypa.io/en/latest/installing/#get-pip), then install [Tox](http://tox.readthedocs.org/en/latest/).
(I actually recommend installing this in your home directory, but that's outside the scope of this document.)

[Install Just](https://just.systems/man/en/), probaby via Cargo.

Check out the repository:

    $ git checkout https://github.com/twm/yarrharr.git
    $ cd yarrharr

### Running the Django Development Server

Run the Django development server via Tox with:

    $ just devserver

The Django dev server is running at [http://127.0.0.1:8888/](http://127.0.0.1:8888/).

If you make changes to the Django models you can generate migrations by running `django-admin` under Tox::

    $ tox -e run -- django-admin makemigrations
    $ git add yarrharr/migrations/*.py

If you wish to check feeds for updates:

    $ just poll-feeds

By default, polling for feeds will only poll feeds that have been scheduled to be checked.
To schedule an immediate check of all feeds:

    $ just force-poll

## Running the `yarrharr` Executable

To run the `yarrharr` Twisted executable in a development, stop the Django dev server and run:

    $ just realserver

Yarrharr is running at [http://127.0.0.1:8888/](http://127.0.0.1:8888/).

## Releasing Yarrharr

 1. Bump the version number in ``yarrharr/__init__.py``.
 2. Build and tag the release: ``just release``

## License

Copyright © 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024 Tom Most

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
