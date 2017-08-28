// This file is the Webpack entry point to the whole codebase.
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';
import { Provider, connect } from 'react-redux';
import React from 'react';
import ReactDOM from 'react-dom';
import createHistory from 'history/createBrowserHistory';

import './base.less';
import syncViewOptions from './syncViewOptions.js';
import ConnectedArticleView from 'views/ArticleView.js';
import { ConnectedAllView, ConnectedFeedView, ConnectedLabelView } from 'views/FeedView.js';
import ConnectedRootView from 'views/RootView.js';
import { ConnectedAddFeedView, ConnectedInventoryView } from 'views/InventoryView.js';
import reducer from 'reducer.js';
import { setLocation, loadFeeds, loadMore, showAll, showFeed, showLabel } from './actions.js';

const history = createHistory();
const store = createStore(reducer, applyMiddleware(thunk, createLogger()));

syncViewOptions(store, window.localStorage);

store.dispatch(setLocation(history.location));
history.listen((location, action) => {
    store.dispatch(setLocation(location));
});

const ROUTES = [{
    pattern: /^$/,
    render: () => <ConnectedRootView />,
}, {
    pattern: /^inventory\/$/,
    render: () => <ConnectedInventoryView />,
    onEnter: _ => loadFeeds(),
}, {
    pattern: /^inventory\/add\/$/,
    render: () => <ConnectedAddFeedView />,
}, {
    pattern: /^article\/(\d+)\/$/,
    render: articleId => <ConnectedArticleView params={{articleId}} />,
    onEnter: articleId => loadMore([articleId]),
}, {
    pattern: /^all\/([^\/]+)\/$/,
    render: filter => <ConnectedAllView params={{filter}} />,
    onEnter: filter => showAll(filter, null),
}, {
    pattern: /^all\/([^\/]+)\/(\d+)\/$/,
    render: (filter, articleId) => <ConnectedAllView params={{filter, articleId}} />,
    onEnter: (filter, articleId) => showAll(filter, Number(articleId)),
}, {
    pattern: /^label\/(\d+)\/([^\/]+)\/$/,
    render: (labelId, filter) => <ConnectedLabelView params={{labelId, filter}} />,
    onEnter: (labelId, filter) => showLabel(Number(labelId), filter, null),
}, {
    pattern: /^label\/(\d+)\/([^\/]+)\/(\d+)\/$/,
    render: (labelId, filter, articleId) => <ConnectedLabelView params={{labelId, filter, articleId}} />,
    onEnter: (labelId, filter, articleId) => showLabel(Number(labelId), filter, Number(articleId)),
}, {
    pattern: /^feed\/(\d+)\/([^\/]+)\/$/,
    render: (feedId, filter) => <ConnectedFeedView params={{feedId, filter}} />,
    onEnter: (feedId, filter) => showLabel(Number(feedId), filter, null),
}, {
    pattern: /^feed\/(\d+)\/([^\/]+)\/(\d+)\/$/,
    render: (feedId, filter, articleId) => <ConnectedFeedView params={{feedId, filter, articleId}} />,
    onEnter: (feedId, filter, articleId) => showLabel(Number(feedId), filter, Number(articleId)),
}];

// FIXME PureRenderingMixin?
/**
 * Component which selects its sub-component based on the URL path.
 */
const Router = React.createClass({
    propTypes: {
        location: React.PropTypes.shape({
            pathname: React.PropTypes.string,
            search: React.PropTypes.string,
            hash: React.PropTypes.string,
        }),
    },
    render() {
        const { pathname: fullpath, search, hash } = this.props.location;
        const pathname = fullpath.slice(1); // Remove leading slash
        console.log("routing", pathname);
        for (var i = 0; i < ROUTES.length; i++) {
            var {pattern, render, onEnter} = ROUTES[i];
            var m = pattern.exec(pathname);
            if (m) {
                console.log('route match:', m);
                var params = m.slice(1);
                if (onEnter) {
                    var action = onEnter.apply(null, params);
                    if (action) {
                        console.log(m, 'onEnter ->', action);
                        store.dispatch(action);
                    }
                }
                return render.apply(null, params);
            }
        }
        // FIXME better 404 page
        return <p>Client-side 404: The location {pathname} {search} {hash} did not match a route.</p>;
    },
});

const ConnectedRouter = connect(state => state, null)(Router);


// Only render the app on pages that are run by JS (not, say, login pages).
const appElement = document.getElementById("app");
if (appElement) {
    ReactDOM.render(
        <Provider store={store}>
            <div id="yarrharr">
                <ConnectedRouter />
            </div>
        </Provider>,
        appElement
    );
}
