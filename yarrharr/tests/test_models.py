# -*- coding: utf-8 -*-
# Copyright © 2017, 2018 Tom Most <twm@freecog.net>
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
#
# Additional permission under GNU GPL version 3 section 7
#
# If you modify this Program, or any covered work, by linking or
# combining it with OpenSSL (or a modified version of that library),
# containing parts covered by the terms of the OpenSSL License, the
# licensors of this Program grant you additional permission to convey
# the resulting work.  Corresponding Source for a non-source form of
# such a combination shall include the source code for the parts of
# OpenSSL used as well as that of the covered work.
from datetime import timedelta
from unittest.mock import patch

from django.db import transaction
from django.test import TestCase
from django.utils import timezone
from django.contrib.auth.models import User

from ..models import Feed, Article


class FeedTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='admin',
            email='admin@mailhost.example',
            password='sesame',
        )

    def test_str_feed_title(self):
        """
        The title from the feed content is used unless overridden by the user.
        """
        f = self.user.feed_set.create(
            url='https://feed.example/',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title=u'Example Feed‽',
            user_title=u'',
        )
        self.assertEqual(u'Example Feed‽', f.title)
        self.assertEqual(u'Example Feed‽ <https://feed.example/>',
                         u'{}'.format(f))

    def test_str_user_title(self):
        """
        A user-set title has precedence over the title given in the feed
        content.
        """
        f = self.user.feed_set.create(
            url='https://feed.example/',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title=u'Example Feed',
            user_title=u'My Example Feed',
        )
        self.assertEqual(u'My Example Feed', f.title)
        self.assertEqual(u'My Example Feed <https://feed.example/>',
                         u'{}'.format(f))


class FeedScheduleTests(TestCase):
    """
    Test `Feed.schedule()`

    :ivar now: aware `datetime.datetime` representing the current time. The
        `Feed` class is patched so that it always gets this time.

    :ivar feed: `Feed` instance under test. The feed has no articles unless
        they are added in the test (see :meth:`.add_article()`).
    """
    @classmethod
    def setUpTestData(cls):
        user = User.objects.create_user(
            username='threads',
            email='threads@mailhost.example',
            password='sesame',
        )
        cls.feed = user.feed_set.create(
            url='https://feed.example',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title=u'Feed',
            user_title=u'',
        )

    def setUp(self):
        self.now = timezone.now()
        now_patch = patch('yarrharr.models.Feed._now',
                          new=staticmethod(lambda: self.now))
        now_patch.start()
        self.addCleanup(now_patch.stop)

    def add_article(self, since):
        """
        Add an article to :attr:`.feed`.

        :param since: How long has it been since the article was posted?
            Subtracted from :attr:`.now` to produce the article's date.
        :type since: datetime.timedelta
        """
        self.feed.articles.create(
            read=False,
            fave=False,
            author='',
            title='Article',
            url='https://feed.example/article',
            date=self.now - since,
            guid='',
            raw_content='...',
            content='...',
        )

    def assert_scheduled(self, expected):
        """
        :param expected: How soon the next check should be relative to :attr:`now`.
        :type expected: datetime.timedelta
        """
        actual = self.feed.next_check - self.now
        self.assertEqual(expected, actual, (
            '\nNext check should be {} from'
            '\nnow, but found it is {} from now.'
        ).format(expected, actual))

    def test_disabled(self):
        """
        `schedule()` has no effect when checking has been disabled by setting
        `next_check` to None.
        """
        self.feed.next_check = None
        self.feed.save()

        self.feed.schedule()

        self.assertIs(None, self.feed.next_check)

    def test_no_articles(self):
        """
        When no articles are present the next check is scheduled for a day hence.
        """
        self.feed.schedule()

        self.assert_scheduled(timedelta(days=1))

    def test_one_article(self):
        """
        A single article is not enough to establish a pattern, so the default
        of one day hence applies.
        """
        self.add_article(timedelta(days=1))

        self.feed.schedule()

        self.assert_scheduled(timedelta(days=1))

    def test_take_minimum(self):
        """
        The ideal delay is computed as the minimum gap between recent articles.
        """
        self.add_article(timedelta(days=1, minutes=90))
        self.add_article(timedelta(days=1, minutes=30))  # +60m
        self.add_article(timedelta(days=1))              # +30m

        self.feed.schedule()

        self.assert_scheduled(timedelta(minutes=30))

    def test_15min_minimum(self):
        """
        When the minimum gap between articles is less than the 15 minute
        minimum, the minimum applies.
        """
        self.add_article(timedelta(days=1, minutes=1))
        self.add_article(timedelta(days=1, seconds=1))  # +59s
        self.add_article(timedelta(days=1))             # +1s
        self.add_article(timedelta(days=1))             # +0
        self.add_article(timedelta(days=1))             # +0

        self.feed.schedule()

        self.assert_scheduled(timedelta(minutes=15))

    def test_1day_max(self):
        """
        When the minimum gap between articles exceeds the 1 day maximum, the
        maximum applies.
        """
        self.add_article(timedelta(days=12))
        self.add_article(timedelta(days=10))  # +2d
        self.add_article(timedelta(days=7))   # +3d

        self.feed.schedule()

        self.assert_scheduled(timedelta(days=1))

    def test_too_old(self):
        """
        Only articles from the last two weeks are considered when making
        scheduling decisions. Here, there are two articles 30 minutes apart but
        they are 15 days old, so the default interval applies.
        """
        self.add_article(timedelta(days=15, minutes=30))
        self.add_article(timedelta(days=15))  # +30m

        self.feed.schedule()

        self.assert_scheduled(timedelta(days=1))


class ArticleTests(TestCase):
    def test_repr(self):
        a = Article(
            feed=Feed(
                user=User.objects.create_user(
                    username='admin',
                    email='admin@mailhost.example',
                    password='sesame',
                ),
                url='https://feed.example/',
                added=timezone.now(),
                next_check=timezone.now(),
                feed_title=u'Example Feed',
            ),
            read=False,
            fave=False,
            author='',
            title='Some Article',
            url='https://feed.example/1',
            date=timezone.now(),
            guid='1',
            raw_content='...',
            content='...',
        )

        self.assertEqual("Some Article <https://feed.example/1>",
                         u'{}'.format(a))


class ArticleSetContentTests(TestCase):
    """
    Test the `yarrharr.models.Article.set_content()` method.
    """
    def setUp(self):
        self.article = Article(
            feed=Feed(
                user=User.objects.create_user(
                    username='user',
                    email='user@mailhost.example',
                    password='sesame',
                ),
                url='https://feed.example/',
                added=timezone.now(),
                next_check=timezone.now(),
                feed_title='Example Feed',
            ),
            read=False,
            fave=False,
            author='',
            url='https://feed.example/1',
            date=timezone.now(),
            guid='1',
        )

    def test_set_raw(self):
        """
        The `set_content()` method sets the `title` and `raw_content` fields.
        """
        self.article.set_content('Title', '<p>Content</p>')

        self.assertEqual('Title', self.article.raw_title)
        self.assertEqual('<p>Content</p>', self.article.raw_content)

    def test_derived(self):
        """
        The `set_content()` method sets fields derived from the raw content:

          * `content` — sanitized HTML
          * `content_snippet` — textual prefix of the HTML
          * `content_rev` — revision number of the sanitization scheme
        """
        self.article.set_content('Title', (
            '<p>' + '1' * 100 + '</p>' +
            '<script>.</script>' +
            '<p>' + '2' * 100 + '</p>' +
            '<p>' + '3' * 100 + '</p>'
        ))

        self.assertEqual('Title', self.article.title)
        self.assertEqual(
            (
                '<p>' + '1' * 100 +
                '<p>' + '2' * 100 +
                '<p>' + '3' * 100
            ),
            self.article.content,
        )
        self.assertEqual(
            '1' * 100 + ' ' + '2' * 100 + ' ' + '3' * 53,
            self.article.content_snippet,
        )

    def test_title_prefix(self):
        """
        When the snippet of an article begins with the same text as the title,
        remove that prefix. This is common in webcomic feeds, where the feed
        entry title tends to be the same as the alt text of the comic image.
        """
        self.article.set_content('TITLE', 'TITLE content content content')

        self.assertEqual('TITLE', self.article.title)
        self.assertEqual('content content content', self.article.content_snippet)


class FeedArticleCountTriggerTests(TestCase):
    """
    Test the SQL triggers which update the `Feed.all_count`,
    `Feed.unread_count`, and `Feed.fave_count` fields when articles are
    updated.

    :ivar int feed_id:
        Primary key of the feed created by setUp() that is associated with the
        article.
    :ivar int other_feed_id:
        Primary key of a feed created by setUp() that is *not* associated with
        any articles. The counts of this feed should remain zero.
    :ivar int article_id:
        Primary key of the article created by setUp().
    """
    @classmethod
    def setUpTestData(cls):
        f1 = Feed.objects.create(
            user=User.objects.create_user(
                username='user',
                email='user@mailhost.example',
                password='sesame',
            ),
            url='https://feed.example/1',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title='Feed with articles',
        )
        f2 = Feed.objects.create(
            user=f1.user,
            url='https://feed.example/2',
            added=timezone.now(),
            next_check=timezone.now(),
            feed_title='Feed without articles',
        )
        a = Article.objects.create(
            read=False,
            fave=False,
            feed=f1,
            author='',
            url='https://feed.example/1',
            date=timezone.now(),
            guid='1',
        )

        cls.feed_id = f1.pk
        cls.other_feed_id = f2.pk
        cls.article_id = a.pk

    def assertCounts(self, *, all, unread, fave):
        """
        Assert the state of the feed's counters.

        This always goes to the database.

        :returns: (all, unread, fave) tuple of counts
        """
        f1 = Feed.objects.get(pk=self.feed_id)
        f2 = Feed.objects.get(pk=self.other_feed_id)
        self.assertEqual({
            'all': all,
            'unread': unread,
            'fave': fave,
        }, {
            'all': f1.all_count,
            'unread': f1.unread_count,
            'fave': f1.fave_count,
        })
        self.assertEqual((0, 0, 0), (f2.all_count, f2.unread_count, f2.fave_count))

    def test_initial(self):
        """
        Test the initial feed counts.
        """
        self.assertCounts(all=1, unread=1, fave=0)

    def test_mark_read(self):
        """
        Marking an article read decrements the unread count.
        """
        a = Article.objects.get(pk=self.article_id)
        a.read = True
        a.save()

        self.assertCounts(all=1, unread=0, fave=0)

        a.read = True
        a.save()

        self.assertCounts(all=1, unread=0, fave=0)

        a.read = False
        a.save()

        self.assertCounts(all=1, unread=1, fave=0)

    def test_mark_fave(self):
        """
        Marking an article fave increments the fave count, and vice-versa.
        """
        a = Article.objects.get(pk=self.article_id)
        a.fave = True
        a.save()

        self.assertCounts(all=1, unread=1, fave=1)

        a.fave = False
        a.save()

        self.assertCounts(all=1, unread=1, fave=0)

    def test_create_article(self):
        """
        Creating and deleting articles increments the counters according to the
        flags on the article.
        """
        kw = dict(feed_id=self.feed_id, author='', url='https://feed.example/2', date=timezone.now(), guid='2')

        a2 = Article.objects.create(read=False, fave=False, **kw)
        self.assertCounts(all=2, unread=2, fave=0)

        a3 = Article.objects.create(read=True, fave=True, **kw)
        self.assertCounts(all=3, unread=2, fave=1)

        a2.delete()
        self.assertCounts(all=2, unread=1, fave=1)

        a3.delete()
        self.assertCounts(all=1, unread=1, fave=0)

    def test_bulk(self):
        """
        A transaction involving multiple articles updates the counters
        correctly in aggregate. This test:

          1. Creates 10 articles in a transaction, all unread and faved.
          2. Checks the counters increased by 10.
          3. Bulk marks read 5 of them.
          4. Checks the unread counter decreased by 5.
          5. Deletes 5 of those articles in another transaction.
          4. Checks the counters decreased by 5.
        """
        with transaction.atomic():
            articles = [
                Article.objects.create(
                    read=False,
                    fave=True,
                    feed_id=self.feed_id,
                    author='',
                    url='https://feed.example/' + str(i),
                    date=timezone.now(),
                    guid=str(i),
                ) for i in range(10)
            ]
        self.assertCounts(all=11, unread=11, fave=10)

        Article.objects.filter(id__in=[a.pk for a in articles[:5]]).update(read=True)
        self.assertCounts(all=11, unread=6, fave=10)

        Article.objects.filter(id__in=[a.pk for a in articles[-5:]]).update(fave=False)
        self.assertCounts(all=11, unread=6, fave=5)

        with transaction.atomic():
            for a in articles[-5:]:
                a.delete()
        self.assertCounts(all=6, unread=1, fave=5)

    def test_reset(self):
        """
        Updates which don't actually change the value of flags don't change
        counters.
        """
        qs = Article.objects.filter(pk=self.article_id)

        qs.update(read=False)
        self.assertCounts(all=1, unread=1, fave=0)

        qs.update(fave=False)
        self.assertCounts(all=1, unread=1, fave=0)
