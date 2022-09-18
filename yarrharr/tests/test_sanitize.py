# Copyright © 2017, 2018, 2020, 2022 Tom Most <twm@freecog.net>
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

import unittest
from pprint import pprint

import html5lib

from ..sanitize import html_to_text, sanitize_html

VIDEO_ICON = "<svg width=1em height=1em class=icon><use href=#icon-video></use></svg>"


class HtmlToTextTests(unittest.TestCase):
    maxDiff = None

    def test_plain(self):
        """
        Plain text passes through unaltered.
        """
        self.assertEqual("Foo Bar", html_to_text("Foo Bar"))

    def test_simple(self):
        """
        HTML tags are stripped.
        """
        self.assertEqual(
            "Foo Bar",
            html_to_text("Fo<b>o <i>B</i>a</b>r"),
        )

    def test_style_dropped(self):
        """
        The content of ``<style>`` tags does not appear in the text
        representation.
        """
        self.assertEqual(
            "ABC",
            html_to_text("<a>A<style scoped>a { font-weight: bold }</style>B</a><b>C</b>"),
        )

    def test_script_dropped(self):
        """
        The contents of ``<script>`` tags does not appear in the text
        representation.
        """
        self.assertEqual(
            "ABC",
            html_to_text("A<script>bbbab</script>B<b>C</b>"),
        )

    def test_block_spaces(self):
        """
        Whitespace is injected between block-level tags as needed to separate
        them in the resulting text.
        """
        self.assertEqual(
            "a bc d",
            html_to_text("<p>a<p>b<span>c</span><div>d"),
        )

    def test_img_alt(self):
        """
        An ``<img>`` tag is replaced with its alt text, falling back to the
        🖼️ emoji when no alt text is present.
        """
        self.assertEqual("", html_to_text('<img alt="">'))
        self.assertEqual(":)", html_to_text('<img alt=":)">'))
        self.assertEqual("🖼️", html_to_text("<img>"))

    def test_strip_whitespace(self):
        """
        Any leading or trailing whitespace is removed.
        """
        for html in [
            (" hello, world\n"),
            ("hello, world\t\t "),
            ("<span> hello</span>, world "),
            ("hello, <b>world\n</b>"),
        ]:
            self.assertEqual("hello, world", html_to_text(html))


class SanitizeHtmlTests(unittest.TestCase):
    maxDiff = None

    def test_id_attr_dropped(self):
        """
        The ``id`` attribute is dropped as it might conflict with IDs used in
        Yarrharr's CSS, producing layout breakage.
        """
        self.assertEqual("<p>.", sanitize_html('<p id="top">.'))

    def test_class_attr_dropped(self):
        """
        The ``class`` attribute is dropped as it might conflict with classes
        used in Yarrharr's CSS, producing layout breakage.
        """
        self.assertEqual("<p>.", sanitize_html('<p class="float-right">.'))

    def test_style_attr_dropped(self):
        """
        The ``style`` attribute is dropped as it may conflict with Yarrharr's
        styles. In particular, it may assume a light or dark background color
        when setting text color, or contain ``float`` declarations.
        """
        self.assertEqual("<p>.", sanitize_html('<p style="float: left">.'))
        self.assertEqual(
            "<span>.</span>",
            sanitize_html('<span style="display:none">.</span>'),
        )

    def test_script_dropped(self):
        """
        The content of a ``<script>`` tag is dropped, silently. Sometimes feeds
        contain scripts by accident.
        """
        scripts = [
            '<p>Hello, world!<script>alert("!");</script>',
            "<p>Hello, <script></script>world!</p>",
            "<p><script>Hello</script>Hello, world!",
            "<p>Hello, <script>...<script>...</script></script>world!",
            '<p><style type="text/javascript"><script type="text/css"></style>Hello, world!',
        ]

        for s in scripts:
            self.assertEqual("<p>Hello, world!", sanitize_html(s))

    def test_style_tag_dropped(self):
        """
        The content of a ``<style>`` tag is dropped, silently. Sometimes feeds
        contain styles by accident.
        """
        self.assertEqual(
            "<p><b>Hello</b>, world!",
            sanitize_html('<p><b>Hello</b>, world<style type="text/css">b { color: red }</style>!'),
        )

    def test_object_replaced(self):
        """
        An ``<object>`` tag is replaced with its content, omitting any
        ``<param>`` tags as well.
        """
        html = '<object data="obsolete.swf" type="application/x-shockwave-flash">' '<param name="foo" value="bar">' "<p>Flash video</p>" "</object>"
        self.assertEqual("<p>Flash video", sanitize_html(html))

    def test_object_nest_replaced(self):
        """
        Nested ``<object>`` tags are recursively replaced with their content.
        """
        html = (
            "<p>"
            "<object>"
            '<param name="level" value="1">'
            "Level 1<br>"
            "<object>"
            '<param name="level" value="2">'
            "Level 2"
            "</object>"
            "</object>"
        )
        self.assertEqual("<p>Level 1<br>Level 2", sanitize_html(html))

    def test_link_tag_dropped(self):
        """
        ``<link>`` tags are dropped.
        """
        html = '<link type="stylesheet" href="..."><p>...'
        self.assertEqual("<p>...", sanitize_html(html))

    def test_meta_tag_dropped(self):
        """
        ``<meta>`` tags are dropped.
        """
        html = '<meta charset="utf-8"><p>...'
        self.assertEqual("<p>...", sanitize_html(html))

    def test_img_passes_through(self):
        """
        ``<img>`` tags are safe and pass right through.
        """
        html = '<img alt="" src="https://example.com/baz.png">'
        self.assertEqual(sanitize_html(html), html)

    def test_youtube_embed_replaced(self):
        """
        An ``<iframe>`` style embedded YouTube video is replaced by a thumbnail
        which links to the original video.
        """
        html = (
            "<p>"
            '<iframe allowfullscreen="allowfullscreen" frameborder="0" '
            ' height="315" src="http://www.youtube.com/embed/XsyogXtyU9o" '
            ' width="560"></iframe></p>'
        )
        self.assertEqual(
            (
                '<p><a href="https://www.youtube.com/watch?v=XsyogXtyU9o"'
                ' class=youtube-thumb rel="noopener noreferrer" target=_blank>'
                '<img alt="YouTube video" src="https://i.ytimg.com/vi/XsyogXtyU9o/mqdefault.jpg"'
                " width=320 height=180>" + VIDEO_ICON + "</a>"
            ),
            sanitize_html(html),
        )

    def test_youtube_nocookie_embed_replaced(self):
        """
        A "privacy-enhanced" YouTube embed, which uses the youtube-nocookie.com domain, is replaced with a link.
        """
        html = (
            '<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/Q0CbN8sfihY"' ' frameborder="0" allowfullscreen></iframe>'
        )
        self.assertEqual(
            (
                '<a href="https://www.youtube.com/watch?v=Q0CbN8sfihY"'
                ' class=youtube-thumb rel="noopener noreferrer" target=_blank>'
                '<img alt="YouTube video" src="https://i.ytimg.com/vi/Q0CbN8sfihY/mqdefault.jpg"'
                " width=320 height=180>" + VIDEO_ICON + "</a>"
            ),
            sanitize_html(html),
        )

    def test_youtube_embed_start_timecode_preserved(self):
        """
        A YouTube embed which links to a specific time in the video produces a link to that same time.
        """
        html = (
            '<iframe width="560" height="315" frameborder="0" allowfullscreen '
            ' src="https://www.youtube.com/embed/wZZ7oFKsKzY?rel=0&amp;showinfo=0&amp;start=3601"></iframe>'
        )
        self.assertEqual(
            (
                '<a href="https://www.youtube.com/watch?v=wZZ7oFKsKzY#t=3601s"'
                ' class=youtube-thumb rel="noopener noreferrer" target=_blank>'
                '<img alt="YouTube video" src="https://i.ytimg.com/vi/wZZ7oFKsKzY/mqdefault.jpg"'
                " width=320 height=180>" + VIDEO_ICON + "</a>"
            ),
            sanitize_html(html),
        )

    def test_youtube_embed_content_dropped(self):
        """
        Stuff inside a YouTube embed ``<iframe>`` tag is discarded.
        """
        html = (
            '<iframe allowfullscreen="allowfullscreen" frameborder="0" '
            ' height="315" src="http://www.youtube.com/embed/Q0CbN8sfihY" '
            ' width="560"><p>inside</iframe>after'
        )
        self.assertEqual(
            (
                '<a href="https://www.youtube.com/watch?v=Q0CbN8sfihY"'
                ' class=youtube-thumb rel="noopener noreferrer" target=_blank>'
                '<img alt="YouTube video" src="https://i.ytimg.com/vi/Q0CbN8sfihY/mqdefault.jpg"'
                " width=320 height=180>" + VIDEO_ICON + "</a>after"
            ),
            sanitize_html(html),
        )

    def test_youtube_embed_malencoded_param(self):
        """
        A mis-encoded ``src`` doesn't raise an exception.

        This reproduces https://github.com/twm/yarrharr/issues/619.
        """
        html = (
            "<p>"
            '<iframe allowfullscreen="allowfullscreen" frameborder="0" '
            ' height="315" src="https://www.youtube.com/embed/XsyogXtyU9o&amp;amp"'
            ' width="560"></iframe></p>'
        )
        self.assertEqual(
            (
                '<p><a href="https://www.youtube.com/watch?v=XsyogXtyU9o%26amp"'
                ' class=youtube-thumb rel="noopener noreferrer" target=_blank>'
                '<img alt="YouTube video" src="https://i.ytimg.com/vi/XsyogXtyU9o&amp;amp/mqdefault.jpg"'
                " width=320 height=180>" + VIDEO_ICON + "</a>"
            ),
            sanitize_html(html),
        )

    def test_img_title_to_aside(self):
        """
        As it is painful to view the "title text" of an image from
        a touchscreen device, inject the text as an ``<aside>`` element after
        the image.
        """
        html = '<img title="blah blah">'
        self.assertEqual('<img title="blah blah"><aside>blah blah</aside>', sanitize_html(html))

    def test_a_attrs(self):
        """
        ``<a>`` tags are given ``rel`` and ``target`` attributes.
        """
        html = '<a href="foo.html">bar</a>'
        self.assertEqual(
            '<a href=foo.html rel="noopener noreferrer" target=_blank>bar</a>',
            sanitize_html(html),
        )

    def test_video_controls(self):
        """
        ``<video>`` tags must have ``controls`` attribute, and must not have an
        ``autoplay`` attribute.
        """
        html = "<video autoplay />"
        self.assertEqual(
            "<video controls preload=metadata></video>",
            sanitize_html(html),
        )

    def test_wp_smiley_emoji(self):
        """
        ``<img class="wp-smiley">`` is replaced with its alt text when the alt
        text is an emoji.
        """
        self.assertEqual(
            "✨",
            sanitize_html('<img alt="✨" class="wp-smiley">'),
        )

    def test_wp_smiley_emoticon(self):
        """
        ``<img class="wp-smiley">`` which represents an emoticon (rather than
        an emoji) is left as-is.
        """
        self.assertEqual(
            sanitize_html('<img alt=";-)" class="wp-smiley">'),
            "<img alt=;-) class=wp-smiley>",
        )

    def test_wbr_allowed(self):
        """
        The ``<wbr>`` tag is allowed because it is awesome.
        """
        self.assertEqual(sanitize_html("<wbr>"), "<wbr>")

    def test_summary_allowed(self):
        """
        The ``<details><summary>...</summary></details>`` construct is
        permitted.
        """
        self.assertEqual(
            sanitize_html("<details><summary>.</summary>..."),
            "<details><summary>.</summary>...</details>",
        )


def print_tokens(html):
    tree = html5lib.parseFragment(html)
    w = html5lib.getTreeWalker("etree")
    print("Tokens for", html)
    for token in w(tree):
        pprint(token)
