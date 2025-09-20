# Copyright © 2017, 2018, 2019, 2021, 2022, 2023, 2025 Tom Most <twm@freecog.net>
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

from contextlib import contextmanager
from datetime import datetime, timedelta
from unittest import mock
from unittest.mock import patch

import lxml.html
from django.contrib.auth.models import User
from django.http import HttpResponseNotFound, HttpResponseRedirect
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from ..enums import ArticleFilter
from ..models import Feed, Label
from ..signals import schedule_changed


class dictwith(object):
    """
    An object that compares equal to a dictionary which has a superset of the
    keys and values of the wrapped dictionary.
    """

    def __init__(self, wrapped):
        self._wrapped = wrapped

    def __eq__(self, other):
        if not isinstance(other, dict):
            return False
        for key, value in self._wrapped.items():
            if key not in other:
                return False
            if other[key] != value:
                return False
        return True

    def __repr__(self):
        return "+" + repr(self._wrapped)


@contextmanager
def signal_inbox(signal):
    """
    Context manager which collects Django signals in a list. Use like::

        with signal_inbox(some_signal) as inbox:
            ...  # Cause the signal to be sent.

        [[sender, kwargs]] = inbox

    There will be one item in the inbox list per signal dispatched.
    """
    inbox = []

    def receive(sender, **kwargs):
        inbox.append((sender, kwargs))

    signal.connect(receive)
    try:
        yield inbox
    finally:
        signal.disconnect(receive)


def expect_html(response, status_code=200):
    """
    Assert that a Django test client response is HTML

    :returns: `lxml.html` document
    """
    assert response.status_code == 200
    assert response["Content-Type"] == "text/html; charset=utf-8"
    return lxml.html.document_fromstring(response.content)


class LoginRedirectTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="james",
            email="james@mail.example",
            password="hunter2",
        )

    def test_login_redirect(self):
        """
        When redirecting post-login all of the paths handled by the SPA are
        valid.  See #122.
        """
        c = Client()
        nexts = [
            "/",
            "/all/fave",
            "/all/unread/1234",
            "/label/1234/unread",
            "/label/1234/fave/",
            "/label/1234/unread/1234",
            "/label/1234/all/1234/",
            "/feed/1/unread",
            "/feed/2/fave/",
            "/feed/3/all/4",
            "/feed/5/all/678/",
            "/labels/",
            "/labels/add",
            "/feeds/",
            "/feeds/add/",
            "/article/1234/",
        ]

        for next_ in nexts:
            with self.subTest("login", next=next_):
                response = c.post(
                    "/login/",
                    {
                        "next": next_,
                        "username": "james",
                        "password": "hunter2",
                    },
                )
                self.assertEqual(next_, response["Location"])


class LabelListTests(TestCase):
    """
    Test the ``label-list`` view
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="john",
            email="john@mail.example",
            password="sesame",
        )
        self.client = Client()
        self.client.force_login(self.user)

    maxDiff = None

    def test_get_sort(self):
        """
        Feeds are listed in order of name, case-insensitively
        """
        self.user.label_set.create(text="a", user=self.user)
        self.user.label_set.create(text=".C", user=self.user)
        self.user.label_set.create(text="B", user=self.user)

        page = expect_html(self.client.get(reverse("label-list")))
        [table] = page.cssselect(".label-list")
        self.assertEqual(
            ["a", "B", ".C"],
            [td.text_content() for td in table.cssselect("tbody > tr > td:nth-of-type(2)")],
        )


class FeedListTests(TestCase):
    """
    Test the ``feed-list`` view.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="john",
            email="john@mail.example",
            password="sesame",
        )
        self.client = Client()
        self.client.force_login(self.user)

    maxDiff = None

    def _add_feed(
        self,
        feed_title: str,
        url: str = "http://example.com/feed.xml",
        site_url: str = "http://example.com/",
        added: datetime | None = None,
        **kw: object,
    ) -> Feed:
        """
        Add a feed to the logged-in user's set.
        """
        if "next_check" not in kw:
            kw["next_check"] = timezone.now()
        self.user.feed_set.create(
            url=url,
            feed_title=feed_title,
            site_url=site_url,
            added=added or timezone.now(),
            **kw,
        )

    def _feed_list_titles(self, view: str) -> list[str]:
        """
        Get the feed titles displayed by the feed list page.

        :param view:
            See the *view* parameter of :func:`yarrharr.views.feed_list`

        :returns:
            The text of the ``.col-feed`` cell, normalized to a single space.
        """
        page = expect_html(self.client.get(reverse("feed-list", args=[view])))

        [tab] = page.cssselect(f"#view-{view}")
        self.assertEqual("true", tab.attrib["aria-selected"])

        [table] = page.cssselect(".feed-list")
        return [" ".join(td.text_content().strip().split()) for td in table.cssselect("td.col-feed")]

    def test_list_updated(self):
        """
        The "updated" view list the feeds in descending order of their
        most recent article.
        """
        self._add_feed("B", last_updated=datetime.fromisoformat("2002-01-01 00:00:00+00:00"))
        self._add_feed("A", last_updated=datetime.fromisoformat("2001-01-01 00:00:00+00:00"))
        self._add_feed("D", last_updated=datetime.fromisoformat("2004-01-01 00:00:00+00:00"))
        self._add_feed("C", last_updated=datetime.fromisoformat("2003-01-01 00:00:00+00:00"))
        self._add_feed("E", last_updated=None)  # No articles
        self._add_feed("Z", next_check=None)  # Archived, so not shown

        self.assertEqual(
            ["D", "C", "B", "A", "E"],
            self._feed_list_titles("updated"),
        )

    def test_list_az(self):
        """
        The "az" view lists feeds in order of name, case-insensitively.
        """
        self._add_feed("Feed C")
        self._add_feed("feed b")  # Case is ignored.
        self._add_feed("<-Feed a")  # Non-alphanumeric characters are disregarded.
        self._add_feed("Feed AAA", next_check=None)  # Archived, so not shown

        self.assertEqual(
            ["<-Feed a", "feed b", "Feed C"],
            self._feed_list_titles("az"),
        )

    def test_view_errors(self):
        """
        The "errors" view only shows feeds that have errors. It excludes
        feeds that are no longer polled.
        """
        self._add_feed("C", error="429", last_checked=datetime.fromisoformat("2010-01-01 00:00:00+00:00"))
        self._add_feed("B", error="")  # No error, not shown
        self._add_feed("A", error="404", last_checked=datetime.fromisoformat("2020-01-01 00:00:00+00:00"))
        self._add_feed("Z", next_check=None)  # Archived, so not shown

        self.assertEqual(
            ["A 404", "C 429"],
            self._feed_list_titles("errors"),
        )

    def test_view_archived(self):
        """
        The "archived" view only shows feeds that are no longer polled.
        """
        self._add_feed("A", next_check=None, last_checked=datetime.fromisoformat("2010-01-01 00:00:00+00:00"))
        self._add_feed("B", next_check=None, last_checked=datetime.fromisoformat("2011-01-01 00:00:00+00:00"))
        self._add_feed("Z")  # Not archived, so not shown

        self.assertEqual(
            ["B", "A"],
            self._feed_list_titles("archived"),
        )

    def test_view_other_404(self):
        """
        Any other view is a 404.
        """
        response = self.client.get(reverse("feed-list", args=["does-not-exist"]))
        self.assertIsInstance(response, HttpResponseNotFound)

    def test_list_redirect(self):
        """
        The old location of the feed list is a redirect to the updated view.
        """
        response = self.client.get("/feeds/")
        self.assertIsInstance(response, HttpResponseRedirect)
        self.assertEqual(response.url, reverse("feed-list", args=["updated"]))

    def test_create(self):
        url = "http://example.com/feed.xml"

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            response = self.client.post(
                "/api/inventory/",
                {
                    "action": "create-feed",
                    "url": url,
                },
            )

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertEqual(url, feed.url)
        self.assertEqual(url, feed.feed_title)
        self.assertIsNotNone(feed.added)
        self.assertIsNotNone(feed.next_check)  # scheduled for poll
        self.assertEqual(
            {
                "feedId": feed.id,
                "feedsById": {
                    str(feed.id): {
                        "id": feed.id,
                        "title": url,
                        "text": "",
                        "siteUrl": "",
                        "labels": [],
                        "unreadCount": 0,
                        "faveCount": 0,
                        "checked": None,
                        "changed": None,
                        "added": mock.ANY,
                        "error": "",
                        "active": True,
                        "url": url,
                    },
                },
                "feedOrder": [feed.id],
                "labelsById": {},
                "labelOrder": [],
            },
            response.json(),
        )
        self.assertEqual(1, len(schedule_changed_signals))

    def test_update_feed_title_and_url(self):
        """
        A feed's user title and feed URL are set by the update-feed action.
        """
        added = timezone.now() - timedelta(days=1)
        feed = self.user.feed_set.create(
            url="http://example.com/feedX.xml",
            feed_title="Feed X",
            site_url="http://example.com/",
            added=added,
        )
        url = "http://example.com/feedZ.xml"
        user_title = "Feed Z"

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            response = self.client.post(
                "/api/inventory/",
                {
                    "action": "update-feed",
                    "feed": feed.id,
                    "url": url,
                    "active": "on",
                    "title": user_title,
                },
            )

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertEqual(url, feed.url)
        self.assertEqual(user_title, feed.user_title)
        self.assertEqual(
            {
                "feedsById": {
                    str(feed.id): {
                        "id": feed.id,
                        "title": "Feed X",
                        "text": user_title,
                        "siteUrl": "http://example.com/",
                        "labels": [],
                        "unreadCount": 0,
                        "faveCount": 0,
                        "checked": None,
                        "changed": None,
                        "added": added.timestamp() * 1000,
                        "error": "",
                        "active": True,
                        "url": url,
                    },
                },
                "feedOrder": [feed.id],
                "labelsById": {},
                "labelOrder": [],
            },
            response.json(),
        )
        self.assertEqual(1, len(schedule_changed_signals))

    def test_remove_feed(self):
        """
        The remove action can delete a single feed.
        """
        feed = self.user.feed_set.create(
            url="http://example.com/feed2.xml",
            feed_title="Feed 2",
            added=timezone.now() - timedelta(days=1),
        )

        response = self.client.post(
            "/api/inventory/",
            {
                "action": "remove",
                "feed": feed.id,
            },
        )

        self.assertEqual(200, response.status_code)
        self.assertEqual(0, self.user.feed_set.count())
        self.assertEqual(
            {
                "feedsById": {},
                "feedOrder": [],
                "labelsById": {},
                "labelOrder": [],
            },
            response.json(),
        )
        self.assertRaises(Feed.DoesNotExist, Feed.objects.get, pk=feed.id)

    def test_remove_labels(self):
        """
        The remove action can delete a single label, leaving the associated
        feeds unaffected.
        """
        feed_a = self.user.feed_set.create(
            url="http://example.com/feed-a.xml",
            feed_title="Feed A",
            added=timezone.now() - timedelta(days=1),
        )
        label_a = feed_a.label_set.create(text="A", user=self.user)

        response = self.client.post(
            "/api/inventory/",
            {
                "action": "remove",
                "label": str(label_a.id),
            },
        )

        self.assertEqual(200, response.status_code)
        self.assertEqual(1, self.user.feed_set.count())
        self.assertEqual(
            {
                "feedsById": {
                    str(feed_a.id): {
                        "id": feed_a.id,
                        "title": "Feed A",
                        "text": "",
                        "siteUrl": "",
                        "labels": [],
                        "unreadCount": 0,
                        "faveCount": 0,
                        "checked": None,
                        "changed": None,
                        "added": mock.ANY,
                        "error": "",
                        "active": mock.ANY,
                        "url": "http://example.com/feed-a.xml",
                    },
                },
                "feedOrder": [feed_a.id],
                "labelsById": {},
                "labelOrder": [],
            },
            response.json(),
        )
        self.assertRaises(Label.DoesNotExist, Label.objects.get, pk=label_a.id)

    def test_update_feed_activate(self):
        """
        A feed is scheduled to be checked following an update-feed action with
        active=on.
        """
        feed = self.user.feed_set.create(
            url="http://example.com/feed1.xml",
            feed_title="Feed 1",
            added=timezone.now(),
            next_check=None,
        )

        response = self.client.post(
            "/api/inventory/",
            {
                "action": "update-feed",
                "feed": feed.id,
                "active": "on",
                "title": "",
                "url": "http://example.com/feed1.xml",
            },
        )

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertIsNotNone(feed.next_check)
        self.assertEqual(
            {
                "feedsById": {
                    str(feed.id): dictwith(
                        {
                            "id": feed.id,
                            "active": True,
                        }
                    ),
                },
                "feedOrder": [feed.id],
                "labelsById": {},
                "labelOrder": [],
            },
            response.json(),
        )

    def test_update_feed_deactivate(self):
        """
        A feed is no longer scheduled to be checked following an update-feed
        action with active=off.
        """
        feed = self.user.feed_set.create(
            url="http://example.com/feed1.xml",
            feed_title="Feed 1",
            added=timezone.now(),
            next_check=None,
        )

        response = self.client.post(
            "/api/inventory/",
            {
                "action": "update-feed",
                "feed": feed.id,
                "active": "off",
                "title": "",
                "url": "http://example.com/feed1.xml",
            },
        )

        self.assertEqual(200, response.status_code)
        [feed] = self.user.feed_set.all()
        self.assertIsNone(feed.next_check)
        self.assertEqual(
            {
                "feedsById": {
                    str(feed.id): dictwith(
                        {
                            "id": feed.id,
                            "active": False,
                        }
                    ),
                },
                "feedOrder": [feed.id],
                "labelsById": {},
                "labelOrder": [],
            },
            response.json(),
        )

    def test_update_label(self):
        """
        The update-label action sets the labels text and associated feeds.
        """
        feed_a = self.user.feed_set.create(
            url="http://example/a",
            feed_title="A",
            added=timezone.now(),
        )
        feed_b = self.user.feed_set.create(
            url="http://example/b",
            feed_title="B",
            added=timezone.now(),
        )
        feed_c = self.user.feed_set.create(
            url="http://example/c",
            feed_title="C",
            added=timezone.now(),
        )
        label_a = self.user.label_set.create(
            text="A",
        )
        label_a.feeds.set([feed_a, feed_c])

        response = self.client.post(
            "/api/inventory/",
            {
                "action": "update-label",
                "label": label_a.id,
                "feed": [feed_b.id, feed_c.id],
                "text": "B&C",
            },
        )

        self.assertEqual(200, response.status_code)

        # Label A was updated.
        updated = Label.objects.get(id=label_a.id)
        self.assertEqual("B&C", updated.text)
        self.assertRaises(Feed.DoesNotExist, updated.feeds.get, pk=feed_a.id)
        updated.feeds.get(pk=feed_b.id)
        updated.feeds.get(pk=feed_c.id)

        self.assertEqual(
            {
                "feedsById": {
                    str(feed_a.id): dictwith(
                        {
                            "id": feed_a.id,
                            "labels": [],
                        }
                    ),
                    str(feed_b.id): dictwith(
                        {
                            "id": feed_b.id,
                            "labels": [label_a.id],
                        }
                    ),
                    str(feed_c.id): dictwith(
                        {
                            "id": feed_c.id,
                            "labels": [label_a.id],
                        }
                    ),
                },
                "feedOrder": [feed_a.id, feed_b.id, feed_c.id],
                "labelsById": {
                    str(label_a.id): dictwith(
                        {
                            "text": "B&C",
                            "feeds": [feed_b.id, feed_c.id],
                        }
                    ),
                },
                "labelOrder": [label_a.id],
            },
            response.json(),
        )


class LabelsViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="bill",
            email="bill@mail.example",
            password="hunter2",
        )
        self.client.force_login(self.user)

    def test_create(self):
        """
        The label-add view displays a form that creates a label when submitted
        and redirects to display the articles in the label.
        """
        feed_a = self.user.feed_set.create(
            url="http://example/a",
            feed_title="A Feed",
            added=timezone.now(),
        )
        feed_b = self.user.feed_set.create(
            url="https://example/b",
            feed_title="B Feed",
            added=timezone.now(),
        )
        feed_c = self.user.feed_set.create(
            url="https://example/c",
            feed_title="C Feed",
            added=timezone.now(),
        )

        add_url = reverse("label-add")
        response = self.client.post(
            add_url,
            {
                "text": "foo",
                "feeds": [str(feed_a.id), str(feed_b.id)],
            },
        )

        [label] = self.user.label_set.all()
        self.assertEqual("foo", label.text)
        label_feeds = label.feeds.all()
        self.assertIn(feed_a, label_feeds)
        self.assertIn(feed_b, label_feeds)
        self.assertNotIn(feed_c, label_feeds)
        self.assertRedirects(
            response,
            reverse(
                "label-show",
                kwargs={"label_id": label.id, "filter": ArticleFilter.unread},
            ),
        )

    def test_create_empty(self):
        """
        Creating a label with empty text fails.
        """
        feed_a = self.user.feed_set.create(
            url="http://example/a",
            feed_title="A Feed",
            added=timezone.now(),
        )

        add_url = reverse("label-add")
        response = self.client.post(
            add_url,
            {
                "text": "",
                "feeds": [str(feed_a.id)],
            },
        )
        self.assertEqual(200, response.status_code)

    def test_create_duplicate(self):
        """
        Creating a label with duplicate text fails.
        """
        feed_a = self.user.feed_set.create(
            url="http://example/a",
            feed_title="A Feed",
            added=timezone.now(),
        )
        self.user.label_set.create(text="foo")

        form_page = expect_html(self.client.get(reverse("label-add")))
        [form] = form_page.forms
        form.fields["text"] = "foo"
        form.fields["feeds"] = [str(feed_a.id)]
        error_page = expect_html(self.client.post(form.action, dict(form.form_values())))
        [form] = error_page.forms
        errors = [el.text_content() for el in form.cssselect(".errorlist li")]
        self.assertEqual(["Label text must be unique"], errors)


class FeedShowTests(TestCase):
    """
    Test the ``feed-show`` view, which displays a list of articles.
    """

    def setUp(self):
        self.user = User.objects.create_user(
            username="john",
            email="john@mail.example",
            password="sesame",
        )
        self.client = Client()
        self.client.force_login(self.user)
        self.feed = self.user.feed_set.create(
            url="http://example.com/feed.xml",
            feed_title="Feed A",
            site_url="http://example.com/",
            added=timezone.now(),
        )

    maxDiff = None

    def test_empty(self):
        """
        The renders even if there aren't any articles.
        """
        for filt in ArticleFilter.__members__.values():
            with self.subTest(filt=filt):
                url = reverse("feed-show", kwargs={"feed_id": self.feed.pk, "filter": filt})
                expect_html(self.client.get(url))

    @patch("yarrharr.views.PAGE_SIZE", new=5)
    def test_paginate(self):
        for i in range(10):
            self.feed.articles.create(
                read=False,
                fave=i & 1,
                author=f"Author {i}",
                title=f"Article {i}",
                url=f"http://example.com/{i}",
                date=timezone.now() - timedelta(hours=i),
                guid=str(i),
                raw_content="...",
                content="...",
                content_snippet=f"{i} " * i,
            )

        url = reverse(
            "feed-show",
            kwargs={"feed_id": self.feed.pk, "filter": ArticleFilter.unread},
        )

        page1 = expect_html(self.client.get(url))
        page1.make_links_absolute(url)

        self.assertEqual(
            ["Article 0", "Article 1", "Article 2", "Article 3", "Article 4"],
            [el.text_content() for el in page1.cssselect(".list-article .title")],
        )

        [next_link] = page1.cssselect(".pagination a")
        page2 = expect_html(self.client.get(next_link.attrib["href"]))

        self.assertEqual(
            ["Article 5", "Article 6", "Article 7", "Article 8", "Article 9"],
            [el.text_content() for el in page2.cssselect(".list-article .title")],
        )

        # No more pages
        self.assertEqual([], page2.cssselect(".pagination a"))


class FlagsViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="bill",
            email="bill@mail.example",
            password="hunter2",
        )
        self.client.force_login(self.user)
        self.feed = self.user.feed_set.create(
            url="http://example.com/feed.xml",
            feed_title="Feed A",
            site_url="http://example.com/",
            added=timezone.now(),
        )
        for i in range(1, 10):
            self.feed.articles.create(
                id=i,
                read=False,
                fave=False,
                author=f"Author {i}",
                title=f"Article {i}",
                url=f"http://example.com/{i}",
                date=timezone.now() - timedelta(hours=i),
                guid=str(i),
                raw_content="...",
                content="...",
                content_snippet=f"{i} " * i,
            )

    maxDiff = None

    def test_flag(self):
        flag_url = reverse("api-flags")
        self.assertEqual(
            self.client.post(
                flag_url,
                {"read": "true", "article": ["1", "2"]},
            ).json(),
            {
                "1": {"read": True, "fave": False},
                "2": {"read": True, "fave": False},
            },
        )

        self.assertEqual(
            self.client.post(
                flag_url,
                {"fave": "true", "article": ["4", "3"]},
            ).json(),
            {
                "3": {"read": False, "fave": True},
                "4": {"read": False, "fave": True},
            },
        )

        self.assertEqual(
            self.client.post(
                flag_url,
                {"fave": "false", "read": "false", "article": ["2", "4"]},
            ).json(),
            {
                "2": {"read": False, "fave": False},
                "4": {"read": False, "fave": False},
            },
        )

        self.assertEqual(
            {
                "1": {"read": True, "fave": False},
                "2": {"read": False, "fave": False},
                "3": {"read": False, "fave": True},
                "4": {"read": False, "fave": False},
                "5": {"read": False, "fave": False},
                "6": {"read": False, "fave": False},
            },
            self.client.post(
                flag_url,
                {"article": ["1", "2", "3", "4", "5", "6"]},
            ).json(),
        )


class ManifestTests(TestCase):
    def test_get(self):
        """
        The manifest is valid JSON served with the application/manifest+json
        content type.
        """
        response = Client().get("/manifest.webmanifest")

        self.assertEqual(200, response.status_code)
        self.assertEqual("application/manifest+json", response["Content-Type"])

        manifest = response.json()
        self.assertEqual("Yarrharr", manifest["name"])


class RobotsTxtTests(TestCase):
    def test_get(self):
        """
        The robots.txt file is empty.
        """
        response = Client().get("/robots.txt")
        self.assertEqual(200, response.status_code)
        self.assertEqual(b"", response.content)

    def test_head(self):
        """
        Django automatically supports HEAD when GET is provided.
        """
        response = Client().get("/robots.txt")
        self.assertEqual(200, response.status_code)

    def test_post(self):
        """
        Unsupported methods are rejected.
        """
        response = Client().post("/robots.txt", {})
        self.assertEqual(405, response.status_code)


class LegacyRedirectTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="james",
            email="james@mail.example",
            password="hunter2",
        )
        self.client = Client()
        self.client.force_login(self.user)

    def test_article_url_redirects(self):
        """
        Old article URLs (used by the React SPA) are redirected to the new
        location.
        """
        table = [
            ("/all/unread/1234/", "/article/1234/"),
            ("/feed/1/fave/234/", "/article/234/"),
            ("/label/12/all/34/", "/article/34/"),
        ]

        for from_, to in table:
            response = self.client.get(from_)
            self.assertEqual(to, response["Location"])
