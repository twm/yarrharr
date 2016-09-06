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
import syncViewOptions from './syncViewOptions.js';
import ConnectedArticleView from 'views/ArticleView.js';
import { ConnectedAllView, ConnectedFeedView, ConnectedLabelView } from 'views/FeedView.js';
import ConnectedRootView from 'views/RootView.js';
import { ConnectedAddFeedView, ConnectedInventoryView } from 'views/InventoryView.js';
import reducer from 'reducer.js';


const store = createStore(reducer, applyMiddleware(thunk, createLogger()));

const history = syncHistoryWithStore(browserHistory, store);
syncViewOptions(store, window.localStorage);

const Root = React.createClass({
    render() {
        return <div id="yarrharr">{this.props.children}</div>;
    }
});


import { loadFeeds, loadMore, showAll, showFeed, showLabel } from './actions.js';
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
                <Route path="all/:filter" component={ConnectedAllView} onEnter={(nextState) => {
                    store.dispatch(showAll(nextState.params.filter));
                }} />
                <Route path="label/:labelId/:filter" component={ConnectedLabelView} onEnter={(nextState) => {
                    store.dispatch(showLabel(nextState.params.labelId, nextState.params.filter));
                }} />
                <Route path="feed/:feedId/:filter" component={ConnectedFeedView} onEnter={(nextState) => {
                    store.dispatch(showFeed(nextState.params.feedId, nextState.params.filter));
                }} />
            </Route>
        </Router>
    </Provider>,
    document.getElementById("app")
);
