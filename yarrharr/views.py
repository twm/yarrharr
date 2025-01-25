# Copyright © 2013–2026 Tom Most <twm@freecog.net>
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

import json

import django
import feedparser
from django.contrib.auth.decorators import login_required
from django.db import connection
from django.db.models import Count, F, Q, Sum
from django.forms import CharField, ModelForm, ModelMultipleChoiceField, URLField, URLInput, ValidationError
from django.http import Http404, HttpResponse, HttpResponseNotAllowed, HttpResponseRedirect
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from twisted.logger import Logger

import yarrharr

from .enums import ArticleFilter
from .models import AllViewOptions, Article, Feed, Label, Sort
from .signals import schedule_changed
from .sql import log_on_error

log = Logger()


PAGE_SIZE = 500

#: An example of the format accepted by Django's DurationField.
DURATION_PLACEHOLDER = "DD HH:MM:SS"


def human_sort_key(s):
    """
    Generate a sort key given a string. The sort key is guaranteed to have
    a few properties:

    * It is case insensitive.
    * It discards non-alphanumeric characters.

    :param str s: A human-readable string
    :returns:
        A case-normalized version of `s` less non-alphanumeric characters.
    """
    return "".join(c for c in s.casefold() if c.isalnum() or c.isspace())


def entries_for_snapshot(user, params):
    """
    Return a queryset containing entries which match the given params.
    """
    qs = Article.objects.filter(feed__id__in=params["feeds"]).filter(feed__in=user.feed_set.all())

    if params["filter"] == "unread":
        filt = Q(read=False)
    elif params["filter"] == "fave":
        filt = Q(fave=True)
    else:
        filt = None

    # The include param allows inclusion of a single article which would
    # otherwise be filtered out.  This is so that the page can be reloaded
    # after the state is changed without getting a 404.
    if filt is not None and params["include"] is not None:
        filt |= Q(id=params["include"])

    if filt is not None:
        qs = qs.filter(filt)

    if params["order"] == "date":
        qs = qs.order_by("date")
    else:
        qs = qs.order_by("-date")

    return qs


def snapshot_params_from_query(query_dict, user_feeds):
    """
    Extract snapshot parameters from the querystring, being somewhat paranoid
    about ensuring valid values.

    :param query_dict: A :class:`django.http.QueryDict` from ``request.GET``
    :param user_feeds: List of the feed IDs for the authenticated user
    """
    try:
        feeds = set()
        for value in query_dict.getlist("feeds"):
            if value == "all":
                feeds.update(user_feeds)
            else:
                id = int(value)
                if id in user_feeds:
                    feeds.add(id)
    except (KeyError, ValueError):
        feeds = user_feeds

    def oneof(key, values):
        value = query_dict.get(key)
        if value in values:
            return value
        return values[0]

    try:
        include = int(query_dict["include"])
    except (KeyError, ValueError):
        include = None

    return {
        "feeds": sorted(feeds),
        "filter": oneof("filter", ["unread", "fave", "all"]),
        "order": oneof("order", ["date", "tail"]),
        "view": oneof("view", ["text", "list"]),
        "include": include,
    }


def sort_and_filter_articles(qs, viewoptions, filt: ArticleFilter, after=None):
    if after is not None:
        # FIXME: What we really want is to filter on (date, id) >=
        # (after_article.date, after_article.id), but I haven't figured out how
        # to express that in the Django ORM. Filtering only by date will work
        # well enough in the usual case that articles don't have duplicate
        # dates, but if a series of articles with identical dates fall at the
        # page boundry it can skip past some.
        after_date = qs.get(pk=after).date
    else:
        after_date = None

    if viewoptions.sort == Sort.ASC:
        qs = qs.order_by("date", "id")
        if after_date is not None:
            qs = qs.filter(date__gt=after_date)
    elif viewoptions.sort == Sort.DESC:
        qs = qs.order_by("-date", "-id")
        if after_date is not None:
            qs = qs.filter(date__lt=after_date)
    else:
        assert 0

    if filt is ArticleFilter.unread:
        qs = qs.filter(read=False)
    elif filt is ArticleFilter.fave:
        qs = qs.filter(fave=True)
    else:
        assert filt is ArticleFilter.all

    articles = list(qs.prefetch_related("feed")[: PAGE_SIZE + 1])
    if len(articles) > PAGE_SIZE:
        articles.pop()
        after = articles[-1].pk
    else:
        after = None
    return articles, after


@login_required
def home(request):
    """
    Display the homepage
    """
    return render(
        request,
        "home.html",
        {
            "feeds": request.user.feed_set.all(),
            "labels": request.user.label_set.all(),
        },
    )


@login_required
def all_show(request, filter: ArticleFilter):
    """
    List the all articles
    """
    viewoptions, _ = AllViewOptions.objects.get_or_create(user=request.user)
    articles, next_page_after = sort_and_filter_articles(
        Article.objects.filter(feed__id__in=request.user.feed_set.all()),
        viewoptions,
        filter,
        after=request.GET.get("after"),
    )
    counts = request.user.feed_set.aggregate(
        all_unread_count=Sum("unread_count"),
        all_fave_count=Sum("fave_count"),
    )

    return render(
        request,
        "all_show.html",
        {
            "articles": articles,
            "next_page_after": next_page_after,
            "filter": filter,
            **counts,
            "tabs_selected": {f"all-{filter.name}"},
        },
    )


@login_required
def redirect_to_feed_list(request):
    """
    Redirect the URL of the feed list prior to the introduction of views
    to the new location.
    """
    return HttpResponseRedirect(reverse("feed-list", args=["updated"]))


@login_required
def feed_list(request, view):
    """
    Display a list of known feeds
    """
    q = request.user.feed_set.all()
    checked_q = q.filter(checked=True)
    error_q = checked_q.exclude(error="")
    redirect_q = checked_q.exclude(content_location__isnull=True).exclude(url=F("content_location"))
    http_q = checked_q.filter(url__istartswith="http://")

    if view == "updated":
        q = checked_q.order_by("-last_updated")

    elif view == "az":
        q = sorted(
            checked_q,
            # XXX It would be nice to do this sorting in the database, but sqlite3 does
            # not ship with appropriate collations. Custom collations can be installed,
            # but there isn't much advantage to doing so right now given we always
            # query all feeds anyway.
            key=lambda feed: (human_sort_key(feed.title), feed.pk),
        )

    elif view == "error":
        q = error_q.order_by("-last_checked")

    elif view == "redirect":
        q = redirect_q.order_by("-last_updated")

    elif view == "http":
        q = http_q.order_by("-last_updated")

    elif view == "archived":
        q = q.filter(checked=False).order_by("-last_checked")

    else:
        raise Http404()

    return render(
        request,
        "feed_list.html",
        {
            "view": view,
            "feeds": q,
            "error_count": error_q.count(),
            "redirect_count": redirect_q.count(),
            "http_count": http_q.count(),
            "tabs_selected": {f"view-{view}"},
        },
    )


@login_required
def feed_show(request, feed_id: int, filter: ArticleFilter):
    """
    List the articles in a feed
    """
    feed = get_object_or_404(request.user.feed_set, pk=feed_id)
    articles, next_page_after = sort_and_filter_articles(
        feed.articles.all(),
        feed,
        filter,
        after=request.GET.get("after"),
    )

    return render(
        request,
        "feed_show.html",
        {
            "feed": feed,
            "articles": articles,
            "next_page_after": next_page_after,
            "filter": filter,
            "tabs_selected": {f"feed-{filter.name}"},
            # Only show the author if there is more than one author.
            "hide_author": len({a.author for a in articles}) <= 1,
            "hide_feed_title": True,
        },
    )


class FeedForm(ModelForm):
    """
    Edit a user's feed.

    The *instance* argument must always be given a `Form` instance,
    which must have an assigned user.
    """

    class Meta:
        model = Feed
        fields = [
            "user_title",
            "url",
            "checked",
            "label_set",
            "min_check_interval",
            "max_check_interval",
        ]

    user_title = CharField(required=False, max_length=200, label="Title override")
    label_set = ModelMultipleChoiceField(queryset=None, required=False, label="Labels")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        assert self.instance.pk, "instance argument must be a saved Feed instance"
        assert self.instance.user, "instance argument must be a Feed instance with a user"
        self.fields["label_set"].queryset = self.instance.user.label_set.all()
        self.fields["label_set"].widget.attrs["size"] = self.instance.user.label_set.count()
        self.fields["user_title"].widget.attrs["placeholder"] = self.instance.feed_title or ""
        self.fields["min_check_interval"].widget.attrs["placeholder"] = DURATION_PLACEHOLDER
        self.fields["max_check_interval"].widget.attrs["placeholder"] = DURATION_PLACEHOLDER
        self.initial["label_set"] = self.instance.label_set.all()

    def clean(self):
        cleaned_data = super().clean()
        if {"url", "checked"}.intersection(self.changed_data):
            # Immediately re-check.
            self.instance.next_check = timezone.now()
        elif {"min_check_interval", "max_check_interval"}.intersection(self.changed_data):
            # The feed will be re-scheduled on the next poll.
            self.instance.next_check = None
        self.instance.label_set.set(cleaned_data["label_set"])
        return cleaned_data


@login_required
def feed_edit(request, feed_id: int):
    """
    Edit a feed.
    """
    feed = get_object_or_404(request.user.feed_set, pk=feed_id)
    if request.method == "POST":
        form = FeedForm(request.POST, instance=feed)
        if form.is_valid():
            form.save()
            schedule_changed.send(None)
            return HttpResponseRedirect(
                reverse("feed-edit", kwargs={"feed_id": feed.pk}),
            )
    elif request.method == "GET":
        form = FeedForm(instance=feed)
    return render(
        request,
        "feed_edit.html",
        {
            "feed": feed,
            "form": form,
            "tabs_selected": {"feed-edit"},
        },
    )


class FeedAddForm(ModelForm):
    """
    Create a feed
    """

    url = URLField(
        label="Feed URL",
        widget=URLInput(attrs={"autofocus": "autofocus"}),
    )

    class Meta:
        model = Feed
        fields = ["url"]


@login_required
def feed_add(request):
    """
    Add a new feed.
    """
    feed = Feed(user=request.user)
    if request.method == "POST":
        form = FeedAddForm(request.POST, instance=feed)
        if form.is_valid():
            feed = form.save(commit=False)
            feed.added = timezone.now()
            feed.next_check = timezone.now()
            feed.save()
            schedule_changed.send(None)
            return HttpResponseRedirect(
                reverse(
                    "feed-edit",
                    kwargs={"feed_id": feed.pk},
                ),
            )
    elif request.method != "GET":
        return HttpResponseNotAllowed(["GET", "POST"])
    else:
        form = FeedAddForm(instance=feed)
    return render(
        request,
        "feed_add.html",
        {
            "form": form,
            "tabs_selected": {},
        },
    )


@login_required
def label_list(request):
    """
    Display a list of labels
    """
    labels = request.user.label_set.all().annotate(
        feed_count=Count("feeds"),
        # TODO: Verify these give the correct results.
        unread_count=Sum("feeds__unread_count"),
        fave_count=Sum("feeds__fave_count"),
    )
    return render(
        request,
        "label_list.html",
        {
            "labels": sorted(
                labels,
                # XXX It would be nice to do this sorting in the database, but sqlite3 does
                # not ship with appropriate collations. Custom collations can be installed,
                # but there isn't much advantage to doing so right now given we always
                # query all feeds anyway.
                key=lambda label: (human_sort_key(label.text), label.pk),
            ),
        },
    )


@login_required
def label_show(request, label_id: int, filter: ArticleFilter):
    """
    List the articles in a feed.
    """
    label = get_object_or_404(request.user.label_set, pk=label_id)
    counts = label.feeds.aggregate(
        label_unread_count=Sum("unread_count"),
        label_fave_count=Sum("fave_count"),
    )
    articles, next_page_after = sort_and_filter_articles(
        Article.objects.filter(feed__id__in=label.feeds.all()),
        label,
        filter,
        after=request.GET.get("after"),
    )

    return render(
        request,
        "label_show.html",
        {
            "label": label,
            **counts,
            "articles": articles,
            "next_page_after": next_page_after,
            "filter": filter,
            "tabs_selected": {f"label-{filter.name}"},
        },
    )


class LabelForm(ModelForm):
    """
    Create a label for a user.
    """

    class Meta:
        model = Label
        fields = ["text", "feeds"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        assert self.instance.user, "instance argument must be a Label instance with a user"

    def clean_text(self):
        """
        Validate that the label text is unique
        """
        data = self.cleaned_data["text"]
        if data == self.instance.text:  # No change
            return data

        if self.instance.user.label_set.filter(text=data).count() > 0:
            raise ValidationError("Label text must be unique", code="duplicate")

        return data

    def clean_feeds(self):
        """
        Ensure that only the user's own feeds are selectable. Other PKs are
        ignored.
        """
        # FIXME: Use limit_choices_to instead
        # https://docs.djangoproject.com/en/4.0/ref/models/fields/#django.db.models.ForeignKey.limit_choices_to
        data = self.cleaned_data["feeds"]
        return self.instance.user.feed_set.intersection(data)


@login_required
def label_edit(request, label_id: int):
    """
    Edit a label.
    """
    # TODO: Display a form, handle POST. Generic view?
    label = get_object_or_404(request.user.label_set, pk=label_id)
    counts = label.feeds.aggregate(
        label_unread_count=Sum("unread_count"),
        label_fave_count=Sum("fave_count"),
    )
    if request.method == "POST":
        form = LabelForm(request.POST, instance=label)
        if form.is_valid():
            form.save()
            return HttpResponseRedirect(
                reverse("label-edit", kwargs={"label_id": label.pk}),
            )
    elif request.method == "GET":
        form = LabelForm(instance=label)
    return render(
        request,
        "label_edit.html",
        {
            "label": label,
            "form": form,
            **counts,
            "tabs_selected": {"label-edit"},
        },
    )


@login_required
def label_delete(request, label_id: int):
    """
    Delete a label.
    """
    label = get_object_or_404(request.user.label_set, pk=label_id)

    if request.method == "POST":
        label.delete()
    else:
        return HttpResponseNotAllowed(["POST"])

    return HttpResponseRedirect(reverse("label-list"))


@login_required
def label_add(request):
    """
    Add a new label.
    """
    label = Label(user=request.user)
    if request.method == "POST":
        form = LabelForm(request.POST, instance=label)
        if form.is_valid():
            label = form.save(commit=True)
            label.save()
            return HttpResponseRedirect(
                reverse(
                    "label-show",
                    kwargs={"label_id": label.pk, "filter": ArticleFilter.unread},
                ),
            )
    elif request.method != "GET":
        return HttpResponseNotAllowed(["GET", "POST"])
    else:
        form = LabelForm(instance=label)
    return render(
        request,
        "label_add.html",
        {
            "form": form,
        },
    )


@login_required
def article_show(request, article_id: int):
    """
    Display an article.
    """
    article = get_object_or_404(
        Article.objects.filter(feed__in=request.user.feed_set.all()),
        pk=article_id,
    )

    return render(
        request,
        "article_show.html",
        {
            "filter": filter,
            "article": article,
            "article_labels": article.feed.label_set.all(),  # TODO: sort
            "tabs_selected": set(),
        },
    )


def articles_for_request(request):
    """
    Get a QuerySet for the Entry objects listed by the request's "article"
    parameter (which are also owned by the authenticated user).

    :returns: A QuerySet for Entry model instances
    """
    article_ids = map(int, request.POST.getlist("article"))
    qs = Article.objects.filter(feed__in=request.user.feed_set.all())
    return qs.filter(id__in=article_ids)


@login_required
def redirect_to_article(request, article_id: str):
    """
    Redirect a legacy article URL

    This is used to redirect article URLs from the old React UI to the new
    location, like::

        /all/unread/1234/  →   /article/1234/
        /feed/1/fave/234/  →   /article/234/
        /label/12/all/34/  →   /article/34/

    The article ID isn't validated as the redirect target will do that, but the
    URL patterns require it be an integer.
    """
    return redirect("article-show", article_id=int(article_id), permanent=True)


@login_required
def flags(request):
    """
    Change the flags of articles.

    :query read: One of "true" or "false".
    :query fave: One of "true" or "false".
    :query article: One or more article IDs.
    """
    if request.method != "POST":
        return HttpResponseNotAllowed(["POST"])
    updates = {}
    if "read" in request.POST:
        if request.POST["read"] == "true":
            updates["read"] = True
        elif request.POST["read"] == "false":
            updates["read"] = False
    if "fave" in request.POST:
        if request.POST["fave"] == "true":
            updates["fave"] = True
        elif request.POST["fave"] == "false":
            updates["fave"] = False
    qs = articles_for_request(request)
    if updates:
        with connection.execute_wrapper(log_on_error):
            qs.update(**updates)
    data = {
        id_: {
            "fave": fave,
            "read": read,
        }
        for (id_, fave, read) in qs.values_list("id", "fave", "read")
    }
    return HttpResponse(json.dumps(data), content_type="application/json")


def manifest(request):
    """
    Generate a Web App Manifest for the application.
    """
    # A template is used to generate the JSON manifest so that the template
    # infrastructure for generating icon URLs can be reused.
    return render(request, "manifest.json", {}, content_type="application/manifest+json")


def about(request):
    """
    About page, which lists the version of everything involved to assist
    with debugging.
    """
    return render(
        request,
        "about.html",
        {
            "yarrharr_version": yarrharr.__version__,
            "django_version": django.get_version(),
            "feedparser_version": feedparser.__version__,
        },
    )


def robots_txt(request):
    """
    Serve up an empty robots.txt file so that it doesn't show as a 404 in the
    access logs.
    """
    if request.method != "GET":
        return HttpResponseNotAllowed(["HEAD", "GET"])
    return HttpResponse(b"", content_type="text/plain")
