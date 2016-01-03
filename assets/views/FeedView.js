import React from 'react';
import { connect } from 'react-redux';
import { showFeed, loadMore } from 'actions.js';
import { setView, setFilter, setOrder } from 'actions.js';

import { Link } from 'react-router';
import DropButton from 'widgets/DropButton.js';
import Logo from 'widgets/Logo.js';
import Article from 'widgets/Article.js';
import ScrollSpy from 'widgets/ScrollSpy.js';
import ViewControls from 'widgets/ViewControls.js';
import './FeedView.less';


function ViewButton({open}) {
    const className = (open ? "toolbar-button-dropping " : "") + "toolbar-button toolbar-button-text";
    // TODO: Use icon
    return <button className={className}>View ▾</button>
}


function FeedView({params, feedsById, snapshot, articlesById, dispatch}) {
    const feedId = params.feedId;
    const feed = feedsById[feedId];
    const controls = <div className="controls">
        <Link to="/" className="toolbar-button" title="Return to feed list">
            <Logo />
        </Link>
        <div className="feed-title">{feed.text || feed.title}</div>
        <DropButton trigger={ViewButton}>
            <ViewControls snapshot={snapshot}
                onSetView={(view) => dispatch(setView(view))}
                onSetFilter={(filter) => dispatch(setFilter(filter))}
                onSetOrder={(order) => dispatch(setOrder(order))} />
        </DropButton>
    </div>;
    if (!snapshot || snapshot.loading) {
        return (
            <div>
                {controls}
                <p className="placeholder">Loading&hellip;</p>
            </div>
        );
    }
    if (snapshot.error) {
        return (
            <div>
                {controls}
                <p className="placeholder">
                    Failed to load&hellip;
                    <a href={`/feeds/${feedId}/`} onClick={(event) => {
                        event.preventDefault();
                        dispatch(showFeed(feedId));
                    }}>retry</a>.
                </p>
            </div>
        );
    }
    return (
        <div>
            {controls}
            {(snapshot.articleIds.length > 0)
                ? <ScrollSpy onNearBottom={() => { dispatch(loadMore(snapshot.articleIds)); }}>
                    {renderArticles(snapshot.articleIds, articlesById, feedsById)}
                </ScrollSpy>
                : <p className="placeholder">No articles</p>}
        </div>
    );
}

function renderArticles(articleIds, articlesById, feedsById) {
    if (!articleIds.length) {
        return <p>No articles</p>;
    }
    const elements = [];
    for (let id of articleIds) {
        const article = articlesById[id];
        if (article) {
            if (article.loading) {
                elements.push(<p>Loading&hellip;</p>);
                break;
            }
            // TODO: Handle errors
            const feed = feedsById[article.feedId];
            elements.push(<Article key={id} feed={feed} {...article} />);
        } else {
            // We only render up to the first unavailable article.  This
            // ensures that loading always occurs at the end.
            break;
        }
    }
    return elements;
}


module.exports = connect(state => state, null)(FeedView);
