import { combineReducers } from 'redux';
import { routerReducer } from 'react-router-redux';

import { SET_LAYOUT, LAYOUT_NARROW, SET_VIEW, VIEW_LIST, SET_FILTER, FILTER_NEW, SET_ORDER, ORDER_DATE } from './actions.js';
import { RECEIVE_LABELS } from './actions.js';
import { REQUEST_ARTICLES, RECEIVE_ARTICLES, FAIL_ARTICLES } from './actions.js';
import { REQUEST_MARK_ARTICLE, RECEIVE_MARK_ARTICLE, FAIL_MARK_ARTICLE } from './actions.js';

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
    } else if (action.type === REQUEST_MARK_ARTICLE) {
        const article = state[action.articleId];
        return Object.assign({}, state, {
            [action.articleId]: Object.assign({}, article, {marking: action.state}),
        });
    } else if (action.type === RECEIVE_MARK_ARTICLE) {
        const article = state[action.articleId];
        return Object.assign({}, state, {
            [action.articleId]: Object.assign({}, article, {
                state: action.state,
                marking: null,
            }),
        });
    } else if (action.type === FAIL_MARK_ARTICLE) {
        // TODO: Communicate the error to the user somehow.
        const article = state[action.articleId];
        return Object.assign({}, state, {
            [action.articleId]: Object.assign({}, article, {marking: null}),
        });
    }
    return state;
}

import { RECEIVE_FEEDS, REQUEST_REMOVE_FEED, FAIL_REMOVE_FEED } from './actions.js';
function feedReducer(state = window.props.feedsById, action) {
    if (action.type === RECEIVE_FEEDS) {
        return action.feedsById;
    } else if (action.type === REQUEST_REMOVE_FEED) {
        const feed = state[action.feedId];
        return Object.assign({}, state, {
            [action.feedId]: Object.assign({}, feed, {removing: true}),
        });
    } else if (action.type === FAIL_REMOVE_FEED) {
        const feed = state[action.feedId];
        return Object.assign({}, state, {
            [action.feedId]: Object.assign({}, feed, {removing: false}),
        });
    }
    return state;
}

import { REQUEST_ADD_FEED, RECEIVE_ADD_FEED, FAIL_ADD_FEED } from './actions.js';
function feedAddReducer(state = window.props.feedsById, action) {
    if (action.type === REQUEST_ADD_FEED) {
        return {
            url: action.url,
        };
    } else if (action.type === RECEIVE_ADD_FEED) {
        return {
            url: action.url,
            feedId: action.feedId,
        };
    } else if (action.type === FAIL_ADD_FEED) {
        return {
            url: action.url,
            error: action.error,
        };
    }
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
        if (state.order !== action.order
                || state.filter !== action.filter
                /* NB: Should be equal by identity due to coming from the same closure */
                || state.feedIds !== action.feedIds) {
            return state;
        }
        return Object.assign({}, state, {
            loading: false,
            error: false,
            order: action.order,
            filter: action.filter,
            feedIds: action.feedIds,
            articleIds: action.articleIds,
        });
    } else if (action.type === FAIL_SNAPSHOT) {
        if (state.order !== action.order
                || state.filter !== action.filter
                /* NB: Should be equal by identity due to coming from the same closure */
                || state.feedIds !== action.feedIds) {
            return state;
        }
        return Object.assign({}, state, {
            loading: false,
            error: true,
        });
    }
    return state;
}

function labelReducer(state = window.props.labelsById, action) {
    if (action.type === RECEIVE_LABELS) {
        return action.labelsById;
    }
    return state;
}

function viewReducer(state = VIEW_LIST, action) {
    if (action.type === SET_VIEW) {
        return action.view;
    }
    return state;
}

function layoutReducer(state = LAYOUT_NARROW, action) {
    if (action.type === SET_LAYOUT) {
        return action.layout;
    }
    return state;
}


export default combineReducers({
    articlesById: articleReducer,
    feedsById: feedReducer,
    feedAdd: feedAddReducer,
    snapshot: snapshotReducer,
    labelsById: labelReducer,
    view: viewReducer,
    layout: layoutReducer,
    routing: routerReducer,
});
