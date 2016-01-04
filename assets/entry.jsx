// This file is the Webpack entry point to the whole codebase.
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { Provider, connect } from 'react-redux';
import { Router, Route, IndexRoute, Link } from 'react-router';
import { createHistory } from 'history';
import { syncReduxAndRouter, routeReducer } from 'redux-simple-router';
import React from 'react';
import ReactDOM from 'react-dom';

import './base.less';
import FeedView from 'views/FeedView.js';
import RootView from 'views/RootView.js';
import reducer from 'reducer.js';

const middleware = [
    thunkMiddleware,
    createLogger(),
];
const store = applyMiddleware(...middleware)(createStore)(reducer);

const history = createHistory();
syncReduxAndRouter(history, store);

import Article from 'widgets/Article.js';
var ArticleView = (props) => {
    const article = props.articlesById[props.params.articleId];
    if (article) {
        return <Article feed={props.feedsById[article.feedId]} {...article} />;
    } else {
        return <div>Loading article {props.params.articleId}&hellip;</div>;
    }
}
ArticleView.propTypes = {
    params: React.PropTypes.shape({
        articleId: React.PropTypes.string.isRequired,
    }).isRequired,
    articlesById: React.PropTypes.objectOf(React.PropTypes.object).isRequired,
    feedsById: React.PropTypes.objectOf(React.PropTypes.object).isRequired,
};

const ArticleViewRedux = connect(state => {
    return {
        articlesById: state.articlesById,
        feedsById: state.feedsById,
    };
}, null)(ArticleView);

const Root = React.createClass({
    render() {
        return <div id="yarrharr">{this.props.children}</div>;
    }
});




function LabelView(props) {
    return <div>Label {props.params.labelId}</div>;
}
const LabelViewRedux = connect(state => state, null)(LabelView);


import { showFeed } from './actions.js';
ReactDOM.render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={Root}>
                <IndexRoute component={RootView} />
                <Route path="article/:articleId" component={ArticleViewRedux} />
                <Route path="label/:labelId" component={LabelViewRedux} />
                <Route path="feed/:feedId" component={FeedView} onEnter={(nextState) => {
                    store.dispatch(showFeed(nextState.params.feedId));
                }} />
            </Route>
        </Router>
    </Provider>,
    document.getElementById("app")
);
