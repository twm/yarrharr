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
import { setPath, ROUTES } from './actions.js';
import { loadFeeds, loadMore, showAll, showFeed, showLabel } from './actions.js';

const __debug__ = process.env.NODE_ENV !== 'production';

const history = createHistory();
const store = createStore(reducer, applyMiddleware(thunk, createLogger()));

syncViewOptions(store, window.localStorage);

store.dispatch(setPath(history.location.pathname));
history.listen((location, action) => {
    store.dispatch(setPath(location.pathname));
});

const _ROUTES = [{
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

const routeToView = {
    '': ConnectedRootView,
    'inventory': ConnectedInventoryView,
    'inventory/add': ConnectedAddFeedView,
    'article/:articleId': ConnectedArticleView,
    'all/:filter': ConnectedAllView,
    'all/:filter/:articleId': ConnectedAllView,
    'label/:labelId/:filter': ConnectedLabelView,
    'label/:labelId/:filter/:articleId': ConnectedLabelView,
    'feed/:feedId/:filter': ConnectedFeedView,
    'feed/:feedId/:filter/:articleId': ConnectedFeedView,
};

// FIXME PureRenderingMixin?
/**
 * Component which selects its sub-component based on the URL path.
 */
const Router = React.createClass({
    propTypes: {
        path: React.PropTypes.string.isRequired,
        route: React.PropTypes.string.isRequired,
        params: React.PropTypes.object.isRequired,
    },
    render() {
        const { path, route, params } = this.props;
        const Component = routeToView[route];
        if (Component) {
            return <Component params={params} />;
        }
        return <p>Client-side 404: The location {path} {route} did not match a route.</p>;
    },
});

const ConnectedRouter = connect(state => state.route, null)(Router);

if (__debug__) {
    ROUTES.forEach(route => {
        if (!routeToView[route]) {
            throw new Error(`The route pattern '${route}' is present in ROUTES but not in routeToView`);
        }
    });
    Object.keys(routeToView).forEach(route => {
        if (ROUTES.indexOf(route) < 0) {
            throw new Error(`The route pattern '${route}' is present in routeToView but not in ROUTES`);
        }
    });
}


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
