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
import { Logo, ArrowLeft, ArrowRight } from 'widgets/icons.js';
import { Article, LoadingArticle } from 'widgets/Article.js';
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
                    <AllLink key={FILTER_NEW} disabled={snapshot.filter === FILTER_NEW} filter={FILTER_NEW}>New</AllLink>,
                    <AllLink key={FILTER_SAVED} disabled={snapshot.filter === FILTER_SAVED} filter={FILTER_SAVED}>Saved</AllLink>,
                    <AllLink key={FILTER_ARCHIVED} disabled={snapshot.filter === FILTER_ARCHIVED} filter={FILTER_ARCHIVED}>Read</AllLink>,
                    <AllLink key={FILTER_ALL} disabled={snapshot.filter === FILTER_ALL} filter={FILTER_ALL}>All</AllLink>,
                    <OrderTailButton key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />,
                    <OrderDateButton key={ORDER_DATE} order={snapshot.order} onSetOrder={onSetOrder} />,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>
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
                    <FeedLink key={FILTER_NEW} disabled={snapshot.filter === FILTER_NEW} feedId={feedId} filter={FILTER_NEW}>New</FeedLink>,
                    <FeedLink key={FILTER_SAVED} disabled={snapshot.filter === FILTER_SAVED} feedId={feedId} filter={FILTER_SAVED}>Saved</FeedLink>,
                    <FeedLink key={FILTER_ARCHIVED} disabled={snapshot.filter === FILTER_ARCHIVED} feedId={feedId} filter={FILTER_ARCHIVED}>Read</FeedLink>,
                    <FeedLink key={FILTER_ALL} disabled={snapshot.filter === FILTER_ALL} feedId={feedId} filter={FILTER_ALL}>All</FeedLink>,
                    <OrderTailButton key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />,
                    <OrderDateButton key={ORDER_DATE} order={snapshot.order} onSetOrder={onSetOrder} />,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>
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
                    <LabelLink key={FILTER_NEW} disabled={snapshot.filter === FILTER_NEW} labelId={labelId} filter={FILTER_NEW}>New</LabelLink>,
                    <LabelLink key={FILTER_SAVED} disabled={snapshot.filter === FILTER_SAVED} labelId={labelId} filter={FILTER_SAVED}>Saved</LabelLink>,
                    <LabelLink key={FILTER_ARCHIVED} disabled={snapshot.filter === FILTER_ARCHIVED} labelId={labelId} filter={FILTER_ARCHIVED}>Read</LabelLink>,
                    <LabelLink key={FILTER_ALL} disabled={snapshot.filter === FILTER_ALL} labelId={labelId} filter={FILTER_ALL}>All</LabelLink>,
                    <OrderTailButton key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />,
                    <OrderDateButton key={ORDER_DATE} order={snapshot.order} onSetOrder={onSetOrder} />,
                ])}
            </div>
        </div>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>
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

function MarkAllReadLink({snapshot, onMarkArticlesRead}) {
    const { loaded, params, articleIds } = snapshot.response;
    const disabled = (
        !loaded // Stuff is still loading.
        || articleIds.length < 1 // No articles present.
        || params.filter === FILTER_ARCHIVED // Everything already archived.
    )

    // TODO maybe add a checkbox icon here?
    return <a href="#" onClick={e => {
        e.preventDefault();
        if (disabled) {
            return;
        }
        if (confirm("Mark " + articleIds.length + " articles read?")) {
            onMarkArticlesRead(articleIds, true);
        }
    }}>Mark all {articleIds.length} articles read</a>;
}

function Status(props) {
    return <div className="floater">
        <p className="floater-content">{props.children}</p>
    </div>;
}

function renderSnapshot(snapshotResponse, articleId, renderArticleList, renderArticle, onLoadMore) {
    if (articleId) {
        return renderArticle(snapshotResponse.loaded);
    } else {
        if (!snapshotResponse.loaded) {
            return <Status>Loading</Status>;
        }
        if (snapshotResponse.error) {
            return <Status>Failed to load (refresh to retry)</Status>;
        }
        if (snapshotResponse.articleIds.length === 0) {
            return <Status>No articles</Status>;
        }
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
 * @param {{loaded: bool, articleIds: number[]} snapshot.response
 *      List of article IDs in the order to render them. Not all may be present
 *      in the articlesById map, depending on what has loaded.
 */
function renderArticle(articleId, {loaded, articleIds}, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink) {
    const index = loaded ? articleIds.indexOf(articleId) : -2;
    console.log(`renderArticle(${articleId}, {${loaded}, ${articleIds}}, ...) -> index ${index}`);
    var articleComponent, article = null, prevId = null, nextId = null;
    switch (index) {
        case -2:
            // TODO Common 404 page style?
            articleComponent = <LoadingArticle key="article" />;
            article = {
                id: articleId,
                read: false,
                fave: false,
            };
            break;
        case -1:
            articleComponent = <Status key="status">404: Article {articleId} does not exist</Status>;
            article = {
                id: articleId,
                read: false,
                fave: false,
            };
            break;
        default:
            // XXX How to arrange for prev and next to be loaded in all cases?
            article = articlesById[articleId];
            if (__debug__ && !article) {
                throw new Error(`renderArticle(${articleId}, ...) called before article entry added to store`);
            }
            // FIXME Shouldn't assume all feeds have loaded.
            const feed = feedsById[article.feedId];
            articleComponent = (feed && !article.loading) ? <Article key="article" feed={feed} {...article} /> : <LoadingArticle key="article" />;
            prevId = index !== 0 ? articleIds[index - 1] : null;
            nextId = index < articleIds.length - 1 ? articleIds[index + 1] : null;
    }
    return [
        <TopBar
            key="top"
            article={article}
            prevId={prevId}
            nextId={nextId}
            articlesById={articlesById}
            onMarkArticlesRead={onMarkArticlesRead}
            onMarkArticlesFave={onMarkArticlesFave}
            renderLink={renderLink} />,
        articleComponent,
        <BottomBar
            key="bottom"
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
            className: "prev-link expand",
            articleId: prevId,
            children: [
                <ArrowLeft width="40" height="40" alt="Previous" />,
                <div>
                    <b>Previous </b>
                    <span className="title">{prev ? (prev.title || "Untitled") : ""}</span>
                </div>,
            ],
        }) : <span className="expand"></span>}
        {article ? <ReadToggleLink articleId={article.id} read={article.read} onMarkArticlesRead={onMarkArticlesRead} /> : null}
        {article ? <FaveToggleLink articleId={article.id} fave={article.fave} onMarkArticlesFave={onMarkArticlesFave} /> : null }
        {nextId ? renderLink({
            className: "next-link",
            title: "Go to next article: " + (next ? (next.title || "Untitled") : ""),
            articleId: nextId,
            children: [
                <ArrowRight width="40" height="40" alt="Next" />,
            ],
        }) : <span key={nextId} className="next-link"></span>}
    </div>;
}

function BottomBar({article, prevId, nextId, articlesById, onMarkArticlesRead, onMarkArticlesFave, renderLink}) {
    // NB: These may not have loaded yet.
    const prev = prevId === null ? null : articlesById[prevId];
    const next = nextId === null ? null : articlesById[nextId];

    return <div className="bottom-bar">
        {prevId ? renderLink({
            className: "prev-link",
            title: "Go to previous article: " + (prev ? (prev.title || "Untitled") : ""),
            articleId: prevId,
            children: [
                <ArrowLeft width="40" height="40" alt="Previous" />,
            ],
        }) : null}
        {article ? <ReadToggleLink articleId={article.id} read={article.read} onMarkArticlesRead={onMarkArticlesRead} /> : null}
        {article ? <FaveToggleLink articleId={article.id} fave={article.fave} onMarkArticlesFave={onMarkArticlesFave} /> : null}
        {nextId ? renderLink({
            className: "next-link expand",
            articleId: nextId,
            children: [
                <div>
                    <b>Next </b>
                    <span className="title">{next ? (next.title || "Untitled") : ""}</span>
                </div>,
                <ArrowRight width="40" height="40" alt="" />,
            ],
        }) : <span key={nextId} className="expand"></span>}
    </div>;
}

if (__debug__) {
    TopBar.propTypes = BottomBar.propTypes = {
        article: PropTypes.shape({
            id: PropTypes.number.isRequired,
            read: PropTypes.bool,
            fave: PropTypes.bool,
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
