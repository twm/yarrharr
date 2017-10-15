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

from __future__ import unicode_literals

import re
from collections import OrderedDict

import html5lib
from html5lib.constants import namespaces
from html5lib.filters.base import Filter as BaseFilter
from six.moves.urllib.parse import quote, quote_plus

STYLE_TAG = '{http://www.w3.org/1999/xhtml}style'
SCRIPT_TAG = '{http://www.w3.org/1999/xhtml}script'
OBJECT_TAG = '{http://www.w3.org/1999/xhtml}object'


def html_to_text(html):
    """
    Extract the text from the given HTML fragment.
    """
    tree = html5lib.parseFragment(html)
    bits = []

    def visit(el):
        if el.tag != STYLE_TAG and el.tag != SCRIPT_TAG:
            if el.text is not None:
                bits.append(el.text)
            for child in el:
                visit(child)
        if el.tail is not None:
            bits.append(el.tail)

    visit(tree)
    return u''.join(bits)


def sanitize_html(html):
    """
    Make the given HTML string safe to display in a Yarrharr page.
    """
    tree = html5lib.parseFragment(html)
    w = html5lib.getTreeWalker('etree')
    s = html5lib.serializer.HTMLSerializer(sanitize=True)
    return s.render(_ReplaceYoutubeEmbedFilter(_ElideFilter(_ReplaceObjectFilter(w(tree)))))


class _ElideFilter(BaseFilter):
    """
    ``<script>`` and ``<style>`` tags are dropped entirely, including their
    content.
    """
    _elide_tags = frozenset((
        (namespaces['html'], 'script'),
        (namespaces['html'], 'style'),
    ))

    def __iter__(self):
        elide = 0
        elide_ns = None
        elide_name = None
        for token in BaseFilter.__iter__(self):
            token_type = token['type']
            if elide:
                if token_type == 'EndTag' and token['name'] == elide_name and token['namespace'] == elide_ns:
                    elide -= 1
                if token_type == 'StartTag' and token['name'] == elide_name and token['namespace'] == elide_ns:
                    elide += 1
                continue  # Drop the token
            else:
                if token_type == 'StartTag':
                    if (token['namespace'], token['name']) in self._elide_tags:
                        elide += 1
                        elide_name = token['name']
                        elide_ns = token['namespace']
                        continue  # Drop this token.
                yield token


class _ReplaceObjectFilter(BaseFilter):
    """
    ``<object>`` tags are replaced with their content.
    """
    def __iter__(self):
        html_ns = namespaces['html']
        nest = 0
        for token in BaseFilter.__iter__(self):
            token_type = token['type']
            # Drop <param> when inside <object>. We don't handle nesting
            # properly, but they're not valid anywhere else so that's not
            # a problem.
            if nest >= 1 and token_type == 'EmptyTag' and token['name'] == 'param' and token['namespace'] == html_ns:
                continue

            if token_type == 'EndTag' and token['name'] == 'object' and token['namespace'] == html_ns:
                nest -= 1
                continue

            if token_type == 'StartTag' and token['name'] == 'object' and token['namespace'] == html_ns:
                nest += 1
                continue

            yield token


class _ReplaceYoutubeEmbedFilter(BaseFilter):
    """
    YouTube embeds are replaced with a thumbnail which links to the original video.
    """
    _embed_url_pattern = re.compile(r'https?://(www\.)?youtube\.com/embed/(?P<video_id>[^/?#]+)', re.I)
    _video_url = 'https://www.youtube.com/watch?v={video_id}'
    # There are a few apparent options for the filename in this URL:
    #
    # default.jpg — always seems to be available, even on old videos, but is tiny (120×90).
    #
    # mqdefault.jpg — always seems to be available, and has a more contemporary
    # aspect ratio (320×180).
    #
    # hqdefault.jpg — always seems to be available (though I haven't tested
    # videos more than 5 years old), but it is always 4:3 (480×360), so recent
    # videos are letterboxed.
    #
    # maxresdefault.jpg — only recent videos seem to have this (e.g., all of
    # the videos I've checked on the YouTube homepage as of October 2017 do).
    #
    # An old video which lacks maxresdefault.jpg: https://www.youtube.com/watch?v=XPIFncE22pw
    # A recent video from the homepage which has all of them: https://www.youtube.com/watch?v=R1ZXOOLMJ8s
    #
    # See also https://boingboing.net/features/getthumbs.html
    _thumbnail_url = 'https://i.ytimg.com/vi/{video_id}/mqdefault.jpg'

    def __iter__(self, _SRC_ATTR=(None, 'src')):
        html_ns = namespaces['html']
        elide = 0
        for token in BaseFilter.__iter__(self):
            token_type = token['type']
            if elide:
                if token_type == 'StartTag' and token['name'] == 'iframe':
                    elide += 1
                elif token_type == 'EndTag' and token['name'] == 'iframe':
                    elide -= 1
            else:
                if (
                    token_type == 'StartTag' and
                    token['name'] == 'iframe' and
                    token['namespace'] == html_ns and
                    'data' in token and
                    _SRC_ATTR in token['data']
                ):
                    m = self._embed_url_pattern.match(token['data'][_SRC_ATTR])
                    if m:
                        video_id = m.group('video_id')
                        yield {
                            'type': 'StartTag',
                            'namespace': html_ns,
                            'name': 'a',
                            'data': OrderedDict([
                                ((None, 'href'), self._video_url.format(video_id=quote_plus(video_id))),
                                ((None, 'target'), '_blank'),
                            ]),
                        }
                        yield {
                            'type': 'EmptyTag',
                            'namespace': html_ns,
                            'name': u'img',
                            'data': OrderedDict([
                                ((None, 'alt'), 'YouTube video'),
                                (_SRC_ATTR, self._thumbnail_url.format(video_id=quote(video_id))),
                                ((None, 'width'), '320'),
                                ((None, 'height'), '180'),
                            ]),
                        }
                        yield {
                            'type': 'EndTag',
                            'namespace': html_ns,
                            'name': 'a',
                        }
                        elide += 1
                    else:
                        yield token
                else:
                    yield token
