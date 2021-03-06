import React, { Fragment } from 'react';

import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setOrder } from 'actions.js';
import { markArticlesRead, markArticlesFave } from 'actions.js';
import { FILTER_UNREAD, FILTER_FAVE, FILTER_ALL } from 'actions.js';
import { ORDER_TAIL, ORDER_DATE } from 'actions.js';

import { Tabs } from 'widgets/Tabs.js';
import { GlobalBar, Header, HomeIconLink } from 'widgets/GlobalBar.js';
import { Title } from 'widgets/Title.jsm';
import { AscDescIcon, PrevIcon, NextIcon, EditIcon, GlobeIcon, FeedIcon, LabelIcon, ReturnIcon } from 'widgets/icons.js';
import { Article, LoadingArticle } from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { HomeLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import { Count } from 'widgets/Count.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AllArticleLink, FeedArticleLink, LabelArticleLink } from 'widgets/links.js';
import { ReadToggleLink, FaveToggleLink } from 'widgets/StateToggle.js';
import { FeedListLink, FeedDetailLink, LabelDetailLink } from 'widgets/links.js';
import { labelsByTitle } from 'sorting.js';
import './FeedView.less';


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
        return <button className="square" title={title} onClick={this.handleClick}>
            <AscDescIcon ascending={this.props.order === ORDER_DATE} aria-hidden={true} />
        </button>;
    }
}
if (__debug__) {
    OrderToggle.propTypes = {
        order: PropTypes.oneOf([ORDER_TAIL, ORDER_DATE]).isRequired,
        onSetOrder: PropTypes.func.isRequired,
    };
}


/**
 * ListNav is displayed on list view pages to display tools that apply to the
 * whole snapshot.
 *
 * +---+----+-----------+------------------+-------------------+
 * | / |  - |           |                  |                   |
 * | \ | -- | 10 unread |                  |   mark all read   |
 * +---+----+-----------+------------------+-------------------+
 */
class ListNav extends React.PureComponent {
    render() {
        const {snapshot, onSetOrder, onMarkArticlesRead, returnLink, summary} = this.props;
        return <div className="bar list-nav">
            {returnLink}
            <OrderToggle order={snapshot.order} onSetOrder={onSetOrder} />
            {summary}
            <div className="expand" />
            {<MarkAllReadLink snapshot={snapshot} onMarkArticlesRead={onMarkArticlesRead} />}
        </div>;
    }
}

/**
 * SnapshotNav is displayed on article view pages to allow navigation to the
 * previous and next articles.
 *
 * +---+----+-----------------+------+------+------+-----+-----+
 * | / |  - |                 |      | fave | read |  ↓  |  ↑  |
 * | \ | -- | 1 of 10 unread  |      | fave | read |     |     |
 * +---+----+-----------------+------+------+------+-----+-----+
 */
class SnapshotNav extends React.PureComponent {
    render() {
        const { articleId, articleIds, read, fave, onMarkArticlesRead, onMarkArticlesFave, renderLink, left } = this.props;
        const index = articleIds.indexOf(articleId);
        const total = articleIds.length;
        const prevId = index !== 0 ? articleIds[index - 1] : null;
        const nextId = index < articleIds.length - 1 ? articleIds[index + 1] : null;

        return <div className="bar snapshot-nav">
            {left}
            <div className="expand">
                {/* This occupies empty space at the left of the bar. */}
            </div>
            <FaveToggleLink className="square" articleId={articleId} fave={fave} onMarkArticlesFave={onMarkArticlesFave} />
            <ReadToggleLink className="square" articleId={articleId} read={read} onMarkArticlesRead={onMarkArticlesRead} />
            {prevId ? renderLink({
                className: "snapshot-nav-prev square",
                title: "Go to previous article",
                articleId: prevId,
                children: <PrevIcon aria-hidden={true} />,
            }) : <span className="snapshot-nav-prev square" />}
            {this.props.icon ? <div className="snapshot-nav-icon square">{this.props.icon}</div> : null}
            {nextId ? renderLink({
                className: "snapshot-nav-next square",
                title: "Go to next article",
                articleId: nextId,
                children: <NextIcon aria-hidden={true} />,
            }) : <span className="snapshot-nav-next square" />}
        </div>
    }
}

if (__debug__) {
    SnapshotNav.propTypes = {
        articleIds: PropTypes.arrayOf(PropTypes.number).isRequired,
        articleId: PropTypes.number.isRequired,
        read: PropTypes.bool.isRequired,
        fave: PropTypes.bool.isRequired,
        // Event handlers
        onMarkArticlesRead: PropTypes.func.isRequired,
        onMarkArticlesFave: PropTypes.func.isRequired,
        // Render helpers
        renderLink: PropTypes.func.isRequired,
    };
}

function filterName(filter, total) {
    switch (filter) {
        case FILTER_UNREAD: return "unread";
        case FILTER_FAVE: return "favorite";
        case FILTER_ALL: return "";
    }
    return "";
}

function snapshotSummary(snapshot) {
    const total = snapshot.response.articleIds.length;
    return <div className="position">{total} {filterName(snapshot.filter) || (total === 1 ? "article" : "articles")}</div>;
}

function snapshotPosition(snapshot, articleId) {
    const {response: {articleIds}} = snapshot;
    const index = articleIds.indexOf(articleId);
    const total = articleIds.length;
    return <div className="position"><span>{index + 1} of {total}</span> {filterName(snapshot.filter)}</div>;
}


export function FeedHeader({icon, title, desc, snapshot, onSetOrder, onMarkArticlesRead}) {
    return <div className="feed-header">
        <h1>{icon} {title}</h1>
        {desc ? <p>{desc}</p> : null}
    </div>;
}



export function AllView({params, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const renderLink = props => <AllArticleLink filter={snapshot.filter} {...props} />;
    return <Fragment>
        <Title title="All Feeds" />
        <GlobalBar allSelected={true} />
        <FeedHeader
            icon={<GlobeIcon aria-hidden={true} />}
            title="All Feeds"
        />
        <Tabs>
            <AllLink aria-selected={snapshot.filter === FILTER_UNREAD} filter={FILTER_UNREAD} className="no-underline">Unread</AllLink>
            <AllLink aria-selected={snapshot.filter === FILTER_FAVE} filter={FILTER_FAVE} className="no-underline">Favorite</AllLink>
            <AllLink aria-selected={snapshot.filter === FILTER_ALL} filter={FILTER_ALL} className="no-underline">All</AllLink>
            <FeedListLink aria-selected={false} title="Manage Feeds" className="no-underline">
                <EditIcon aria-label="Manage Feeds" />
            </FeedListLink>
        </Tabs>
        {renderSnapshot(snapshot.response,
            () => renderArticleList(snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        <ListNav
            snapshot={snapshot}
            onSetOrder={onSetOrder}
            onMarkArticlesRead={onMarkArticlesRead}
            returnLink={<HomeLink aria-label="Home" title="Return home" className="square">
                    <ReturnIcon aria-hidden={true} />
            </HomeLink>}
            summary={snapshotSummary(snapshot)}
        />
    </Fragment>;
}

export function AllArticleView({params, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { articleId } = params;
    const renderLink = props => <AllArticleLink filter={snapshot.filter} {...props} />;
    const left = <>
        <AllLink filter={snapshot.filter} aria-label="All Feeds" title="Return to article list" className="square">
            <ReturnIcon aria-hidden={true} />
        </AllLink>
        <OrderToggle order={snapshot.order} onSetOrder={onSetOrder} />
        {snapshotPosition(snapshot, articleId)}
    </>;
    return <Fragment>
        <Title title={articleTitle(articlesById, articleId, "All Feeds")} />
        <GlobalBar />
        <FeedHeader
            icon={<GlobeIcon aria-hidden={true} />}
            title="All Feeds"
            snapshot={snapshot}
            onSetOrder={onSetOrder}
        />
        {renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink, left)}
    </Fragment>;
}

export function FeedView({params, feedsById, labelsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { feedId, filter } = params;
    const feed = feedsById[feedId];
    const feedTitle = feed.text || feed.title
    const renderLink = props => <FeedArticleLink feedId={feedId} filter={snapshot.filter} {...props} />;
    return <Fragment>
        <Title title={feedTitle} />
        <GlobalBar />
        <FeedHeader
            icon={<FeedIcon aria-hidden={true} />}
            title={feedTitle}
        />
        <Tabs>
            <FeedLink aria-selected={snapshot.filter === FILTER_UNREAD} feedId={feedId} filter={FILTER_UNREAD} className="no-underline">Unread <Count value={feed.unreadCount} /></FeedLink>
            <FeedLink aria-selected={snapshot.filter === FILTER_FAVE} feedId={feedId} filter={FILTER_FAVE} className="no-underline">Favorite <Count value={feed.faveCount} /></FeedLink>
            <FeedLink aria-selected={snapshot.filter === FILTER_ALL} feedId={feedId} filter={FILTER_ALL} className="no-underline">All</FeedLink>
            <FeedDetailLink aria-selected={false} feedId={feedId} title="Edit Feed" className="no-underline">
                <EditIcon aria-label="Edit Feed" />
            </FeedDetailLink>
        </Tabs>
        {renderSnapshot(snapshot.response,
            () => renderArticleList(snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        <ListNav
            snapshot={snapshot}
            onSetOrder={onSetOrder}
            onMarkArticlesRead={onMarkArticlesRead}
            returnLink={<FeedListLink title="Return to feed list" className="square">
                <ReturnIcon aria-hidden={true} />
            </FeedListLink>}
            summary={snapshotSummary(snapshot)}
        />
    </Fragment>;
}

export function FeedArticleView({params, feedsById, labelsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { feedId, filter, articleId } = params;
    const feed = feedsById[feedId];
    const feedTitle = feed.text || feed.title;
    const renderLink = props => <FeedArticleLink feedId={feedId} filter={snapshot.filter} {...props} />;
    const left = <>
        <FeedLink feedId={feedId} filter={snapshot.filter} aria-label={feedTitle} title="Return to article list" className="square">
            <ReturnIcon aria-hidden={true} />
        </FeedLink>
        <OrderToggle order={snapshot.order} onSetOrder={onSetOrder} />
        {snapshotPosition(snapshot, articleId)}
    </>;
    return <Fragment>
        <Title title={articleTitle(articlesById, articleId, feedTitle)} />
        <GlobalBar />
        <FeedHeader
            icon={<FeedIcon aria-hidden={true} />}
            title={feedTitle}
            snapshot={snapshot}
            onSetOrder={onSetOrder}
        />
        {renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink, left)}
    </Fragment>;
}


export function LabelView({params, labelsById, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { labelId, filter } = params;
    const label = labelsById[labelId];
    const renderLink = props => <LabelArticleLink labelId={labelId} filter={snapshot.filter} {...props} />;
    return <Fragment>
        <Title title={label.text} />
        <GlobalBar />
        <FeedHeader
            icon={<LabelIcon aria-hidden={true} />}
            title={label.text}
        />
        <Tabs>
            <LabelLink aria-selected={snapshot.filter === FILTER_UNREAD} labelId={labelId} filter={FILTER_UNREAD} className="no-underline">Unread <Count value={label.unreadCount} /></LabelLink>
            <LabelLink aria-selected={snapshot.filter === FILTER_FAVE} labelId={labelId} filter={FILTER_FAVE} className="no-underline">Favorite <Count value={label.faveCount} /></LabelLink>
            <LabelLink aria-selected={snapshot.filter === FILTER_ALL} labelId={labelId} filter={FILTER_ALL} className="no-underline">All</LabelLink>
            <LabelDetailLink aria-selected={false} labelId={labelId} title="Edit Label" className="no-underline">
                <EditIcon aria-label="Edit Label" />
            </LabelDetailLink>
        </Tabs>
        {renderSnapshot(snapshot.response,
            () => renderArticleList(snapshot.response.articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink),
            onLoadMore)}
        <ListNav
            snapshot={snapshot}
            onSetOrder={onSetOrder}
            onMarkArticlesRead={onMarkArticlesRead}
            returnLink={<FeedListLink title="Return to feed list" className="square">
                <ReturnIcon aria-hidden={true} />
            </FeedListLink>}
            summary={snapshotSummary(snapshot)}
        />
    </Fragment>;
}

export function LabelArticleView({params, labelsById, feedsById, layout, snapshot, articlesById, onSetView, onSetLayout, onSetOrder, onMarkArticlesRead, onMarkArticlesFave, onLoadMore}) {
    const { labelId, filter, articleId } = params;
    const label = labelsById[labelId];
    const renderLink = props => <LabelArticleLink labelId={labelId} filter={snapshot.filter} {...props} />;
    const left = <>
        <LabelLink labelId={labelId} filter={snapshot.filter} aria-label={label.text} title="Return to article list" className="square">
            <ReturnIcon aria-hidden={true} />
        </LabelLink>
        <OrderToggle order={snapshot.order} onSetOrder={onSetOrder} />
        {snapshotPosition(snapshot, articleId)}
    </>;
    return <Fragment>
        <Title title={articleTitle(articlesById, articleId, label.text)} />
        <GlobalBar />
        <FeedHeader
            icon={<LabelIcon aria-hidden={true} />}
            title={label.text}
            snapshot={snapshot}
            onSetOrder={onSetOrder}
        />
        {renderArticle(articleId, snapshot.response, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink, left)}
    </Fragment>;
}

const mapDispatchToProps = {
    onSetOrder: setOrder,
    onMarkArticlesRead: markArticlesRead,
    onMarkArticlesFave: markArticlesFave,
    onLoadMore: loadMore,
};
export const ConnectedAllView = connect(state => state, mapDispatchToProps)(AllView);
export const ConnectedAllArticleView = connect(state => state, mapDispatchToProps)(AllArticleView);
export const ConnectedFeedView = connect(state => state, mapDispatchToProps)(FeedView);
export const ConnectedFeedArticleView = connect(state => state, mapDispatchToProps)(FeedArticleView);
export const ConnectedLabelView = connect(state => state, mapDispatchToProps)(LabelView);
export const ConnectedLabelArticleView = connect(state => state, mapDispatchToProps)(LabelArticleView);


function MarkAllReadLink({snapshot, onMarkArticlesRead}) {
    const { loaded, params, articleIds } = snapshot.response;
    const disabled = (
        !loaded // Stuff is still loading.
        || articleIds.length < 1 // No articles present.
    )

    // TODO maybe add a checkbox icon here?
    // FIXME Should be <button>
    return <a href="#" onClick={e => {
        e.preventDefault();
        if (disabled) {
            return;
        }
        if (confirm("Mark " + articleIds.length + " articles read?")) {
            onMarkArticlesRead(articleIds, true);
        }
    }}>Mark all read</a>;
}

function Status(props) {
    return <div className="floater prop-sticky">
        <p className="floater-content">{props.children}</p>
    </div>;
}

function renderSnapshot(snapshotResponse, renderArticleList, onLoadMore) {
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
function renderArticle(articleId, {loaded, articleIds}, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink, left) {
    const index = loaded ? articleIds.indexOf(articleId) : -2;
    console.log(`renderArticle(${articleId}, {${loaded}, ${articleIds}}, ...) -> index ${index}`);
    var articleComponent, snapshotNav = null, article = null;
    switch (index) {
        case -2:
            // TODO Common 404 page style?
            articleComponent = <LoadingArticle />;
            article = {
                id: articleId,
                read: false,
                fave: false,
            };
            break;
        case -1:
            articleComponent = <Status>404: Article {articleId} does not exist</Status>;
            article = {
                id: articleId,
                read: false,
                fave: false,
            };
            break;
        default:
            article = articlesById[articleId];
            if (__debug__ && !article) {
                throw new Error(`renderArticle(${articleId}, ...) called before article entry added to store`);
            }
            // FIXME Shouldn't assume all feeds have loaded.
            const feed = feedsById[article.feedId];
            if (feed && !article.loading) {
                articleComponent = <Article feed={feed} {...article} />;
                snapshotNav = <SnapshotNav
                    articleIds={articleIds}
                    articleId={articleId}
                    read={article.read}
                    fave={article.fave}
                    onMarkArticlesRead={onMarkArticlesRead}
                    onMarkArticlesFave={onMarkArticlesFave}
                    renderLink={renderLink}
                    left={left}
                />;
            } else {
                articleComponent = <LoadingArticle />;
            }
    }
    return <div className="article-view">
        <div className="prop-sticky">
            {articleComponent}
        </div>
        {snapshotNav}
    </div>;
}

/**
 * Render the meat of a list view. This must only be called after the
 * snapshot has loaded.
 *
 * @param {number[]} articleIds
 *      List of article IDs in the order to render them. Not all may be present
 *      in the articlesById map, depending on what has loaded.
 */
function renderArticleList(articleIds, articlesById, feedsById, onMarkArticlesRead, onMarkArticlesFave, renderLink) {
    const elements = [];
    for (let id of articleIds) {
        const article = articlesById[id] || {loading: true};
        // FIXME Shouldn't assume all feeds have loaded.
        const feed = feedsById[article.feedId];
        elements.push(<ListArticle key={id} renderLink={renderLink} feed={feed} onMarkArticlesRead={onMarkArticlesRead} onMarkArticlesFave={onMarkArticlesFave} {...article} />);
    }
    return elements;
}

function articleTitle(articlesById, articleId, suffix) {
    if (articleId && articlesById[articleId]) {
        return (articlesById[articleId].title || "Untitled") + " - " + suffix;
    }
    return suffix;
}
