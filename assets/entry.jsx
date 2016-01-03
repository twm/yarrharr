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

import { SET_VIEW, VIEW_TEXT, SET_FILTER, FILTER_NEW, SET_ORDER, ORDER_DATE } from './actions.js';

import { REQUEST_ARTICLES, RECEIVE_ARTICLES, FAIL_ARTICLES } from './actions.js';
function articleReducer(state = window.props.articlesById, action) {
    if (action.type === REQUEST_ARTICLES) {
        const patch = {};
        const flags = {loading: true, error: false};
        action.articleIds.forEach((id) => {
            patch[id] = Object.assign({}, state[id], flags);
        });
        return Object.assign({}, state, patch);
    } else if (action.type === RECEIVE_ARTICLES) {
        return Object.assign({}, state, action.articlesById);
    } else if (action.type === FAIL_ARTICLES) {
        const patch = {};
        const flags = {loading: false, error: true};
        action.articleIds.forEach((id) => {
            patch[id] = Object.assign({}, state[id], flags);
        });
        return Object.assign({}, state, patch);
    }
    return state;
}

function feedReducer(state = window.props.feedsById, action) {
    // TODO: Support feed CRUD.
    return state;
}

import { REQUEST_SNAPSHOT, RECEIVE_SNAPSHOT, FAIL_SNAPSHOT } from './actions.js';
const defaultSnapshot = {
    loading: false,
    error: false,
    order: ORDER_DATE,
    filter: FILTER_NEW,
    feedIds: [],
    articleIds: [],
};
function snapshotReducer(state = defaultSnapshot, action) {
    if (action.type === REQUEST_SNAPSHOT) {
        return Object.assign({}, state, {
            loading: true,
            error: false,
            order: action.order,
            filter: action.filter,
            feedIds: action.feedIds,
            articleIds: [],
        });
    } else if (action.type === RECEIVE_SNAPSHOT) {
        return Object.assign({}, state, {
            loading: false,
            error: false,
            order: action.order,
            filter: action.filter,
            feedIds: action.feedIds,
            articleIds: action.articleIds,
        });
    } else if (action.type === FAIL_SNAPSHOT) {
        return Object.assign({}, state, {
            loading: false,
            error: true,
        });
    }
    return state;
}

function labelReducer(state = window.props.labelsById, action) {
    // TODO: Support label CRUD.
    return state;
}

function viewReducer(state = VIEW_TEXT, action) {
    if (action.type === SET_VIEW) {
        return action.view;
    }
    return state;
}


const reducer = combineReducers({
    articlesById: articleReducer,
    feedsById: feedReducer,
    snapshot: snapshotReducer,
    labelsById: labelReducer,
    view: viewReducer,
    routing: routeReducer,
});
const middleware = [
    thunkMiddleware,
    createLogger(),
];
const store = applyMiddleware(...middleware)(createStore)(reducer);

const history = createHistory();
syncReduxAndRouter(history, store);

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
