import React from 'react';
import { connect } from 'react-redux';
import { setLayout } from 'actions.js';
import { markArticle } from 'actions.js';

import Article from 'widgets/Article.js';
import Loading from 'widgets/Loading.js';
import { ViewButton } from 'widgets/ViewControls.js';
import { Logo } from 'widgets/icons.js';
import { RootLink, FeedLink } from 'widgets/links.js';
import StateToggle from 'widgets/StateToggle.js';
import './ArticleView.less';


function ArticleView(props) {
    const { dispatch, layout, articlesById, params: { articleId }, feedsById } = props;
    const article = articlesById[articleId];
    const feed = feedsById[article.feedId];
    return <div className="article-view">
        <div className="global-tools">
            <RootLink className="text-button">
                <span className="button"><Logo /></span>
                Return to Feed List
            </RootLink>
            <ViewButton onSetLayout={(layout) => dispatch(setLayout(layout))} />
        </div>
        <div className={"layout-" + layout}>
            {renderArticle(article, feed, dispatch)}
        </div>
    </div>;
}

function renderArticle(article, feed, dispatch) {
    if (!article || article.loading) {
        return <div className="placeholder"><Loading /></div>;
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
    params: React.PropTypes.shape({
        articleId: React.PropTypes.string.isRequired,
    }).isRequired,
    articlesById: React.PropTypes.objectOf(React.PropTypes.object).isRequired,
    feedsById: React.PropTypes.objectOf(React.PropTypes.object).isRequired,
};

module.exports = connect(state => {
    return {
        articlesById: state.articlesById,
        feedsById: state.feedsById,
        layout: state.layout,
    };
}, null)(ArticleView);
