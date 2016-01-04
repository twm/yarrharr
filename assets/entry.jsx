// This file is the Webpack entry point to the whole codebase.
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunkMiddleware from 'redux-thunk';
import createLogger from 'redux-logger';
import { Provider, connect } from 'react-redux';
import { Router, Route, IndexRoute, Link } from 'react-router';
import { createHistory, useQueries } from 'history';
import { syncReduxAndRouter, routeReducer } from 'redux-simple-router';
import React from 'react';
import ReactDOM from 'react-dom';

import './base.less';
import ArticleView from 'views/ArticleView.js';
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


const Root = React.createClass({
    render() {
        return <div id="yarrharr">{this.props.children}</div>;
    }
});




function LabelView(props) {
    return <div>Label {props.params.labelId}</div>;
}
const LabelViewRedux = connect(state => state, null)(LabelView);


import { loadMore, showFeed, setFilter } from './actions.js';
ReactDOM.render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={Root}>
                <IndexRoute component={RootView} />
                <Route path="article/:articleId" component={ArticleView} onEnter={(nextState) => {
                    store.dispatch(loadMore([nextState.params.articleId]));
                }} />
                <Route path="label/:labelId" component={LabelViewRedux} />
                <Route path="feed/:feedId" component={FeedView} onEnter={(nextState) => {
                    // XXX: Icky hack.
                    var search = nextState.location.search;
                    var match = /filter=(new|saved|all)/.exec(search);
                    console.log('search', search, 'match', match);
                    if (match[1]) {
                        store.dispatch(setFilter(match[1]));
                    }
                    store.dispatch(showFeed(nextState.params.feedId));
                }} />
            </Route>
        </Router>
    </Provider>,
    document.getElementById("app")
);
