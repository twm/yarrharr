import React from 'react';

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setOrder } from 'actions.js';
import { markArticlesRead, markArticlesFave } from 'actions.js';
import { FILTER_UNREAD, FILTER_FAVE, FILTER_ARCHIVED, FILTER_ALL } from 'actions.js';
import { ORDER_TAIL, ORDER_DATE } from 'actions.js';

import { Tabs } from 'widgets/Tabs.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { Title } from 'widgets/Title.jsm';
import { AscDescIcon, ArrowLeftIcon, ArrowRightIcon, EditIcon, FeedIcon, LabelIcon } from 'widgets/icons.js';
import { Article, LoadingArticle } from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { RootLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import { Count } from 'widgets/Count.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AllArticleLink, FeedArticleLink, LabelArticleLink } from 'widgets/links.js';
import { ReadToggleLink, FaveToggleLink } from 'widgets/StateToggle.js';
import { InventoryLink, InventoryFeedLink, InventoryLabelLink } from 'widgets/links.js';
import Header from 'widgets/Header.js';
import { labelsByTitle } from 'sorting.js';
import './FeedView.less';

const __debug__ = process.env.NODE_ENV !== 'production';

class OrderToggle extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = event => {
            event.preventDefault();
            const next = this.props.order === ORDER_TAIL ? ORDER_DATE : ORDER_TAIL;
            props.onSetOrder(next);
        };
    }
    render() {
        const title = this.props.order === ORDER_DATE ? "Show latest first" : "Show oldest first";
        return <a className="square" href="#" role="button" title={title} onClick={this.handleClick}>
            <AscDescIcon ascending={this.props.order === ORDER_DATE} aria-hidden={true} />
        </a>;
    }
}
if (__debug__) {
    OrderToggle.propTypes = {
        order: PropTypes.oneOf([ORDER_TAIL, ORDER_DATE]).isRequired,
        onSetOrder: PropTypes.func.isRequired,
    };
}

export function AllView({params, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { articleId } = params;
    const renderLink = props => <AllArticleLink filter={snapshot.filter} {...props} />;
    const feedCount = Object.keys(feedsById).length;
    return <React.Fragment>
        <GlobalBar />
        <Title title={articleTitle(articlesById, articleId, "All Feeds")} />
        <header className="list-header">
            <div className="list-header-inner bar">
                <AllLink className="expand" filter={snapshot.filter}>
                    <h1>All Feeds</h1>
                </AllLink>
                <OrderToggle key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />
            </div>
        </header>
        <Tabs>
            <AllLink key={FILTER_UNREAD} disabled={snapshot.filter === FILTER_UNREAD} filter={FILTER_UNREAD} className="no-underline">Unread</AllLink>
            <AllLink key={FILTER_FAVE} disabled={snapshot.filter === FILTER_FAVE} filter={FILTER_FAVE} className="no-underline">Favorite</AllLink>
            <AllLink key={FILTER_ALL} disabled={snapshot.filter === FILTER_ALL} filter={FILTER_ALL} className="no-underline">All</AllLink>
            <InventoryLink title="Manage Feeds" className="no-underline">
                <EditIcon aria-label="Manage Feeds" />
            </InventoryLink>
        </Tabs>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        {articleId ? null : <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>}
    </React.Fragment>;
}

export function FeedView({params, feedsById, labelsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { feedId, filter, articleId } = params;
    const feed = feedsById[feedId];
    const renderLink = props => <FeedArticleLink feedId={feedId} filter={snapshot.filter} {...props} />;
    return <React.Fragment>
        <GlobalBar layout={layout} onSetLayout={onSetLayout} />
        <Title title={articleTitle(articlesById, articleId, feed.text || feed.title || feed.url)} />
        <header className="list-header">
            <div className="list-header-inner bar">
                <FeedLink className="expand" disabled={!articleId} feedId={feedId} filter={snapshot.filter}>
                    <div className="square">
                        <FeedIcon aria-hidden={true} />
                    </div>
                    <h1>{feed.text || feed.title || feed.url}</h1>
                </FeedLink>
                <OrderToggle key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />
            </div>
        </header>
        <Tabs>
            <FeedLink disabled={snapshot.filter === FILTER_UNREAD} feedId={feedId} filter={FILTER_UNREAD} className="no-underline">Unread <Count value={feed.unreadCount} /></FeedLink>
            <FeedLink disabled={snapshot.filter === FILTER_FAVE} feedId={feedId} filter={FILTER_FAVE} className="no-underline">Favorite <Count value={feed.faveCount} /></FeedLink>
            <FeedLink disabled={snapshot.filter === FILTER_ALL} feedId={feedId} filter={FILTER_ALL} className="no-underline">All</FeedLink>
            <InventoryFeedLink feedId={feedId} title="Edit Feed" className="no-underline">
                <EditIcon aria-label="Edit Feed" />
            </InventoryFeedLink>
        </Tabs>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        {articleId ? null : <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>}
    </React.Fragment>;
}

export function LabelView({params, labelsById, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { labelId, filter, articleId } = params;
    const label = labelsById[labelId];
    const renderLink = props => <LabelArticleLink labelId={labelId} filter={snapshot.filter} {...props} />;
    return <React.Fragment>
        <GlobalBar layout={layout} onSetLayout={onSetLayout} />
        <Title title={articleTitle(articlesById, articleId, label.text)} />
        <header className="list-header">
            <div className="list-header-inner bar">
                <LabelLink className="expand" disabled={!articleId} labelId={labelId} filter={snapshot.filter}>
                    <div className="square">
                        <LabelIcon aria-hidden={true} />
                    </div>
                    <h1>{label.text}</h1>
                </LabelLink>
                <OrderToggle key={ORDER_TAIL} order={snapshot.order} onSetOrder={onSetOrder} />
            </div>
        </header>
        <Tabs>
            <LabelLink disabled={snapshot.filter === FILTER_UNREAD} labelId={labelId} filter={FILTER_UNREAD} className="no-underline">Unread <Count value={label.unreadCount} /></LabelLink>
            <LabelLink disabled={snapshot.filter === FILTER_FAVE} labelId={labelId} filter={FILTER_FAVE} className="no-underline">Favorite <Count value={label.faveCount} /></LabelLink>
            <LabelLink disabled={snapshot.filter === FILTER_ALL} labelId={labelId} filter={FILTER_ALL} className="no-underline">All</LabelLink>
            <InventoryLabelLink labelId={labelId} title="Edit Label" className="no-underline">
                <EditIcon aria-label="Edit Label" />
            </InventoryLabelLink>
        </Tabs>
        {renderSnapshot(snapshot.response, articleId,
            () => renderArticleList(articleId, snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            () => renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        {articleId ? null : <div className="floater-wrap">
            <div className="floater">
                <MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />
            </div>
        </div>}
    </React.Fragment>;
}

const mapDispatchToProps = {
    onSetOrder: setOrder,
    onMarkArticlesRead: markArticlesRead,
    onMarkArticlesFave: markArticlesFave,
    onLoadMore: loadMore,
};
export const ConnectedAllView = connect(state => state, mapDispatchToProps)(AllView);
export const ConnectedFeedView = connect(state => state, mapDispatchToProps)(FeedView);
export const ConnectedLabelView = connect(state => state, mapDispatchToProps)(LabelView);


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
                <div key="icon" className="square">
                    <ArrowLeftIcon aria-hidden={true} />
                </div>,
                <div key="text">
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
            children: <ArrowRightIcon aria-hidden={true} />,
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
            children: <ArrowLeftIcon aria-hidden={true} />,
        }) : null}
        {article ? <ReadToggleLink className="square" articleId={article.id} read={article.read} onMarkArticlesRead={onMarkArticlesRead} /> : null}
        {article ? <FaveToggleLink className="square" articleId={article.id} fave={article.fave} onMarkArticlesFave={onMarkArticlesFave} /> : null}
        {nextId ? renderLink({
            className: "next-link expand",
            articleId: nextId,
            children: [
                <div key="text">
                    <span>Next </span>
                    {next && next.title ? <span className="title">{next.title}</span> : null}
                </div>,
                <div className="square" key="icon">
                    <ArrowRightIcon aria-hidden={true} />
                </div>,
            ],
        }) : <span className="expand"></span>}
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

function articleTitle(articlesById, articleId, suffix) {
    if (articleId && articlesById[articleId]) {
        return (articlesById[articleId].title || "Untitled") + " - " + suffix;
    }
    return suffix;
}
