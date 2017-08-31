import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { setLayout } from 'actions.js';
import { markArticle } from 'actions.js';

import Article from 'widgets/Article.js';
import { ViewButton } from 'widgets/ViewControls.js';
import { Logo } from 'widgets/icons.js';
import { RootLink, FeedLink } from 'widgets/links.js';
import { LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import StateToggle from 'widgets/StateToggle.js';
import './ArticleView.less';


export function ArticleView(props) {
    const { dispatch, layout, articlesById, params: { articleId }, feedsById } = props;
    const article = articlesById[articleId];
    const feed = feedsById[article.feedId];
    return <div className="article-view">
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton layout={layout} onSetLayout={(layout) => dispatch(setLayout(layout))} />
        </div>
        <div className={"layout-" + layout}>
            {renderArticle(article, feed, dispatch)}
        </div>
    </div>;
}

function renderArticle(article, feed, dispatch) {
    if (!article || article.loading) {
        return <div className="floater">
            <p className="floater-content">Loading</p>
        </div>;
    }
    return <Article
        feed={feed}
        onMark={(articleId, targetState) => dispatch(markArticle(articleId, targetState))}
        {...article} />;
}

function renderArticleSummary(article, feed) {
    if (!article.id || article.loading) {
        return <div className="article-toolbar-summary" />
    }
    return <div className="article-toolbar-summary">
        {article.title}<br />From {feed.text || feed.title}
    </div>;
}

ArticleView.propTypes = {
    params: PropTypes.shape({
        articleId: PropTypes.string.isRequired,
    }).isRequired,
    articlesById: PropTypes.objectOf(PropTypes.object).isRequired,
    feedsById: PropTypes.objectOf(PropTypes.object).isRequired,
    layout: PropTypes.oneOf([LAYOUT_NARROW, LAYOUT_WIDE]).isRequired,
};

export default connect(state => {
    return {
        articlesById: state.articlesById,
        feedsById: state.feedsById,
        layout: state.layout,
    };
}, null)(ArticleView);
