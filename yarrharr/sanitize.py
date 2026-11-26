# Copyright © 2017, 2018, 2019, 2020, 2022, 2025, 2026 Tom Most <twm@freecog.net>
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

import re
import warnings
from io import StringIO
from typing import Any, Iterator, assert_never

import attrs
import html5lib
from html5lib.constants import namespaces, voidElements
from html5lib.filters import sanitizer
from html5lib.filters.base import Filter as BaseFilter
from hyperlink import DecodedURL, EncodedURL

REVISION = 13

# Local patch implementing https://github.com/html5lib/html5lib-python/pull/395
# since html5lib-python is unmaintained. This pairs with allowing <wbr> in the
# sanitizer in sanitize_html() below.
if "wbr" in voidElements:
    warnings.warn("html5lib now supports <wbr>: remove the monkeypatch")  # noqa
else:
    voidElements |= frozenset(["wbr"])
    import html5lib.treewalkers.base

    html5lib.constants.voidElements = voidElements
    html5lib.serializer.voidElements = voidElements
    html5lib.treewalkers.base.voidElements = voidElements


def html_tag(tag: str) -> str:
    return "{http://www.w3.org/1999/xhtml}" + tag


_IMG_TAG = html_tag("img")
_VIDEO_TAG = html_tag("video")
_FIGURE_TAG = html_tag("figure")
_ASIDE_TAG = html_tag("aside")
_DROP_TAGS = frozenset(
    [
        html_tag("datalist"),
        html_tag("object"),
        html_tag("script"),
        html_tag("style"),
        html_tag("template"),
    ]
)

_NO_WHITESPACE_TAGS = (
    frozenset(
        [
            html_tag("a"),
            html_tag("abbr"),
            html_tag("b"),
            html_tag("bdo"),
            html_tag("cite"),
            html_tag("code"),
            html_tag("datalist"),
            html_tag("del"),
            html_tag("em"),
            html_tag("i"),
            html_tag("img"),
            html_tag("ins"),
            html_tag("kbd"),
            html_tag("label"),
            html_tag("link"),
            html_tag("mark"),
            html_tag("math"),
            html_tag("meta"),
            html_tag("meter"),
            html_tag("noscript"),
            html_tag("picture"),
            html_tag("q"),
            html_tag("ruby"),
            html_tag("samp"),
            html_tag("small"),
            html_tag("span"),
            html_tag("strong"),
            html_tag("sub"),
            html_tag("sup"),
            html_tag("time"),
            html_tag("var"),
            html_tag("wbr"),
        ]
    )
    | _DROP_TAGS
)

_WHITESPACE_RE = re.compile(r"[ \t\r\n]{2,}", re.U)


def html_to_text(html: str) -> str:
    """
    Convert HTML to representative text.

    All HTML tags are dropped. The content of non-visible tags like
    ``<script>`` and ``<style>`` tags is dropped. Other elements are replaced
    by their textual content. A single space is injected between `non-phrasing
    content <https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content>`_.

    Whitespace is normalized to approximate what CSS's ``white-space: normal``
    `would do on display <https://www.w3.org/TR/CSS2/text.html#white-space-model>`_
    to minimize the size of the resulting string.  Leading and trailing
    whitespace is dropped.

    :param str html: HTML string
    :returns: Plain text
    """
    tree = html5lib.parseFragment(html)
    buf = StringIO()

    def visit(el):
        needs_ws = el.tag not in _NO_WHITESPACE_TAGS
        if el.tag == _IMG_TAG:
            buf.write(el.get("alt", "🖼️"))
        elif el.tag == _FIGURE_TAG:
            buf.write(" 🖼️ ")
        elif el.tag == _VIDEO_TAG:
            buf.write(" 🎥 ")
        elif el.tag == _ASIDE_TAG and el.get("class", "") == "title-text":
            pass
        elif el.tag not in _DROP_TAGS:
            if el.text is not None:
                if needs_ws:
                    buf.write(" ")
                buf.write(el.text)
            for child in el:
                visit(child)

        if el.tail is not None:
            if needs_ws:
                buf.write(" ")
            buf.write(el.tail)

    visit(tree)
    return _WHITESPACE_RE.sub(" ", buf.getvalue()).strip()


@attrs.define(slots=True)
class Doctype:
    """``<!DOCTYPE>`` declaration"""

    name: str | None
    public_id: str | None
    system_id: str | None


@attrs.define(slots=True)
class StartTag:
    """
    Start of a non-empty element

    :ivar data: Attributes
    """

    namespace: str | None
    name: str
    attrs: dict[(str | None, str), str]


@attrs.define(slots=True)
class EndTag:
    """Marks the end of a non-empty element"""

    namespace: str | None
    name: str


@attrs.define(slots=True)
class EmptyTag:
    """
    An empty element like ``<img />``

    :ivar data: Attributes
    """

    namespace: str | None
    name: str
    attrs: dict[(str | None, str), str]


@attrs.define(slots=True)
class Characters:
    """Non-whitespace character data"""

    cdata: str


@attrs.define(slots=True)
class SpaceCharacters:
    """Whitespace character data"""

    cdata: str


@attrs.define(slots=True)
class Comment:
    text: str


type WalkToken = Doctype | StartTag | EndTag | EmptyTag | Characters | SpaceCharacters | Comment


def to_walk_tokens(source: Iterator[dict[Any, Any]]) -> Iterator[WalkToken]:
    """
    Convert d dict-style html5lib TreeWalker token stream to
    one of `WalkToken` types.
    """
    for token in source:
        match token:
            case {"type": "StartTag", "namespace": namespace, "name": name, "data": attrs}:
                yield StartTag(namespace, name, attrs)
            case {"type": "EndTag", "namespace": namespace, "name": name}:
                yield EndTag(namespace, name)
            case {"type": "EmptyTag", "namespace": namespace, "name": name, "data": attrs}:
                yield EmptyTag(namespace, name, attrs)
            case {"type": "Characters", "data": cdata}:
                yield Characters(cdata)
            case {"type": "SpaceCharacters", "data": cdata}:
                yield SpaceCharacters(cdata)
            case {"type": "Comment", "data": text}:
                yield Comment(text)
            case {"type": "Doctype", "name": name, "publicId": public_id, "systemId": system_id}:
                yield Doctype(name, public_id, system_id)
            case _:
                raise NotImplementedError(f"Unhandled token: {token!r}")


def to_dicts(source: Iterator[WalkToken]) -> Iterator[dict[object, object]]:
    """
    Convert a `WalkToken` stream into dict-style TreeWalker tokens.
    """
    for token in source:
        match token:
            case StartTag(namespace, name, attrs):
                yield {"type": "StartTag", "namespace": namespace, "name": name, "data": attrs}
            case EndTag(namespace, name):
                yield {"type": "EndTag", "namespace": namespace, "name": name}
            case EmptyTag(ns, name, attrs):
                yield {"type": "EmptyTag", "namespace": ns, "name": name, "data": attrs}
            case Characters(cdata):
                yield {"type": "Characters", "data": cdata}
            case SpaceCharacters(cdata):
                yield {"type": "SpaceCharacters", "data": cdata}
            case Comment(text):
                yield {"type": "Comment", "data": text}
            case Doctype(name, public_id, system_id):
                yield {"type": "Doctype", "name": name, "publicId": public_id, "systemId": system_id}
            case _:
                assert_never()


def sanitize_html(html: str) -> str:
    """
    Make the given HTML string safe to display in a Yarrharr page.
    """
    tree = html5lib.parseFragment(html)
    serializer = html5lib.serializer.HTMLSerializer()
    source = html5lib.getTreeWalker("etree")(tree)
    source = to_walk_tokens(source)
    source = _strip_attrs(source)
    source = _drop_empty_tags(source)
    source = _replace_objects(source)
    source = _elide(source)
    source = to_dicts(source)
    source = _ReplaceYoutubeEmbedFilter(source)
    source = to_walk_tokens(source)
    source = _extract_title_text(source)
    source = _adjust_srcset(source)
    source = _adjust_links(source)
    source = to_dicts(source)
    source = _video_attrs(source)
    source = _wp_smileys(source)
    source = sanitizer.Filter(
        source,
        allowed_elements=sanitizer.allowed_elements
        | frozenset(
            [
                (namespaces["html"], "picture"),
                (namespaces["html"], "source"),
                (
                    namespaces["html"],
                    "summary",
                ),  # https://github.com/html5lib/html5lib-python/pull/423
                (
                    namespaces["html"],
                    "wbr",
                ),  # https://github.com/html5lib/html5lib-python/pull/395
            ]
        ),
        allowed_attributes=sanitizer.allowed_attributes
        | frozenset(
            [
                (None, "srcset"),
                (None, "media"),  # <source media>
            ]
        ),
    )
    return serializer.render(source)


def _strip_attrs(source):
    """
    Strip id, style, and class attributes as they may break the layout.
    """
    for token in source:
        match token:
            # FIXME #1463: This should also handle EmptyTag
            case StartTag():
                attrs = token.attrs
                attrs.pop((None, "id"), None)
                attrs.pop((None, "class"), None)
                attrs.pop((None, "style"), None)
        yield token


def _drop_empty_tags(source):
    """
    Drop certain empty tags:

      * ``<meta>``
      * ``<link>``
    """
    tags = frozenset(
        (
            (namespaces["html"], "meta"),
            (namespaces["html"], "link"),
        )
    )

    for token in source:
        match token:
            case EmptyTag(namespace, name):
                if (namespace, name) in tags:
                    continue
        yield token


def _elide(source):
    """
    Some tags are dropped entirely, including their content:

      * ``<script>``
      * ``<style>``
      * ``<template>``
    """

    _elide_tags = frozenset(
        (
            (namespaces["html"], "script"),
            (namespaces["html"], "style"),
            (namespaces["html"], "template"),
        )
    )

    elide = 0
    elide_ns = None
    elide_name = None
    for token in source:
        if elide:
            match token:
                case EndTag(namespace, name) if name == elide_name and namespace == elide_ns:
                    elide -= 1
                case StartTag(namespace, name) if name == elide_name and namespace == elide_ns:
                    elide += 1
            continue  # Drop the token
        else:
            match token:
                case StartTag(namespace, name):
                    if (namespace, name) in _elide_tags:
                        elide += 1
                        elide_name = name
                        elide_ns = namespace
                        continue  # Drop this token.
            yield token


def _replace_objects(source):
    """
    ``<object>`` tags are replaced with their content.
    """

    html_ns = namespaces["html"]
    nest = 0
    for token in source:
        # Drop <param> when inside <object>. We don't handle nesting
        # properly, but they're not valid anywhere else so that's not
        # a problem.
        match token:
            case EmptyTag(namespace, name="param") if nest >= 1 and namespace == html_ns:
                continue

            case EndTag(namespace, name="object") if namespace == html_ns:
                nest -= 1
                continue

            case StartTag(namespace, name="object") if namespace == html_ns:
                nest += 1
                continue

        yield token


class _ReplaceYoutubeEmbedFilter(BaseFilter):
    """
    YouTube embeds are replaced with a thumbnail which links to the original video.
    """

    def _watch_url(self, embed_url) -> DecodedURL:
        """
        Generate the URL of the YouTube page at which the embedded video can be
        viewed.
        """
        video_id = embed_url.path[1]
        watch_url = DecodedURL(
            EncodedURL(scheme="https", host="www.youtube.com", path=("watch",)),
        ).add("v", video_id)
        try:
            [start] = embed_url.get("start")
        except (KeyError, ValueError):
            return watch_url
        if not start.isdigit():
            return watch_url  # Ignore an invalid second offset.
        return watch_url.replace(fragment=f"t={start}s")

    def _thumbnail_url(self, embed_url) -> DecodedURL:
        """
        Generate the URL of the thumbnail for a YouTube video embed.

        There are a few apparent options for the filename in this URL:

        default.jpg — always seems to be available, even on old videos, but is tiny (120×90).

        mqdefault.jpg — always seems to be available, and has a more contemporary
        aspect ratio (320×180). This is what this function returns.

        hqdefault.jpg — always seems to be available (though I haven't tested
        videos more than 5 years old), but it is always 4:3 (480×360), so recent
        videos are letterboxed.

        maxresdefault.jpg — only recent videos seem to have this (e.g., all of
        the videos I've checked on the YouTube homepage as of October 2017 do).

        An old video which lacks maxresdefault.jpg: https://www.youtube.com/watch?v=XPIFncE22pw
        A recent video from the homepage which has all of them: https://www.youtube.com/watch?v=R1ZXOOLMJ8s

        See also https://boingboing.net/features/getthumbs.html
        """
        video_id = embed_url.path[1]
        return DecodedURL(
            EncodedURL(
                scheme="https",
                host="i.ytimg.com",
                path=("vi", video_id, "mqdefault.jpg"),
            ),
        )

    def __iter__(
        self,
        _SRC_ATTR=(None, "src"),
        _youtube_hosts=(
            "youtube.com",
            "www.youtube.com",
            "youtube-nocookie.com",
            "www.youtube-nocookie.com",
        ),
    ):
        html_ns = namespaces["html"]
        svg_ns = namespaces["svg"]
        xlink_ns = namespaces["xlink"]
        elide = False
        for token in BaseFilter.__iter__(self):
            token_type = token["type"]
            if elide:
                # NOTE html5lib doesn't permit nesting <iframe> tags,
                # (presumably because HTML5 doesn't permit it). Therefore we
                # don't need to deal with that case here, just wait for the
                # first end tag.
                if token_type == "EndTag" and token["name"] == "iframe":
                    elide = False
            else:
                if (
                    token_type == "StartTag"
                    and token["name"] == "iframe"
                    and token["namespace"] == html_ns
                    and "data" in token
                    and _SRC_ATTR in token["data"]
                ):
                    url = DecodedURL.from_text(token["data"][_SRC_ATTR])
                    if url.absolute and url.host in _youtube_hosts and len(url.path) == 2 and url.path[0] == "embed":
                        yield {
                            "type": "StartTag",
                            "namespace": html_ns,
                            "name": "a",
                            "data": {
                                (None, "href"): self._watch_url(url).to_text(),
                                (None, "class"): "youtube-thumb",
                            },
                        }
                        yield {
                            "type": "EmptyTag",
                            "namespace": html_ns,
                            "name": "img",
                            "data": {
                                (None, "alt"): "YouTube video",
                                _SRC_ATTR: self._thumbnail_url(url).to_text(),
                                (None, "width"): "320",
                                (None, "height"): "180",
                            },
                        }
                        # <svg width="1em" height="1em" class="icon" aria-hidden="false"><use xlink:href="#icon-video" /></svg>
                        yield {
                            "type": "StartTag",
                            "namespace": svg_ns,
                            "name": "svg",
                            "data": {
                                (None, "width"): "1em",
                                (None, "height"): "1em",
                                (None, "class"): "icon",
                                (None, "aria-hidden"): "true",
                            },
                        }
                        # html5lib tokenizes a self-closing <use /> like this
                        yield {
                            "type": "StartTag",
                            "namespace": svg_ns,
                            "name": "use",
                            "data": {(xlink_ns, "href"): "#icon-video"},
                        }
                        yield {
                            "type": "EndTag",
                            "namespace": svg_ns,
                            "name": "use",
                        }
                        yield {
                            "type": "EndTag",
                            "namespace": svg_ns,
                            "name": "svg",
                        }
                        yield {
                            "type": "EndTag",
                            "namespace": html_ns,
                            "name": "a",
                        }
                        elide = True
                    else:
                        yield token
                else:
                    yield token


def _extract_title_text(source: Iterator[WalkToken]):
    """
    ``<img title="...">`` becomes ``<img><aside class="title-text">...</aside>``
    """

    html_ns = namespaces["html"]
    _title_attr = (None, "title")
    for token in source:
        yield token
        match token:
            case EmptyTag(namespace, name="img") if namespace == html_ns:
                if title := token.attrs.get(_title_attr):
                    yield StartTag(
                        namespace=html_ns,
                        name="aside",
                        attrs={(None, "class"): "title-text"},
                    )
                    yield Characters(title)
                    yield EndTag(html_ns, "aside")


def _adjust_srcset(source):
    """
    Reject a ``srcset`` attribute contaning a width descriptor like
    ``<img srcset="/foo.png 100w">``.
    """
    html_ns = namespaces["html"]
    srcset_attr = (None, "srcset")
    for token in source:
        match token:
            case EmptyTag(namespace, name="img") if namespace == html_ns:
                if srcset := token.attrs.get(srcset_attr):
                    for url, desc in srcset_candidates(srcset):
                        if desc.endswith("w"):
                            del token.attrs[srcset_attr]
                            break
        yield token


def _adjust_links(source):
    html_ns = namespaces["html"]
    href_attr = (None, "href")
    rel_attr = (None, "rel")
    target_attr = (None, "target")
    for token in source:
        match token:
            case StartTag(namespace, name="a") if namespace == html_ns:
                if href_attr in token.attrs:
                    token.attrs[rel_attr] = "noopener noreferrer"
                    token.attrs[target_attr] = "_blank"
        yield token


def _video_attrs(source):
    html_ns = namespaces["html"]
    controls_attr = (None, "controls")
    autoplay_attr = (None, "autoplay")
    preload_attr = (None, "preload")
    for token in source:
        if token["type"] == "StartTag" and token["name"] == "video" and token["namespace"] == html_ns:
            token["data"][controls_attr] = "controls"
            token["data"][preload_attr] = "metadata"
            token["data"].pop(autoplay_attr, None)
        yield token


def _wp_smileys(source):
    """
    Replace emoji which WordPress has turned into images into the textual
    equivalent.

    See <https://codex.wordpress.org/Using_Smilies> for more on WordPress smilies.
    """
    html_ns = namespaces["html"]
    class_attr = (None, "class")
    alt_attr = (None, "alt")
    for token in source:
        if (
            token["type"] == "EmptyTag"
            and token["name"] == "img"
            and token["namespace"] == html_ns
            and token["data"].get(class_attr) == "wp-smiley"
            and alt_attr in token["data"]
        ):
            alt = token["data"][alt_attr]
            try:
                alt.encode("ascii")
            except UnicodeEncodeError:
                # Smells like Emoji.
                yield {"type": "Characters", "data": alt}
            else:
                # Emoticon
                yield token
        else:
            yield token


# Matches image candidate strings within a srcset attribute value as
# described in https://html.spec.whatwg.org/multipage/images.html#srcset-attributes
_srcset_candidate = re.compile(
    r"""
    # ASCII whitespace: https://infra.spec.whatwg.org/#ascii-whitespace
    [\t\n\f\r ]*
    (
        # URL that doesn't start or end with a comma
        (?!,)
        [^\t\n\f\r ]+
        (?<!,)
    )
    (
        # Width descriptor like "1234w"
        # https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#non-negative-integers
        [\t\n\f\r ]+
        \d+w
        |
        # Pixel density descriptor like "2.0x"
        # https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#valid-floating-point-number
        [\t\n\f\r ]+
        \d+(?:\.\d+)?(?:[eE][-+]?\d+)?x
        |
    )
    [\t\n\f\r ]*
    (?:,|\Z)
    """,
    re.VERBOSE | re.ASCII,
)


def srcset_candidates(value: str) -> list[tuple[str, str]]:
    """
    Split a ``srcset`` attribute value into candidates:

    >>> srcset_candidates("/foo.jpg, /foo.2x.jpg 2x")
    [("/foo.jpg", ""), ("/foo.2x.jpg", "2x")]

    This doesn't validate the URLs, nor check for duplicate or conflicting
    descriptors. It returns an empty list when parsing fails.
    """
    pos = 0
    candidates = []
    while m := _srcset_candidate.match(value, pos):
        desc = m[2].strip("\t\n\f\r ")
        candidates.append((m[1], desc))
        pos = m.end(0)
    return candidates
