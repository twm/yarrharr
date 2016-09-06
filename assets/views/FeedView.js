import React from 'react';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setLayout, setFilter, setOrder } from 'actions.js';
import { markArticle, markArticles } from 'actions.js';
import { VIEW_LIST, VIEW_TEXT, STATE_ARCHIVED } from 'actions.js';
import { FILTER_NEW, FILTER_SAVED, FILTER_ARCHIVED, FILTER_ALL } from 'actions.js';

import { ViewButton } from 'widgets/ViewControls.js';
import { Logo } from 'widgets/icons.js';
import Article from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { RootLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import Loading from 'widgets/Loading.js';
import Header from 'widgets/Header.js';
import './FeedView.less';


const VIEW_TO_WIDGET = {
    [VIEW_LIST]: ListArticle,
    [VIEW_TEXT]: Article,
};

export function AllView({params, feedsById, view, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
    const feedId = params.feedId;
    const feed = feedsById[feedId];
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton
                view={view} onSetView={onSetView}
                layout={layout} onSetLayout={onSetLayout}
                order={snapshot.order} onSetOrder={onSetOrder} />
        </div>
        <Header text="All Feeds" />
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    renderArchiveAllLink(snapshot, onMarkArticles),
                    snapshot.filter !== FILTER_NEW ? <AllLink key={FILTER_NEW} filter={FILTER_NEW}>New</AllLink> : null,
                    snapshot.filter !== FILTER_SAVED ? <AllLink key={FILTER_SAVED} filter={FILTER_SAVED}>Saved</AllLink> : null,
                    snapshot.filter !== FILTER_ARCHIVED ? <AllLink key={FILTER_ARCHIVED} filter={FILTER_ARCHIVED}>Archived</AllLink> : null,
                    snapshot.filter !== FILTER_ALL ? <AllLink key={FILTER_ALL} filter={FILTER_ALL}>All</AllLink> : null,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById, onMarkArticle),
            () => onLoadMore(snapshot.articleIds))}
    </div>;
}

export function FeedView({params, feedsById, view, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
    const feedId = params.feedId;
    const feed = feedsById[feedId];
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton
                view={view} onSetView={onSetView}
                layout={layout} onSetLayout={onSetLayout}
                order={snapshot.order} onSetOrder={onSetOrder} />
        </div>
        <Header text={feed.text || feed.title} />
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    renderArchiveAllLink(snapshot, onMarkArticles),
                    snapshot.filter !== FILTER_NEW ? <FeedLink key={FILTER_NEW} feedId={feedId} filter={FILTER_NEW}>New</FeedLink> : null,
                    snapshot.filter !== FILTER_SAVED ? <FeedLink key={FILTER_SAVED} feedId={feedId} filter={FILTER_SAVED}>Saved</FeedLink> : null,
                    snapshot.filter !== FILTER_ARCHIVED ? <FeedLink key={FILTER_ARCHIVED} feedId={feedId} filter={FILTER_ARCHIVED}>Archived</FeedLink> : null,
                    snapshot.filter !== FILTER_ALL ? <FeedLink key={FILTER_ALL} feedId={feedId} filter={FILTER_ALL}>All</FeedLink> : null,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById, onMarkArticle),
            () => onLoadMore(snapshot.articleIds))}
    </div>;
}

export function LabelView({params, labelsById, feedsById, view, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
    const labelId = params.labelId;
    const label = labelsById[labelId];
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton
                view={view} onSetView={onSetView}
                layout={layout} onSetLayout={onSetLayout}
                order={snapshot.order} onSetOrder={onSetOrder} />
        </div>
        <Header text={label.text} />
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    renderArchiveAllLink(snapshot, onMarkArticles),
                    snapshot.filter !== FILTER_NEW ? <LabelLink key={FILTER_NEW} labelId={labelId} filter={FILTER_NEW}>New</LabelLink> : null,
                    snapshot.filter !== FILTER_SAVED ? <LabelLink key={FILTER_SAVED} labelId={labelId} filter={FILTER_SAVED}>Saved</LabelLink> : null,
                    snapshot.filter !== FILTER_ARCHIVED ? <LabelLink key={FILTER_ARCHIVED} labelId={labelId} filter={FILTER_ARCHIVED}>Archived</LabelLink> : null,
                    snapshot.filter !== FILTER_ALL ? <LabelLink key={FILTER_ALL} labelId={labelId} filter={FILTER_ALL}>All</LabelLink> : null,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById, onMarkArticle),
            () => onLoadMore(snapshot.articleIds))}
    </div>;
}

const mapDispatchToProps = {
    onSetView: setView,
    onSetLayout: setLayout,
    onSetOrder: setOrder,
    onMarkArticle: markArticle,
    onMarkArticles: markArticles,
    onLoadMore: loadMore,
};
export const ConnectedAllView = connect(state => state, mapDispatchToProps)(AllView);
export const ConnectedFeedView = connect(state => state, mapDispatchToProps)(FeedView);
export const ConnectedLabelView = connect(state => state, mapDispatchToProps)(LabelView);

/**
 * Given a list of components, filter out null ones and insert non-breaking
 * spaces between those remaining.
 */
function joinLinks(maybeLinks) {
    const links = [];
    for (var i = 0; i < maybeLinks.length; i++) {
        if (maybeLinks[i]) {
            links.push(maybeLinks[i]);
            if (i !== maybeLinks.length - 1) {
                links.push(" \x1b\x1b ");
            }
        }
    }
    return links;
}

function renderArchiveAllLink(snapshot, onMarkArticles) {
    // Stuff is still loading.
    if (!snapshot || snapshot.loading) {
        return null;
    }

    if (snapshot.articleIds.length < 1) {
        return null;
    }
    if (snapshot.filter === FILTER_ARCHIVED) {
        return null;
    }

    return <a key="archive-all" href="#" onClick={e => {
        e.preventDefault();
        if (confirm("Archive " + snapshot.articleIds.length + " articles?")) {
            onMarkArticles(snapshot.articleIds, STATE_ARCHIVED);
        }
    }}>Archive all</a>;
}

function renderSnapshot(snapshot, renderArticles, onNearBottom) {
    if (!snapshot || snapshot.loading) {
        return <div className="floater">
            <div className="floater-content">
                <Loading />
            </div>
        </div>;
    }
    if (snapshot.error) {
        return <div className="floater">
            <p className="floater-content">Failed to load (reload to retry)</p>
        </div>;
    }
    if (snapshot.articleIds.length === 0) {
        return <div className="floater">
            <p className="floater-content">No articles</p>
        </div>;
    }
    return <ScrollSpy onNearBottom={onNearBottom}>
        {renderArticles()}
    </ScrollSpy>;
}

function renderArticles(view, articleIds, articlesById, feedsById, onMark) {
    if (!articleIds.length) {
        return <p>No articles</p>;
    }
    const Widget = VIEW_TO_WIDGET[view];
    const elements = [];
    for (let id of articleIds) {
        const article = articlesById[id];
        if (article) {
            if (article.loading) {
                elements.push(<Loading key="loading" />);
                break;
            }
            // TODO: Handle errors
            const feed = feedsById[article.feedId];
            elements.push(<Widget key={id} feed={feed} onMark={onMark} {...article} />);
        } else {
            // We only render up to the first unavailable article.  This
            // ensures that loading always occurs at the end.
            break;
        }
    }
    return elements;
}
