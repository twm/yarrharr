import React from 'react';
import { connect } from 'react-redux';
import Article from 'widgets/Article.js';
import Loading from 'widgets/Loading.js';
import { Logo } from 'widgets/icons.js';
import { RootLink, FeedLink } from 'widgets/links.js';
import { markArticle } from 'actions.js';
import './ArticleView.less';

function ArticleView(props) {
    const { dispatch, articlesById, params: { articleId }, feedsById } = props;
    const article = articlesById[articleId];
    // FIXME: This shouldn't hardcode view-wide
    return <div className="article-view view-wide">
        <div className="controls">
            <RootLink className="toolbar-button" title="Return to feed list">
                <Logo />
            </RootLink>
        </div>
        {renderArticle(article)}
    </div>;
}

function renderArticle(article) {
    if (!article || article.loading) {
        return <div className="placeholder"><Loading /></div>;
    }
    return <Article
        feed={props.feedsById[article.feedId]}
        onMark={(articleId, targetState) => dispatch(markArticle(articleId, targetState))}
        {...article} />;
k}
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

