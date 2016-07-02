import React from 'react';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setLayout, setFilter, setOrder } from 'actions.js';
import { markArticle } from 'actions.js';
import { VIEW_LIST, VIEW_TEXT } from 'actions.js';

import { ViewButton } from 'widgets/ViewControls.js';
import { Logo } from 'widgets/icons.js';
import Article from 'widgets/Article.js';
import ListArticle from 'widgets/ListArticle.js';
import { RootLink } from 'widgets/links.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import { FeedLink } from 'widgets/links.js';
import Loading from 'widgets/Loading.js';
import './FeedView.less';


const VIEW_TO_WIDGET = {
    [VIEW_LIST]: ListArticle,
    [VIEW_TEXT]: Article,
};

export function FeedView({params, feedsById, view, layout, filter, order, snapshot, articlesById, dispatch}) {
    const feedId = params.feedId;
    const feed = feedsById[feedId];
    return <div className={"feed-view layout-" + layout}>
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton
                view={view}
                onSetView={(view) => dispatch(setView(view))}
                layout={layout}
                onSetLayout={(layout) => dispatch(setLayout(layout))}
                filter={snapshot.filter}
                onSetFilter={(filter) => dispatch(setFilter(filter))}
                order={snapshot.order}
                onSetOrder={(order) => dispatch(setOrder(order))} />
        </div>
        <div className="floater-wrap">
            <div className="floater feed-masthead">
                <h1>{feed.text || feed.title}</h1>
            </div>
        </div>
        {renderSnapshot(snapshot,
            () => renderArticles(view, snapshot.articleIds, articlesById, feedsById,
                (articleId, targetState) => dispatch(markArticle(articleId, targetState))),
            () => dispatch(loadMore(snapshot.articleIds)))}
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


export default connect(state => state, null)(FeedView);
