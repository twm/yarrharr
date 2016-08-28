// This file is the Webpack entry point to the whole codebase.
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';
import { Provider, connect } from 'react-redux';
import { Router, Route, IndexRoute, browserHistory } from 'react-router';
import { syncHistoryWithStore } from 'react-router-redux';
import React from 'react';
import ReactDOM from 'react-dom';

import './base.less';
import ConnectedArticleView from 'views/ArticleView.js';
import { ConnectedAllView, ConnectedFeedView, ConnectedLabelView } from 'views/FeedView.js';
import ConnectedRootView from 'views/RootView.js';
import { ConnectedAddFeedView, ConnectedInventoryView } from 'views/InventoryView.js';
import reducer from 'reducer.js';

const saveToLocalStorage = store => next => action => {
    const result = next(action);
    const state = store.getState();
    // XXX: TODO: Don't set this every state change?
    if (state) {
        window.localStorage.setItem('view', state.view);
        window.localStorage.setItem('layout', state.layout);
        if (state.snapshot) {
            window.localStorage.setItem('order', state.snapshot.order);
            window.localStorage.setItem('filter', state.snapshot.filter);
        }
    }
    return result;
};

const store = createStore(reducer, applyMiddleware(thunk, createLogger(), saveToLocalStorage));
const history = syncHistoryWithStore(browserHistory, store);

const Root = React.createClass({
    render() {
        return <div id="yarrharr">{this.props.children}</div>;
    }
});


function filterActionForState(nextState) {
    // XXX: Icky hack.
    var search = nextState.location.search;
    var match = /filter=(new|saved|all)/.exec(search);
    console.log('search', search, 'match', match);
    if (match && match[1]) {
        return setFilter(match[1]);
    }
    return null;
}


import { loadFeeds, loadMore, showAll, showFeed, showLabel, setFilter } from './actions.js';
ReactDOM.render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={Root}>
                <IndexRoute component={ConnectedRootView} />
                <Route path="inventory" component={ConnectedInventoryView} onEnter={(nextState) => {
                    store.dispatch(loadFeeds());
                }} />
                <Route path="inventory/add" component={ConnectedAddFeedView} />
                <Route path="article/:articleId" component={ConnectedArticleView} onEnter={(nextState) => {
                    store.dispatch(loadMore([nextState.params.articleId]));
                }} />
                <Route path="all" component={ConnectedAllView} onEnter={(nextState) => {
                    var filter;
                    if (filter = filterActionForState(nextState)) {
                        store.dispatch(filter);
                    }
                    store.dispatch(showAll());
                }} />
                <Route path="label/:labelId" component={ConnectedLabelView} onEnter={(nextState) => {
                    var filter;
                    if (filter = filterActionForState(nextState)) {
                        store.dispatch(filter);
                    }
                    store.dispatch(showLabel(nextState.params.labelId));
                }} />
                <Route path="feed/:feedId" component={ConnectedFeedView} onEnter={(nextState) => {
                    var filter;
                    if (filter = filterActionForState(nextState)) {
                        store.dispatch(filter);
                    }
                    store.dispatch(showFeed(nextState.params.feedId));
                }} />
            </Route>
        </Router>
    </Provider>,
    document.getElementById("app")
);
