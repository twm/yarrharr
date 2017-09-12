import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setLayout, setOrder } from 'actions.js';
import { markArticlesRead, markArticlesFave } from 'actions.js';
import { STATE_ARCHIVED } from 'actions.js';
import { FILTER_NEW, FILTER_SAVED, FILTER_ARCHIVED, FILTER_ALL } from 'actions.js';
import { ORDER_TAIL, ORDER_DATE } from 'actions.js';

import { ViewControls } from 'widgets/ViewControls.js';
import { Logo } from 'widgets/icons.js';
import Article from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { RootLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AllArticleLink, FeedArticleLink, LabelArticleLink } from 'widgets/links.js';
import { ReadToggleLink, FaveToggleLink } from 'widgets/StateToggle.js';
import Header from 'widgets/Header.js';
import './FeedView.less';

const __debug__ = process.env.NODE_ENV !== 'production';

function OrderTailButton(props) {
    const disabled = props.order === ORDER_TAIL;
    const onClick = e => {
        e.preventDefault();
        props.onSetOrder(ORDER_TAIL);
    };
    return <a href="#" role="button" aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={onClick}>Latest first</a>;
}

function OrderDateButton(props) {
    const disabled = props.order === ORDER_DATE;
    const onClick = e => {
        e.preventDefault();
        props.onSetOrder(ORDER_DATE);
    };
    return <a href="#" role="button" aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={onClick}>Oldest first</a>;
}

export function AllView({params, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { articleId } = params;
    const renderLink = props => <AllArticleLink filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewControls layout={layout} onSetLayout={onSetLayout} />
        </div>
        <Header text="All Feeds" />
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    renderArchiveAllLink(snapshot, onMarkArticlesRead),
                    <AllLink key={FILTER_NEW} disabled={snapshot.filter === FILTER_NEW} filter={FILTER_NEW}>New</AllLink>,
                    <AllLink key={FILTER_SAVED} disabled={snapshot.filter === FILTER_SAVED} filter={FILTER_SAVED}>Saved</AllLink>,
                    <AllLink key={FILTER_ARCHIVED} disabled={snapshot.filter === FILTER_ARCHIVED} filter={FILTER_ARCHIVED}>Archived</AllLink>,
                    <AllLink key={FILTER_ALL} disabled={snapshot.filter === FILTER_ALL} filter={FILTER_ALL}>All</AllLink>,
                    <OrderTailButton key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />,
                    <OrderDateButton key={ORDER_DATE} order={snapshot.order} onSetOrder={onSetOrder} />,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
    </div>;
}

export function FeedView({params, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { feedId, filter, articleId } = params;
    const feed = feedsById[feedId];
    const renderLink = props => <FeedArticleLink feedId={feedId} filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewControls layout={layout} onSetLayout={onSetLayout} />
        </div>
        <Header text={feed.text || feed.title} />
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    renderArchiveAllLink(snapshot, onMarkArticlesRead),
                    <FeedLink key={FILTER_NEW} disabled={snapshot.filter === FILTER_NEW} feedId={feedId} filter={FILTER_NEW}>New</FeedLink>,
                    <FeedLink key={FILTER_SAVED} disabled={snapshot.filter === FILTER_SAVED} feedId={feedId} filter={FILTER_SAVED}>Saved</FeedLink>,
                    <FeedLink key={FILTER_ARCHIVED} disabled={snapshot.filter === FILTER_ARCHIVED} feedId={feedId} filter={FILTER_ARCHIVED}>Archived</FeedLink>,
                    <FeedLink key={FILTER_ALL} disabled={snapshot.filter === FILTER_ALL} feedId={feedId} filter={FILTER_ALL}>All</FeedLink>,
                    <OrderTailButton key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />,
                    <OrderDateButton key={ORDER_DATE} order={snapshot.order} onSetOrder={onSetOrder} />,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
    </div>;
}

export function LabelView({params, labelsById, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { labelId, filter, articleId } = params;
    const label = labelsById[labelId];
    const renderLink = props => <LabelArticleLink labelId={labelId} filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewControls layout={layout} onSetLayout={onSetLayout} />
        </div>
        <Header text={label.text} />
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    renderArchiveAllLink(snapshot, onMarkArticlesRead),
                    <LabelLink key={FILTER_NEW} disabled={snapshot.filter === FILTER_NEW} labelId={labelId} filter={FILTER_NEW}>New</LabelLink>,
                    <LabelLink key={FILTER_SAVED} disabled={snapshot.filter === FILTER_SAVED} labelId={labelId} filter={FILTER_SAVED}>Saved</LabelLink>,
                    <LabelLink key={FILTER_ARCHIVED} disabled={snapshot.filter === FILTER_ARCHIVED} labelId={labelId} filter={FILTER_ARCHIVED}>Archived</LabelLink>,
                    <LabelLink key={FILTER_ALL} disabled={snapshot.filter === FILTER_ALL} labelId={labelId} filter={FILTER_ALL}>All</LabelLink>,
                    <OrderTailButton key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />,
                    <OrderDateButton key={ORDER_DATE} order={snapshot.order} onSetOrder={onSetOrder} />,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
    </div>;
}

const mapDispatchToProps = {
    onSetLayout: setLayout,
    onSetOrder: setOrder,
    onMarkArticlesRead: markArticlesRead,
    onMarkArticlesFave: markArticlesFave,
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
        links.push(maybeLinks[i]);
        if (i !== maybeLinks.length - 1) {
            links.push(" \x1b\x1b ");
        }
    }
    return links;
}

function renderArchiveAllLink(snapshot, onMarkArticlesRead) {
    const { loaded, params, articleIds } = snapshot.response;
    const disabled = (
        !loaded // Stuff is still loading.
        || articleIds.length < 1 // No articles present.
        || params.filter === FILTER_ARCHIVED // Everything already archived.
    )

    return <a key="archive-all" href="#" onClick={e => {
        e.preventDefault();
        if (disabled) {
            return;
        }
        if (confirm("Archive " + articleIds.length + " articles?")) {
            onMarkArticlesRead(articleIds, true);
        }
    }}>Archive all</a>;
}

function Status(props) {
    return <div className="floater">
        <p className="floater-content">{props.children}</p>
    </div>;
}

function renderSnapshot(snapshotResponse, articleId, renderArticleList, renderArticle, onLoadMore) {
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
        const onVisibleChange = (start, end) => {
            const ids = snapshotResponse.articleIds;
            onLoadMore(ids.slice(Math.floor(start * ids.length), Math.floor(end * ids.length) + 10));
        }
        return <ScrollSpy onVisibleChange={onVisibleChange}>{renderArticleList()}</ScrollSpy>;
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
function renderArticle(articleId, articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink) {
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
    if (!feed) {
        return <Status>Loading</Status>;
    }

    const prevId = index !== 0 ? articleIds[index - 1] : null;
    const nextId = index < articleIds.length - 1 ? articleIds[index + 1] : null;

    return [
        <TopBar
            key={prevId}
            article={article}
            prevId={prevId}
            nextId={nextId}
            articlesById={articlesById}
            onMarkArticlesRead={onMarkArticlesRead}
            onMarkArticlesFave={onMarkArticlesFave}
            renderLink={renderLink} />,
        article.loading ? <Status key={articleId}>Loading</Status> : <Article key={articleId} feed={feed} {...article} />,
        <BottomBar
            key={nextId}
            article={article}
            prevId={prevId}
            nextId={nextId}
            articlesById={articlesById}
            onMarkArticlesRead={onMarkArticlesRead}
            onMarkArticlesFave={onMarkArticlesFave}
            renderLink={renderLink} />,
    ];
}

function TopBar({article, prevId, nextId, articlesById, onMarkArticlesRead, onMarkArticlesFave, renderLink}) {
    // NB: These may not have loaded yet.
    const prev = prevId === null ? null : articlesById[prevId];
    const next = nextId === null ? null : articlesById[nextId];

    return <div className="top-bar">
        {prevId ? renderLink({
            key: prevId,
            className: "prev-link",
            articleId: prevId,
            children: [
                <b>Previous </b>,
                <span className="title">{prev ? (prev.title || "Untitled") : ""}</span>,
            ],
        }) : <span className="prev-link"></span>}
        <ReadToggleLink articleId={article.id} read={article.read} onMarkArticlesRead={onMarkArticlesRead} />
        <FaveToggleLink articleId={article.id} fave={article.fave} onMarkArticlesFave={onMarkArticlesFave} />
    </div>;
}

function BottomBar({article, prevId, nextId, articlesById, onMarkArticlesRead, onMarkArticlesFave, renderLink}) {
    var next = articlesById[nextId]; // NB: may not have loaded yet
    return <div className="bottom-bar">
        <ReadToggleLink articleId={article.id} read={article.read} onMarkArticlesRead={onMarkArticlesRead} />
        <FaveToggleLink articleId={article.id} fave={article.fave} onMarkArticlesFave={onMarkArticlesFave} />
        {nextId ? renderLink({
            key: nextId,
            className: "next-link",
            articleId: nextId,
            children: [
                <b>Next </b>,
                <span className="title">{next ? (next.title || "Untitled") : ""}</span>,
            ],
        }) : <span key={nextId} className="next-link"></span>}
    </div>;
}

if (__debug__) {
    TopBar.propTypes = BottomBar.propTypes = {
        article: PropTypes.shape({
            id: PropTypes.number.isRequired,
        }).isRequired,
        prevId: PropTypes.number,  // null indicates no previous article
        nextId: PropTypes.number,  // null indicates no next article
        articlesById: PropTypes.object.isRequired,
        // Event handlers
        onMarkArticlesRead: PropTypes.func.isRequired,
        onMarkArticlesFave: PropTypes.func.isRequired,
        // Render helpers
        renderLink: PropTypes.func.isRequired,
    };
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
function renderArticleList(articleId, articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink) {
    const elements = [];
    for (let id of articleIds) {
        const article = articlesById[id] || {loading: true};
        // FIXME Shouldn't assume all feeds have loaded.
        const feed = feedsById[article.feedId];
        elements.push(<ListArticle key={id} renderLink={renderLink} feed={feed} onMarkArticlesRead={onMarkArticlesRead} {...article} />);
    }
    return elements;
}
