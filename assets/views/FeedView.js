import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setLayout, setOrder } from 'actions.js';
import { markArticlesRead, markArticlesFave } from 'actions.js';
import { addLabel, attachLabel, detachLabel } from 'actions.js';
import { FILTER_UNREAD, FILTER_FAVE, FILTER_ARCHIVED, FILTER_ALL } from 'actions.js';
import { ORDER_TAIL, ORDER_DATE } from 'actions.js';

import { GlobalBar } from 'widgets/GlobalBar.js';
import { Label, AttachLabelButton } from 'widgets/Label.js';
import { Logo, ArrowLeft, ArrowRight } from 'widgets/icons.js';
import { Article, LoadingArticle } from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { RootLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AllArticleLink, FeedArticleLink, LabelArticleLink } from 'widgets/links.js';
import { ReadToggleLink, FaveToggleLink } from 'widgets/StateToggle.js';
import Header from 'widgets/Header.js';
import { labelsByTitle } from 'sorting.js';
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
    const feedCount = Object.keys(feedsById).length;
    return <div className={"feed-view layout-" + layout}>
        <GlobalBar layout={layout} onSetLayout={onSetLayout} />
        <div className="list-header">
            <div className="list-header-inner">
                <h1>All Feeds</h1>
                <p>{feedCount === 1 ? "1 feed" : feedCount + " feeds"}</p>
            </div>
        </div>
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    <AllLink key={FILTER_UNREAD} disabled={snapshot.filter === FILTER_UNREAD} filter={FILTER_UNREAD}>New</AllLink>,
                    <AllLink key={FILTER_FAVE} disabled={snapshot.filter === FILTER_FAVE} filter={FILTER_FAVE}>Favorite</AllLink>,
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
        {articleId ? null : <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>}
    </div>;
}

export class FeedHeader extends React.PureComponent {
    render() {
        const feed = this.props.feed;
        const labelList = labelsByTitle(this.props);
        return <div className="list-header">
            <div className="list-header-inner">
                <h1>{feed.text || feed.title || feed.url}</h1>
                <p><a href={feed.siteUrl} target="_blank">{feed.text ? feed.title : feed.siteUrl}</a></p>
                <div>{feed.labels.length > 0 ? feed.labels.map(labelId => {
                    const label = this.props.labelsById[labelId];
                    return <Label key={labelId} feedId={feed.id} label={label}
                        onDetachLabel={this.props.onDetachLabel} />;
                }) : "No labels"}
                    <AttachLabelButton
                        feed={feed}
                        labelList={labelList}
                        onAddLabel={this.props.onAddLabel}
                        onAttachLabel={this.props.onAttachLabel}
                    />
                </div>
                <details>
                    <summary>{feed.active
                        ? ((feed.checked ? "Last checked " + feed.checked : "Never checked") + (feed.error ? ": Error!" : ""))
                        : "Inactive"}</summary>
                    {feed.active ? null : <p>This feed is not being checked for updates.</p>}
                    {feed.error ? <p><b>Error: </b>{feed.error}</p> : <p>Last check completed successfully.</p>}
                    <p>Feed URL: <a href={feed.url} target="_blank">{feed.url}</a></p>
                    <p>Site URL: {feed.siteUrl ? <a href={feed.siteUrl} target="_blank">{feed.siteUrl}</a> : "None"}</p>
                </details>
            </div>
        </div>;
    }
}

if (__debug__) {
    FeedHeader.propTypes = {
        labelsById: PropTypes.objectOf(PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string.isRequired,
        })).isRequired,
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string,
            title: PropTypes.string,
            url: PropTypes.string.isRequired,
            siteUrl: PropTypes.string.isRequired,
            labels: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
            error: PropTypes.string,
        }).isRequired,
        onAddLabel: PropTypes.func.isRequired,
        onAttachLabel: PropTypes.func.isRequired,
        onDetachLabel: PropTypes.func.isRequired,
    };
}

export function FeedView({params, feedsById, labelsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore, onAddLabel, onAttachLabel, onDetachLabel}) {
    const { feedId, filter, articleId } = params;
    const feed = feedsById[feedId];
    const renderLink = props => <FeedArticleLink feedId={feedId} filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <GlobalBar layout={layout} onSetLayout={onSetLayout} />
        <FeedHeader feed={feed} labelsById={labelsById}
            onAddLabel={onAddLabel}
            onAttachLabel={onAttachLabel}
            onDetachLabel={onDetachLabel} />
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    <FeedLink key={FILTER_UNREAD} disabled={snapshot.filter === FILTER_UNREAD} feedId={feedId} filter={FILTER_UNREAD}>New</FeedLink>,
                    <FeedLink key={FILTER_FAVE} disabled={snapshot.filter === FILTER_FAVE} feedId={feedId} filter={FILTER_FAVE}>Favorite</FeedLink>,
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
        {articleId ? null : <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>}
    </div>;
}

export function LabelView({params, labelsById, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { labelId, filter, articleId } = params;
    const label = labelsById[labelId];
    const renderLink = props => <LabelArticleLink labelId={labelId} filter={snapshot.filter} {...props} />;
    return <div className={"feed-view layout-" + layout}>
        <GlobalBar layout={layout} onSetLayout={onSetLayout} />
        <div className="list-header">
            <div className="list-header-inner">
                <h1>{label.text}</h1>
                <p>Label with {label.feeds.length === 1 ? "1 feed" : label.feeds.length + " feeds"}</p>
            </div>
        </div>
        <div className="floater-wrap">
            <div className="floater">
                {joinLinks([
                    <LabelLink key={FILTER_UNREAD} disabled={snapshot.filter === FILTER_UNREAD} labelId={labelId} filter={FILTER_UNREAD}>New</LabelLink>,
                    <LabelLink key={FILTER_FAVE} disabled={snapshot.filter === FILTER_FAVE} labelId={labelId} filter={FILTER_FAVE}>Favorite</LabelLink>,
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
        {articleId ? null : <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>}
    </div>;
}

const mapDispatchToProps = {
    onSetLayout: setLayout,
    onSetOrder: setOrder,
    onMarkArticlesRead: markArticlesRead,
    onMarkArticlesFave: markArticlesFave,
    onLoadMore: loadMore,
    onAddLabel: addLabel,
    onAttachLabel: attachLabel,
    onDetachLabel: detachLabel,
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

    return <div className="bar">
        {prevId ? renderLink({
            className: "prev-link expand",
            articleId: prevId,
            children: [
                <div className="square">
                    <ArrowLeft className="icon" aria-hidden={true} />
                </div>,
                <div>
                    <span>Previous </span>
                    {prev && prev.title ? <span className="title">{prev.title}</span> : null}
                </div>,
            ],
        }) : <span className="expand"></span>}
        {article ? <ReadToggleLink className="square" articleId={article.id} read={article.read} onMarkArticlesRead={onMarkArticlesRead} /> : null}
        {article ? <FaveToggleLink className="square" articleId={article.id} fave={article.fave} onMarkArticlesFave={onMarkArticlesFave} /> : null }
        {nextId ? renderLink({
            className: "next-link square",
            title: "Go to next article: " + (next ? (next.title || "Untitled") : ""),
            articleId: nextId,
            children: [
                <ArrowRight className="icon" aria-hidden={true} />,
            ],
        }) : <span className="square"></span>}
    </div>;
}

function BottomBar({article, prevId, nextId, articlesById, onMarkArticlesRead, onMarkArticlesFave, renderLink}) {
    // NB: These may not have loaded yet.
    const prev = prevId === null ? null : articlesById[prevId];
    const next = nextId === null ? null : articlesById[nextId];

    return <div className="bar">
        {prevId ? renderLink({
            className: "prev-link square",
            title: "Go to previous article: " + (prev ? (prev.title || "Untitled") : ""),
            articleId: prevId,
            children: <ArrowLeft className="icon" aria-hidden={true} />,
        }) : null}
        {article ? <ReadToggleLink className="square" articleId={article.id} read={article.read} onMarkArticlesRead={onMarkArticlesRead} /> : null}
        {article ? <FaveToggleLink className="square" articleId={article.id} fave={article.fave} onMarkArticlesFave={onMarkArticlesFave} /> : null}
        {nextId ? renderLink({
            className: "next-link expand",
            articleId: nextId,
            children: [
                <div>
                    <span>Next </span>
                    {next && next.title ? <span className="title">{next.title}</span> : null}
                </div>,
                <div className="square">
                    <ArrowRight className="icon" aria-hidden={true} />
                </div>,
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
