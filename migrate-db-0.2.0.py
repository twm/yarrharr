#!/usr/bin/env python3
"""
Translate a pre-0.2.0 Yarrharr database dump so that it can be loaded in
Yarrharr 0.2.0.

To use this script dump the Yarrharr 0.1.0a0 database to a JSON file using
Yarrharr 0.1.0a0::

    # Prerequisite: Copy /var/lib/yarrharr/db.sqlite to testdb.sqlite in
    # this git checkout.
    git checkout f15d9f013efb5904008f1ca4402bedc826deda89
    tox -e run --recreate -- true
    export DJANGO_SETTINGS_MODULE=yarrharr.settings
    export YARRHARR_CONF=yarrharr/tests/test_config.ini
    .tox/run/bin/django-admin.py dumpdata --format=json > yarrharr1.json

Then process it with this script::

    git checkout v0.2.0
    ./migrate-db-0.2.0.py < yarrharr1.json > yarrharr2.json

This will strip everything from the dump except users, feeds, and entries (now
called articles) and message the data so that it will import cleanly.

.. note::

    This process has only been tested with databases which contain a single
    user of ID 1. It is unknown whether the process will work with additional
    users.

Now create a *fresh* Yarrharr 0.2.0 database and import the dump::

    rm testdb.sqlite
    tox -e run --recreate -- django-admin.py migrate
    tox -e run -- django-admin.py loaddata yarrharr2.json

You can now upgrade to Yarrharr 0.2.0. Copy testdb.sqlite to
/var/lib/yarrharr/db.sqlite before starting the service the first time.
"""

import datetime
import json
import sys


NOW = datetime.datetime.utcnow().isoformat()


def utc(date):
    if date:
        return date + 'Z'
    return date


def main():
    sys.stdout.write("[")
    first = True
    for model in json.loads(sys.stdin.read()):
        if model["model"] == "yarr.feed":
            model = convert_feed(model)
        elif model["model"] == "yarr.entry":
            model = convert_article(model)
        elif model["model"] not in ('yarrharr.label', 'auth.user'):
            continue

        if first:
            first = False
        else:
            sys.stdout.write(",\n")

        sys.stdout.write(json.dumps(model))
    sys.stdout.write("]\n")


# {
#   "pk": 11,
#   "model": "yarr.feed",
#   "fields": {
#     "count_unread": 0,
#     "count_saved": 0,
#     "added": "2013-07-08T04:29:19.182",
#     "check_frequency": null,
#     "count_total": 29,
#     "feed_url": "http://feeds.feedburner.com/GustavoDuarte",
#     "title": "Gustavo Duarte",
#     "text": "",
#     "is_active": true,
#     "site_url": "http://duartes.org/gustavo/blog/",
#     "next_check": "2016-11-08T02:39:53.359",
#     "user": 1,
#     "last_checked": "2016-11-07T02:39:53.359",
#     "error": "",
#     "last_updated": "2016-06-21T17:35:56"
#   }
# },

def convert_feed(o):
    f = o['fields']
    return {
        'pk': o['pk'],
        'model': 'yarrharr.feed',
        'fields': {
            'user': f['user'],
            'feed_title': f['title'],
            'user_title': f['text'],
            'added': utc(f['added']),
            'url': f['feed_url'],
            'site_url': f['site_url'],
            'last_checked': utc(f['last_checked']),  # may be null
            'next_check': utc(f['next_check'] or NOW) if f['is_active'] else None,  # may be null in yarr
            'last_updated': utc(f['last_updated']),  # may be null
            'etag': '',
            'last_modified': '',
            'digest': '',
            'error': f['error'],
        },
    }


# {
#   "pk": 1,
#   "model": "yarr.entry",
#   "fields": {
#     "feed": 53,
#     "author": "Sean (noreply@blogger.com)",
#     "title": "Gary Numan: Musician, Buildmaster",
#     "url": "http://www.dashdashverbose.com/2010/09/gary-numan-musician-buildmaster.html",
#     "expires": null,
#     "comments_url": "",
#     "content": "...",
#     "state": 1,
#     "date": "2010-09-28T21:24:19",
#     "guid": "tag:blogger.com,1999:blog-3462658744634470242.post-8557971091751152027"
#   }
# },
def convert_article(o):
    f = o['fields']
    state = f['state']
    if state == 0:
        read = False
        fave = False
    elif state == 1:
        read = True
        fave = False
    else:
        read = True
        fave = True

    return {
        'pk': o['pk'],
        'model': 'yarrharr.article',
        'fields': {
            'feed': f['feed'],
            'author': f['author'],
            'title': f['title'],
            'url': f['url'],
            'date': utc(f['date']),
            'guid': f['guid'],
            'raw_content': f['content'],
            'content': f['content'],
            'read': read,
            'fave': fave,
        },
    }


if __name__ == '__main__':
    main()
