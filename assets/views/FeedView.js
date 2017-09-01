import React from 'react';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setLayout, setOrder } from 'actions.js';
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
import { AllArticleLink, FeedArticleLink, LabelArticleLink } from 'widgets/links.js';
import Header from 'widgets/Header.js';
import './FeedView.less';

const __debug__ = process.env.NODE_ENV !== 'production';

export function AllView({params, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
    const { articleId } = params;
    const renderLink = props => <AllArticleLink filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton
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
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticle, renderLink),
            () => renderArticle(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticle, renderLink),
            () => onLoadMore(snapshot.response.articleIds))}
    </div>;
}

export function FeedView({params, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
    const { feedId, filter, articleId } = params;
    const feed = feedsById[feedId];
    const renderLink = props => <FeedArticleLink feedId={feedId} filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton
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
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticle, renderLink),
            () => renderArticle(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticle, renderLink),
            () => onLoadMore(snapshot.response.articleIds))}
    </div>;
}

export function LabelView({params, labelsById, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
    const { labelId, filter, articleId } = params;
    const label = labelsById[labelId];
    const renderLink = props => <LabelArticleLink labelId={labelId} filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton
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
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticle, renderLink),
            () => renderArticle(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticle, renderLink),
            () => onLoadMore(snapshot.response.articleIds))}
    </div>;
}

const mapDispatchToProps = {
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
    const { loaded, params, articleIds } = snapshot.response;

    // Stuff is still loading.
    if (!loaded) {
        return null;
    }
    // No articles present.
    if (articleIds.length < 1) {
        return null;
    }
    if (params.filter === FILTER_ARCHIVED) {
        return null;
    }

    return <a key="archive-all" href="#" onClick={e => {
        e.preventDefault();
        if (confirm("Archive " + articleIds.length + " articles?")) {
            onMarkArticles(articleIds, STATE_ARCHIVED);
        }
    }}>Archive all</a>;
}

function Status(props) {
    return <div className="floater">
        <p className="floater-content">{props.children}</p>
    </div>;
}

function renderSnapshot(snapshotResponse, articleId, renderArticleList, renderArticle, onNearBottom) {
    if (!snapshotResponse.loaded) {
        return <Status>Loading</Status>;
    }
    if (snapshotResponse.error) {
        return <Status>Failed to load (refresh to retry)</Status>;
    }
    if (snapshotResponse.articleIds.length === 0) {
        return <Status>No articles</Status>;
    }
    if (articleId) {
        return renderArticle();
    } else {
        return <ScrollSpy onNearBottom={onNearBottom}>{renderArticleList()}</ScrollSpy>;
    }
}

/**
 * Render the meat of a list/article view. This must only be called after the
 * snapshot has loaded.
 *
 * @param {?number} articleId
 *      If not null, render this specific article instead of the whole list.
 * @param {number[]} articleIds
 *      List of article IDs in the order to render them. Not all may be present
 *      in the articlesById map, depending on what has loaded.
 */
function renderArticle(articleId, articleIds, articlesById, feedsById, onMark, renderLink) {
    const elements = [];
    var index = articleIds.indexOf(articleId);
    if (index === -1) {
        // TODO Common 404 page style?
        return <Status>404: Article {articleId} does not exist</Status>;
    }
    // XXX How to arrange for prev and next to be loaded in all cases?
    var article = articlesById[articleId];
    if (__debug__ && !article) {
        throw new Error(`renderArticle(${articleId}, ...) called before article entry added to store`);
    }
    // FIXME Shouldn't assume all feeds have loaded.
    var feed = feedsById[article.feedId];
    if (!article) {
        return <Status>Loading</Status>;
    }

    if (index !== 0) {
        var prevId = articleIds[index - 1];
        var prev = articlesById[prevId]; // NB: may not have loaded yet
        elements.push(<div key={prevId} className="prev-link">
            {renderLink({
                articleId: prevId,
                children: [
                    <b>Previous </b>,
                    prev ? (prev.title || "Untitled") : "",
                ],
            })}
        </div>);
    }

    if (!article.loading) {
        elements.push(<Article key={article.id} feed={feed} onMark={onMark} {...article} />);
    } else {
        elements.push(<p>Loading</p>);
    }

    if (index < articleIds.length - 1) {
        var nextId = articleIds[index + 1];
        var next = articlesById[nextId]; // NB: may not have loaded yet
        elements.push(<div key={nextId} className="next-link">
            {renderLink({
                articleId: nextId,
                children: [
                    <b>Next </b>,
                    next ? (next.title || "Untitled") : "",
                ],
            })}
        </div>);
    }

    return elements;
}

/**
 * Render the meat of a list view. This must only be called after the
 * snapshot has loaded.
 *
 * @param {?number} articleId
 *      If not null, render this specific article instead of the whole list.
 * @param {number[]} articleIds
 *      List of article IDs in the order to render them. Not all may be present
 *      in the articlesById map, depending on what has loaded.
 */
function renderArticleList(articleId, articleIds, articlesById, feedsById, onMark, renderLink) {
    const elements = [];
    for (let id of articleIds) {
        const article = articlesById[id];
        if (article) {
            if (article.loading) {
                elements.push(<div>Loading</div>);
                break;
            }
            // FIXME Shouldn't assume all feeds have loaded.
            const feed = feedsById[article.feedId];
            elements.push(<ListArticle key={id} renderLink={renderLink} feed={feed} onMark={onMark} {...article} />);
        } else {
            // We only render up to the first unavailable article.  This
            // ensures that loading always occurs at the end.
            break;
        }
    }
    return elements;
}
