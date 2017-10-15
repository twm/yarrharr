# -*- coding: utf-8 -*-
# Copyright © 2017 Tom Most <twm@freecog.net>
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

from __future__ import print_function

import unittest
from pprint import pprint

import html5lib

from ..fetch import sanitize_html, html_to_text


class HtmlToTextTests(unittest.TestCase):
    def test_plain(self):
        """
        Plain text passes through unaltered.
        """
        self.assertEqual(u'Foo Bar', html_to_text(u'Foo Bar'))

    def test_simple(self):
        """
        HTML tags are stripped.
        """
        self.assertEqual(
            u'Foo Bar',
            html_to_text(u'Fo<b>o <i>B</i>a</b>r'),
        )

    def test_style_dropped(self):
        """
        The content of ``<style>`` tags does not appear in the text
        representation.
        """
        self.assertEqual(
            u'ABC',
            html_to_text(u'<a>A<style scoped>a { font-weight: bold }</style>B</a><b>C</b>'),
        )

    def test_script_dropped(self):
        """
        The contents of ``<script>`` tags does not appear in the text
        representation.
        """
        self.assertEqual(
            u'ABC',
            html_to_text(u'A<script>bbbab</script>B<b>C</b>'),
        )


class SanitizeHtmlTests(unittest.TestCase):
    def test_script_dropped(self):
        """
        The content of a ``<script>`` tag is dropped, silently. Sometimes feeds
        contain scripts by accident.
        """
        scripts = [
            u'<p>Hello, world!<script>alert("!");</script>',
            u'<p>Hello, <script></script>world!</p>',
            u'<p><script>Hello</script>Hello, world!',
            u'<p>Hello, <script>...<script>...</script></script>world!',
            u'<p><style type="text/javascript"><script type="text/css"></style>Hello, world!',
        ]

        for s in scripts:
            self.assertEqual(u'<p>Hello, world!', sanitize_html(s))

    def test_style_dropped(self):
        """
        The content of a ``<style>`` tag is dropped, silently. Sometimes feeds
        contain styles by accident.
        """
        self.assertEqual(
            u'<p><b>Hello</b>, world!',
            sanitize_html(u'<p><b>Hello</b>, world<style type="text/css">b { color: red }</style>!'),
        )

    def test_object_replaced(self):
        """
        An ``<object>`` tag is replaced with its content, omitting any
        ``<param>`` tags as well.
        """
        html = (
            u'<object data="obsolete.swf" type="application/x-shockwave-flash">'
            u'<param name="foo" value="bar">'
            u'<p>Flash video</p>'
            u'</object>'
        )
        self.assertEqual(u'<p>Flash video', sanitize_html(html))

    def test_object_nest_replaced(self):
        """
        Nested ``<object>`` tags are recursively replaced with their content.
        """
        html = (
            u'<p>'
            u'<object>'
            u'<param name="level" value="1">'
            u'Level 1<br>'
            u'<object>'
            u'<param name="level" value="2">'
            u'Level 2'
            u'</object>'
            u'</object>'
        )
        self.assertEqual(u'<p>Level 1<br>Level 2', sanitize_html(html))

    def test_img_passes_through(self):
        """
        ``<img>`` tags are safe and pass right through.
        """
        html = u'<img alt="" src="https://example.com/baz.png">'
        html2 = u'<img src="https://example.com/baz.png" alt="">'
        # FIXME: the order of the attributes varies as dicts aren't ordered...
        self.assertIn(sanitize_html(html), (html, html2))

    def test_youtube_embed_replaced(self):
        """
        An ``<iframe>`` style embedded YouTube video is replaced by a thumbnail
        which links to the original video.
        """
        html = (
            u'<p>'
            u'<iframe allowfullscreen="allowfullscreen" frameborder="0" '
            u' height="315" src="http://www.youtube.com/embed/XsyogXtyU9o" '
            u' width="560"></iframe></p>'
        )
        self.assertEqual((
            u'<p><a href="https://www.youtube.com/watch?v=XsyogXtyU9o"'
            u' rel="noopener noreferrer" target=_blank>'
            u'<img alt="YouTube video" src="https://i.ytimg.com/vi/XsyogXtyU9o/mqdefault.jpg"'
            u' width=320 height=180></a>'
        ), sanitize_html(html))

    def test_youtube_nocookie_embed_replaced(self):
        """
        A "privacy-enhanced" YouTube embed, which uses the youtube-nocookie.com domain, is replaced with a link.
        """
        html = (
            u'<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/Q0CbN8sfihY"'
            u' frameborder="0" allowfullscreen></iframe>'
        )
        self.assertEqual((
            u'<a href="https://www.youtube.com/watch?v=Q0CbN8sfihY"'
            u' rel="noopener noreferrer" target=_blank>'
            u'<img alt="YouTube video" src="https://i.ytimg.com/vi/Q0CbN8sfihY/mqdefault.jpg"'
            u' width=320 height=180></a>'
        ), sanitize_html(html))

    def test_youtube_embed_start_timecode_preserved(self):
        """
        A YouTube embed which links to a specific time in the video produces a link to that same time.
        """
        html = (
            u'<iframe width="560" height="315" frameborder="0" allowfullscreen '
            u' src="https://www.youtube.com/embed/wZZ7oFKsKzY?rel=0&amp;showinfo=0&amp;start=3601"></iframe>'
        )
        self.assertEqual((
            u'<a href="https://www.youtube.com/watch?v=wZZ7oFKsKzY#t=3601s"'
            u' rel="noopener noreferrer" target=_blank>'
            u'<img alt="YouTube video" src="https://i.ytimg.com/vi/wZZ7oFKsKzY/mqdefault.jpg"'
            u' width=320 height=180></a>'
        ), sanitize_html(html))

    def test_youtube_embed_content_dropped(self):
        """
        Stuff inside a YouTube embed ``<iframe>`` tag is discarded.
        """
        html = (
            u'<iframe allowfullscreen="allowfullscreen" frameborder="0" '
            u' height="315" src="http://www.youtube.com/embed/Q0CbN8sfihY" '
            u' width="560"><p>inside</iframe>after'
        )
        self.assertEqual((
            u'<a href="https://www.youtube.com/watch?v=Q0CbN8sfihY"'
            u' rel="noopener noreferrer" target=_blank>'
            u'<img alt="YouTube video" src="https://i.ytimg.com/vi/Q0CbN8sfihY/mqdefault.jpg"'
            u' width=320 height=180></a>after'
        ), sanitize_html(html))

    def test_img_title_to_aside(self):
        """
        As it is painful to view the "title text" of an image from
        a touchscreen device, inject the text as an ``<aside>`` element after
        the image.
        """
        html = u'<img title="blah blah">'
        self.assertEqual(u'<img title="blah blah"><aside>blah blah</aside>', sanitize_html(html))

    def test_a_attrs(self):
        """
        ``<a>`` tags are given ``rel`` and ``target`` attributes.
        """
        html = u'<a href="foo.html">bar</a>'
        self.assertEqual(
            u'<a href=foo.html rel="noopener noreferrer" target=_blank>bar</a>',
            sanitize_html(html),
        )


def print_tokens(html):
    tree = html5lib.parseFragment(html)
    w = html5lib.getTreeWalker('etree')
    print('Tokens for', html)
    for token in w(tree):
        pprint(token)
