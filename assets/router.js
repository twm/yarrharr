import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';

import { ORIGIN_CLICK, ROUTES } from './actions.js';

import { ConnectedAllView, ConnectedAllArticleView, ConnectedFeedArticleView, ConnectedFeedView, ConnectedLabelView, ConnectedLabelArticleView } from 'views/FeedView.js';
import ConnectedHomeView from 'views/HomeView.js';
import { ConnectedAddFeedView, ConnectedInventoryView, ConnectedLabelListView, ConnectedManageFeedView, ConnectedManageLabelView } from 'views/InventoryView.js';
import { ConnectedDebugView } from 'views/debug.jsm';


const routeToView = {
    '/': ConnectedHomeView,
    '/inventory': ConnectedInventoryView,
    '/inventory/add': ConnectedAddFeedView,
    '/inventory/labels': ConnectedLabelListView,
    '/inventory/feed/:feedId': ConnectedManageFeedView,
    '/inventory/label/:labelId': ConnectedManageLabelView,
    '/all/:filter': ConnectedAllView,
    '/all/:filter/:articleId': ConnectedAllArticleView,
    '/label/:labelId/:filter': ConnectedLabelView,
    '/label/:labelId/:filter/:articleId': ConnectedLabelArticleView,
    '/feed/:feedId/:filter': ConnectedFeedView,
    '/feed/:feedId/:filter/:articleId': ConnectedFeedArticleView,
    '/debug': ConnectedDebugView,
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
    constructor(props) {
        super(props);
        this.state = {
            search: '',
            searchParams: new URLSearchParams(),
        };
    }
    render() {
        const { path, route, params, search } = this.props;
        if (route == null) {
            return null;  // Can't render yet.
        }
        const Component = routeToView[route];
        if (Component) {
            return <Component params={params} searchParams={this.state.searchParams} />;
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

/**
 * Generate the "searchParams" state, which is a parsed version of the "search"
 * prop. A "search" prop is also generated to permit detection of when the prop
 * has changed.
 */
Router.getDerivedStateFromProps = function(nextProps, prevState) {
    if (nextProps.search !== prevState.search) {
        const search = nextProps.search;
        const searchParams = search ? new URLSearchParams(search.substring(1)) : new URLSearchParams();
        return {search, searchParams};
    }
    return null;
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
