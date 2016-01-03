import React from 'react';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setFilter, setOrder } from 'actions.js';
import { markArticle } from 'actions.js';
import { VIEW_LIST, VIEW_NARROW, VIEW_WIDE } from 'actions.js';

import DropButton from 'widgets/DropButton.js';
import Logo from 'widgets/Logo.js';
import Article from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { RootLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import ViewControls from 'widgets/ViewControls.js';
import { FeedLink } from 'widgets/links.js';
import './FeedView.less';


const VIEW_TO_WIDGET = {
    [VIEW_LIST]: ListArticle,
    [VIEW_NARROW]: Article,
    [VIEW_WIDE]: Article,
};


function ViewButton({open}) {
    const className = (open ? "toolbar-button-dropping " : "") + "toolbar-button toolbar-button-text";
    // TODO: Use icon
    return <button className={className}>View ▾</button>
}


function FeedView({params, feedsById, view, snapshot, articlesById, dispatch}) {
    const feedId = params.feedId;
    const feed = feedsById[feedId];
    return <div className={"feed-view view-" + view}>
        <div className="controls">
            <RootLink className="toolbar-button" title="Return to feed list">
                <Logo />
            </RootLink>
            <div className="feed-title">{feed.text || feed.title}</div>
            <DropButton trigger={ViewButton}>
                <ViewControls snapshot={snapshot}
                    onSetView={(view) => dispatch(setView(view))}
                    onSetFilter={(filter) => dispatch(setFilter(filter))}
                    onSetOrder={(order) => dispatch(setOrder(order))} />
            </DropButton>
        </div>
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById,
                (articleId, targetState) => dispatch(markArticle(articleId, targetState))),
            () => dispatch(loadMore(snapshot.articleIds)))}
    </div>;
}


function renderSnapshot(snapshot, renderArticles, onNearBottom) {
    if (!snapshot || snapshot.loading) {
        return <p className="placeholder">Loading&hellip;</p>;
    }
    if (snapshot.error) {
        return <p className="placeholder">Failed to load (reload to retry)</p>;
    }
    if (snapshot.articleIds.length === 0) {
        return <p className="placeholder">No articles</p>;
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
                elements.push(<p key="loading">Loading&hellip;</p>);
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


module.exports = connect(state => state, null)(FeedView);
