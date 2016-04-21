import React from 'react';
import { connect } from 'react-redux';
import Article from 'widgets/Article.js';
import Loading from 'widgets/Loading.js';
import { Logo } from 'widgets/icons.js';
import { RootLink, FeedLink } from 'widgets/links.js';
import { markArticle } from 'actions.js';
import StateToggle from 'widgets/StateToggle.js';
import './ArticleView.less';

function ArticleView(props) {
    const { dispatch, articlesById, params: { articleId }, feedsById } = props;
    const article = articlesById[articleId];
    const feed = feedsById[article.feedId];
    // FIXME: This shouldn't hardcode view-wide
    return <div className="article-view">
        <div className="global-tools">
            <RootLink title="Return to feed list">
                <Logo />
            </RootLink>
        </div>
        <div className="view-wide">
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
    };
}, null)(ArticleView);

