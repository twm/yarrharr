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

// Only render the app on pages that are run by JS (not, say, login pages).
//
// XXX Apologies for the ternary operator, I didn't want to trash the blame for
// a temporary hack...
const appElement = document.getElementById("app");
appElement ? ReactDOM.render(
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
                    store.dispatch(showAll(nextState.params.filter, null));
                }} />
                <Route path="all/:filter/:articleId" component={ConnectedAllView} onEnter={(nextState) => {
                    store.dispatch(showAll(nextState.params.filter, Number(nextState.params.articleId)));
                }} />
                <Route path="label/:labelId/:filter" component={ConnectedLabelView} onEnter={(nextState) => {
                    store.dispatch(showLabel(Number(nextState.params.labelId), nextState.params.filter, null));
                }} />
                <Route path="label/:labelId/:filter/:articleId" component={ConnectedLabelView} onEnter={(nextState) => {
                    store.dispatch(showLabel(Number(nextState.params.labelId), nextState.params.filter, Number(nextState.params.articleId)));
                }} />
                <Route path="feed/:feedId/:filter" component={ConnectedFeedView} onEnter={(nextState) => {
                    store.dispatch(showFeed(Number(nextState.params.feedId), nextState.params.filter, null));
                }} />
                <Route path="feed/:feedId/:filter/:articleId" component={ConnectedFeedView} onEnter={(nextState) => {
                    store.dispatch(showFeed(Number(nextState.params.feedId), nextState.params.filter, Number(nextState.params.articleId)));
                }} />
            </Route>
        </Router>
    </Provider>,
    appElement
) : null;
