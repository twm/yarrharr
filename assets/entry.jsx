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
import syncLocation from './syncLocation.js';
import ConnectedArticleView from 'views/ArticleView.js';
import { ConnectedAllView, ConnectedFeedView, ConnectedLabelView } from 'views/FeedView.js';
import ConnectedRootView from 'views/RootView.js';
import { ConnectedAddFeedView, ConnectedInventoryView } from 'views/InventoryView.js';
import reducer from 'reducer.js';
import { setPath, ROUTES } from './actions.js';
import { loadFeeds, loadMore, showAll, showFeed, showLabel } from './actions.js';

const __debug__ = process.env.NODE_ENV !== 'production';

const store = createStore(reducer, applyMiddleware(thunk, createLogger()));

syncViewOptions(store, window.localStorage);
syncLocation(store, window);

const routeToView = {
    '/': ConnectedRootView,
    '/inventory': ConnectedInventoryView,
    '/inventory/add': ConnectedAddFeedView,
    '/article/:articleId': ConnectedArticleView,
    '/all/:filter': ConnectedAllView,
    '/all/:filter/:articleId': ConnectedAllView,
    '/label/:labelId/:filter': ConnectedLabelView,
    '/label/:labelId/:filter/:articleId': ConnectedLabelView,
    '/feed/:feedId/:filter': ConnectedFeedView,
    '/feed/:feedId/:filter/:articleId': ConnectedFeedView,
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
