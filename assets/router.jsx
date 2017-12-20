import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';

import { setPath, ORIGIN_CLICK, ROUTES } from './actions.js';

import { ConnectedAllView, ConnectedFeedView, ConnectedLabelView } from 'views/FeedView.js';
import ConnectedRootView from 'views/RootView.js';
import { ConnectedAddFeedView, ConnectedInventoryView, ConnectedManageFeedView, ConnectedManageLabelView } from 'views/InventoryView.js';

const __debug__ = process.env.NODE_ENV !== 'production';

const routeToView = {
    '/': ConnectedRootView,
    '/inventory': ConnectedInventoryView,
    '/inventory/add': ConnectedAddFeedView,
    '/inventory/feed/:feedId': ConnectedManageFeedView,
    '/inventory/label/:labelId': ConnectedManageLabelView,
    '/all/:filter': ConnectedAllView,
    '/all/:filter/:articleId': ConnectedAllView,
    '/label/:labelId/:filter': ConnectedLabelView,
    '/label/:labelId/:filter/:articleId': ConnectedLabelView,
    '/feed/:feedId/:filter': ConnectedFeedView,
    '/feed/:feedId/:filter/:articleId': ConnectedFeedView,
};

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

/**
 * Component which selects its sub-component based on the URL path.
 */
export class Router extends React.Component {
    render() {
        const { path, route, params } = this.props;
        if (route == null) {
            return null;  // Can't render yet.
        }
        const Component = routeToView[route];
        if (Component) {
            return <Component params={params} />;
        }
        return <p>Client-side 404: The location {path} {route} did not match a route.</p>;
    }
    componentDidUpdate(prevProps) {
        if (this.props.path !== prevProps.path && this.props.scrollX !== null) {
            // console.log(`scroll(${this.props.scrollX}, ${this.props.scrollY}) for new route ${this.props.path}`);
            window.scrollTo(this.props.scrollX, this.props.scrollY);
        }
    }
}

if (__debug__) {
    Router.propTypes = {
        path: PropTypes.string.isRequired,
        route: PropTypes.string.isRequired,
        params: PropTypes.object.isRequired,
        scrollX: PropTypes.number,  // null to disable automatic scroll
        scrollY: PropTypes.number,
    };
}

export const ConnectedRouter = connect(state => state.route, null)(Router);
