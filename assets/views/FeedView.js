import React from 'react';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setLayout, setFilter, setOrder } from 'actions.js';
import { markArticle, markArticles } from 'actions.js';
import { VIEW_LIST, VIEW_TEXT } from 'actions.js';
import { FILTER_DONE } from 'actions.js';

import { ViewButton } from 'widgets/ViewControls.js';
import { Logo } from 'widgets/icons.js';
import Article from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { RootLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import { FeedLink } from 'widgets/links.js';
import Loading from 'widgets/Loading.js';
import Header from 'widgets/Header.js';
import './FeedView.less';


const VIEW_TO_WIDGET = {
    [VIEW_LIST]: ListArticle,
    [VIEW_TEXT]: Article,
};

export function AllView({params, feedsById, view, layout, snapshot, articlesById, onSetView, onSetLayout, onSetFilter, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
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
                filter={snapshot.filter} onSetFilter={onSetFilter}
                order={snapshot.order} onSetOrder={onSetOrder} />
        </div>
        <Header text="All Feeds" />
        {renderTools(snapshot, onMarkArticles)}
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById, onMarkArticle),
            () => onLoadMore(snapshot.articleIds))}
    </div>;
}

export function FeedView({params, feedsById, view, layout, snapshot, articlesById, onSetView, onSetLayout, onSetFilter, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
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
                filter={snapshot.filter} onSetFilter={onSetFilter}
                order={snapshot.order} onSetOrder={onSetOrder} />
        </div>
        <Header text={feed.text || feed.title} />
        {renderTools(snapshot, onMarkArticles)}
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById, onMarkArticle),
            () => onLoadMore(snapshot.articleIds))}
    </div>;
}

export function LabelView({params, labelsById, feedsById, view, layout, snapshot, articlesById, onSetView, onSetLayout, onSetFilter, onSetOrder, onMarkArticle, onMarkArticles, onLoadMore}) {
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
                filter={snapshot.filter} onSetFilter={onSetFilter}
                order={snapshot.order} onSetOrder={onSetOrder} />
        </div>
        <Header text={label.text} />
        {renderTools(snapshot, onMarkArticles)}
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById, onMarkArticle),
            () => onLoadMore(snapshot.articleIds))}
    </div>;
}

const mapDispatchToProps = {
    onSetView: setView,
    onSetLayout: setLayout,
    onSetFilter: setFilter,
    onSetOrder: setOrder,
    onMarkArticle: markArticle,
    onMarkArticles: markArticles,
    onLoadMore: loadMore,
};
export const ConnectedAllView = connect(state => state, mapDispatchToProps)(AllView);
export const ConnectedFeedView = connect(state => state, mapDispatchToProps)(FeedView);
export const ConnectedLabelView = connect(state => state, mapDispatchToProps)(LabelView);

function renderTools(snapshot, onMarkArticles) {
    // Stuff is still loading.
    if (!snapshot || snapshot.loading) {
        return null;
    }
    // There is no point in marking zero articles anything.
    if (!snapshot.articleIds.length || snapshot.filter === FILTER_DONE) {
        return null;
    }
    return <div className="floater-wrap">
        <div className="floater">
            <a href="#" onClick={e => {
                e.preventDefault();
                if (confirm("Mark " + snapshot.articleIds.length + " articles done?")) {
                    onMarkArticles(snapshot.articleIds, FILTER_DONE);
                }
            }}>Mark all done</a>
        </div>
    </div>;
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
