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
from urllib.parse import urlencode

import lxml.html
from django.contrib.auth.models import User
from django.http import HttpResponseNotFound, HttpResponseRedirect
from django.test import Client, TestCase
from django.urls import reverse
from django.utils import timezone

from ..enums import ArticleFilter
from ..models import Feed
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


def submit_form(client, form):
    response = client.post(
        form.action,
        urlencode(form.form_values()),
        "application/x-www-form-urlencoded",
        follow=True,
    )
    assert response.status_code == 200
    html = expect_html(response)
    # Assume there's only one form (true for now!)
    [response_form] = html.forms
    validation_errors = []
    for errorlist in response_form.cssselect(".errorlist"):
        [input_] = response_form.cssselect(f"[aria-describedby='{errorlist.attrib['id']}']")
        input_html = lxml.html.tostring(input_).decode().strip()
        err_html = lxml.html.tostring(errorlist).decode().strip()
        validation_errors.append(f"{input_html} failed validation: {err_html}")
    if validation_errors:
        raise AssertionError(f"Form submission produced {len(validation_errors)} validation errors:\n\n" + "\n\n".join(validation_errors))
    return html


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
        self._add_feed("Z", checked=False)  # Archived, so not shown

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
        self._add_feed("Feed AAA", checked=False)  # Archived, so not shown

        self.assertEqual(
            ["<-Feed a", "feed b", "Feed C"],
            self._feed_list_titles("az"),
        )

    def test_view_error(self):
        """
        The "error" view only shows feeds that have errors. It excludes
        archived feeds.
        """
        self._add_feed("C", error="429", last_checked=datetime.fromisoformat("2010-01-01 00:00:00+00:00"))
        self._add_feed("B", error="")  # No error, not shown
        self._add_feed("A", error="404", last_checked=datetime.fromisoformat("2020-01-01 00:00:00+00:00"))
        self._add_feed("Z", checked=False)  # Archived, so not shown

        self.assertEqual(
            ["A 404", "C 429"],
            self._feed_list_titles("error"),
        )

    def test_view_redirect(self):
        """
        The "redirect" view shows feeds where the feed URL doesn't match the ultimate
        content location, in descending order of update. It excludes feeds that aren't
        being or haven't been checked.
        """
        self._add_feed(
            "A",
            url="http://a.com/feed.xml",
            last_updated=datetime.fromisoformat("2020-01-01 00:00:00+00:00"),
            content_location="https://a.com/feed.xml",
        )
        self._add_feed(
            "X",
            url="http://foo.com",
            content_location="http://foo.com",  # Same URL, so not shown
        )
        self._add_feed("Y", url="http://foo.com", content_location=None)  # Not fetched, so not shown
        self._add_feed("Z", next_check=None)  # Archived, so not shown

        self.assertEqual(
            ["A http://a.com/feed.xml → https://a.com/feed.xml"],
            self._feed_list_titles("redirect"),
        )

    def test_view_http(self):
        """
        The "http" view only shows feeds that have HTTP URLs in descending order of
        update. It excludes archived feeds.
        """
        self._add_feed("C", url="HTTP://C.COM", last_updated=datetime.fromisoformat("2010-01-01 00:00:00+00:00"))
        self._add_feed("B", url="https://foo.com")  # HTTPS, so not shown
        self._add_feed("A", url="http://a.com/feed.xml", last_updated=datetime.fromisoformat("2020-01-01 00:00:00+00:00"))
        self._add_feed("Z", checked=False)  # Archived, so not shown

        self.assertEqual(
            ["A http://a.com/feed.xml", "C HTTP://C.COM"],
            self._feed_list_titles("http"),
        )

    def test_view_archived(self):
        """
        The "archived" view only shows feeds that are no longer polled.
        """
        self._add_feed(
            "A",
            checked=False,
            next_check=None,
            last_checked=datetime.fromisoformat("2010-01-01 00:00:00+00:00"),
        )
        self._add_feed(
            "B",
            checked=False,
            next_check=datetime.fromisoformat("2011-01-01 00:00:00+00:00"),  # Ignored.
            last_checked=datetime.fromisoformat("2011-01-01 00:00:00+00:00"),
        )
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


class FeedAddTests(TestCase):
    """Test the feed-add form."""

    def setUp(self):
        self.user = User.objects.create_user(username="ed", email="ed@mail.example", password="ok")
        self.client = Client()
        self.client.force_login(self.user)

    # TODO


class FeedEditTests(TestCase):
    """Test the feed-edit view form."""

    def setUp(self):
        self.user = User.objects.create_user(username="dave", email="dave@mail.example", password="...")
        self.client = Client()
        self.client.force_login(self.user)

    def test_update_feed_title(self):
        added = timezone.now() - timedelta(days=1)
        feed = self.user.feed_set.create(
            url="http://example.com/feedX.xml",
            feed_title="Feed X",
            site_url="http://example.com/",
            added=added,
        )

        form_page = expect_html(self.client.get(reverse("feed-edit", kwargs={"feed_id": feed.pk})))
        [form] = form_page.forms
        form.inputs["user_title"].value = "Feed Y"

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            submit_form(self.client, form)

        [feed] = self.user.feed_set.all()
        self.assertEqual("Feed Y", feed.user_title)
        self.assertEqual("Feed Y", feed.title)

        self.assertEqual(1, len(schedule_changed_signals))

    def test_update_url(self):
        """
        Changing a feed's URL schedules it for immediate checking.
        """
        new_url = "https://example.com/feedY.xml"
        feed = self.user.feed_set.create(
            url="http://example.com/feedX.xml",
            feed_title="Feed X",
            site_url="http://example.com/",
            added=timezone.now(),
            next_check=timezone.now() + timedelta(days=7),
        )

        form_page = expect_html(self.client.get(reverse("feed-edit", kwargs={"feed_id": feed.pk})))
        [form] = form_page.forms
        form.inputs["url"].value = new_url

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            submit_form(self.client, form)

        [feed] = self.user.feed_set.all()
        self.assertEqual(new_url, feed.url)
        self.assertLessEqual(feed.next_check, timezone.now())
        self.assertEqual(1, len(schedule_changed_signals))

    def test_min_check_interval(self):
        """
        When the minimum check interval changes, the feed is rescheduled such
        that the next check comes after that interval.
        """
        now = timezone.now()
        feed = self.user.feed_set.create(
            url="http://example.com/atom.xml",
            feed_title="Feed",
            site_url="http://example.com/",
            added=now,
            last_checked=now - timedelta(hours=1),
            next_check=now - timedelta(seconds=1),
            min_check_interval=None,
            max_check_interval=timedelta(days=7, seconds=4),
        )
        for i in range(1, 3):
            feed.articles.create(
                read=False,
                fave=False,
                author=f"Author {i}",
                title=f"Article {i}",
                url=f"http://example.com/{i}",
                date=now - timedelta(seconds=i),
                guid=str(i),
                raw_content="...",
                content="...",
                content_snippet="...",
            )

        form_page = expect_html(self.client.get(reverse("feed-edit", kwargs={"feed_id": feed.pk})))
        [form] = form_page.forms
        form.inputs["min_check_interval"].value = "3 09:00:00"  # longer than the default max

        with (
            signal_inbox(schedule_changed) as schedule_changed_signals,
            mock.patch.object(Feed, "_now", staticmethod(lambda: now)),
        ):
            submit_form(self.client, form)

        [feed] = self.user.feed_set.all()
        self.assertEqual(timedelta(days=3, hours=9), feed.min_check_interval)
        self.assertIsNone(feed.next_check)
        self.assertEqual(1, len(schedule_changed_signals))

        feed.schedule()

        self.assertGreaterEqual(feed.next_check, now + timedelta(days=3))

    def test_max_check_interval(self):
        """
        When the maximum check interval changes, the feed is rescheduled such
        that the next check is sooner than that interval.
        """
        now = timezone.now()
        feed = self.user.feed_set.create(
            url="http://example.com/atom.xml",
            feed_title="Feed",
            site_url="http://example.com/",
            added=now,
            last_checked=now - timedelta(hours=1),
            next_check=now + timedelta(hours=1),
            min_check_interval=timedelta(minutes=23),
            max_check_interval=None,
        )
        # 2 articles 5 days apart.
        for i, date in enumerate([now - timedelta(days=1), now - timedelta(days=6)]):
            feed.articles.create(
                read=False,
                fave=False,
                author=f"Author {i}",
                title=f"Article {i}",
                url=f"http://example.com/{i}",
                date=date,
                guid=str(i),
                raw_content="...",
                content="...",
                content_snippet="...",
            )

        form_page = expect_html(self.client.get(reverse("feed-edit", kwargs={"feed_id": feed.pk})))
        [form] = form_page.forms
        form.inputs["max_check_interval"].value = "3 0:00:00"  # 3 days, more than the default maximum

        with mock.patch.object(Feed, "_now", staticmethod(lambda: now)):
            with signal_inbox(schedule_changed) as schedule_changed_signals:
                submit_form(self.client, form)

            [feed] = self.user.feed_set.all()
            self.assertEqual(timedelta(days=3), feed.max_check_interval)
            self.assertIsNone(feed.next_check)
            self.assertEqual(1, len(schedule_changed_signals))

            feed.schedule()

        self.assertEqual(feed.next_check, now + timedelta(days=3))

    def test_archive(self):
        """
        A feed is no longer scheduled to be checked when it is
        archived.
        """
        feed = self.user.feed_set.create(
            url="http://example.com/feed1.xml",
            feed_title="Feed 1",
            added=timezone.now(),
            next_check=timezone.now(),
        )

        form_page = expect_html(self.client.get(reverse("feed-edit", kwargs={"feed_id": feed.pk})))
        [form] = form_page.forms

        form.inputs["checked"].value = False

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            submit_form(self.client, form)

        [feed] = self.user.feed_set.all()
        self.assertFalse(feed.checked)

        self.assertEqual(1, len(schedule_changed_signals))
        feed.schedule()
        self.assertIsNone(feed.next_check)

    def test_unarchive(self):
        """
        A feed is scheduled to be checked immediately when it is no
        longer archived.
        """
        feed = self.user.feed_set.create(
            url="http://example.com/feed1.xml",
            feed_title="Feed 1",
            added=timezone.now(),
            checked=False,
            next_check=None,
        )

        form_page = expect_html(self.client.get(reverse("feed-edit", kwargs={"feed_id": feed.pk})))
        [form] = form_page.forms

        form.inputs["checked"].value = True

        with signal_inbox(schedule_changed) as schedule_changed_signals:
            submit_form(self.client, form)

        [feed] = self.user.feed_set.all()
        self.assertTrue(feed.checked)
        self.assertEqual(1, len(schedule_changed_signals))

        feed.schedule()
        self.assertIsNotNone(feed.next_check)


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
