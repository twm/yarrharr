import { combineReducers } from 'redux';


import { SET_PATH, matchPath } from './actions.js';

const defaultRoute = {path: null, route: null, params: {}, search: '', scrollX: 0, scrollY: 0};
function routeReducer(state = defaultRoute, action) {
    if (action.type === SET_PATH) {
        if (state.path === action.path && state.search === action.search) {
            return state; // Nothing changed.
        }
        return {
            path: action.path,
            route: action.route,
            params: action.params,
            search: action.search,
            scrollX: action.scrollX,
            scrollY: action.scrollY,
        };
    }
    return state;
}


import { RECEIVE_LABELS } from './actions.js';
import { REQUEST_ARTICLES, RECEIVE_ARTICLES, FAIL_ARTICLES } from './actions.js';
import { REQUEST_MARK_ARTICLE, FAIL_MARK_ARTICLE } from './actions.js';
function articleReducer(state = {}, action) {
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
        if (!article) {
            // It is possible to mark an article that has not been loaded via
            // markArticles() (which only requires the ID).  Ignore this as we
            // don't want to create partially-initialized objects.
            return state;
        }
        return Object.assign({}, state, {
            [action.articleId]: Object.assign({}, article, {marking: Object.assign(
                {},
                article.marking,
                {[action.flagName]: action.flag}
            )}),
        });
    } else if (action.type === FAIL_MARK_ARTICLE) {
        alert(`Failed to mark ${action.articleIds.length} articles ${action.flagName} ${action.flag}`);
        const article = state[action.articleId];
        const marking = Object.assign({}, article.marking);
        delete marking[article.flagName];
        return Object.assign({}, state, {
            [action.articleId]: Object.assign({}, article, {marking}),
        });
    }
    return state;
}

import { RECEIVE_FEEDS, REQUEST_REMOVE_FEED, FAIL_REMOVE_FEED } from './actions.js';
import { REQUEST_UPDATE_FEED, FAIL_UPDATE_FEED } from './actions.js';
function feedReducer(state = null, action) {
    if (action.type === RECEIVE_FEEDS) {
        return action.feedsById;
    } else if (action.type === REQUEST_UPDATE_FEED) {
        const feed = state[action.feedId];
        return Object.assign({}, state, {
            [action.feedId]: Object.assign({}, feed, {
                active: action.active,
                oldActive: feed.active,
                url: action.url,
                oldUrl: feed.url,
                text: action.text,
                oldText: feed.text,
            }),
        });
    } else if (action.type === FAIL_UPDATE_FEED) {
        const feed = state[action.feedId];
        return Object.assign({}, state, {
            // XXX This is racy if multiple requests are in flight.
            [action.feedId]: Object.assign({}, feed, {
                active: feed.oldActive,
                oldActive: null,
                text: feed.oldText,
                oldText: null,
                url: feed.oldUrl,
                oldUrl: null,
            }),
        });
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
function feedOrderReducer(state = null, action) {
    if (action.type === RECEIVE_FEEDS) {
        return action.feedOrder;
    }
    return state;
}

import { SET_SNAPSHOT_PARAMS } from './actions.js';
import { FILTER_UNREAD, FILTER_FAVE, FILTER_ALL } from './actions.js';
import { ORDER_DATE, ORDER_TAIL } from './actions.js';
import { REQUEST_SNAPSHOT, RECEIVE_SNAPSHOT, FAIL_SNAPSHOT, SHOW_ARTICLE } from './actions.js';
const defaultSnapshot = {
    /**
     * The current desired sort order.
     */
    order: ORDER_TAIL,
    /**
     * The current desired filter.
     */
    filter: FILTER_UNREAD,
    /**
     * An array of feed IDs which are currently desired to be displayed.
     * An empty array indicates that no snapshot is currently desired.
     */
    feedIds: [],
    /**
     * An article ID to include in the response regardless of whether it is
     * excluded by the filter.
     *
     * This is null when no particular article is to be included.
     */
    include: null,

    response: {
        /**
         * The parameters of the snapshot request. This is set when a snapshot
         * request is issued or received.
         *
         * The zero-value is indicated by an empty feedIds member.
         */
        params: {
            order: ORDER_TAIL,
            filter: FILTER_UNREAD,
            feedIds: [],
            include: null,
        },
        /**
         * Has the snapshot loaded? Set to false at page load and when snapshot
         * request is issued. Set to true on snapshot receipt.
         *
         * When true, either error is true or articleIds represents a valid
         * server response.
         */
        loaded: false,
        /**
         * Did the snapshot request fail? A true value indicates that an error
         * occurred and should be presented to the user.
         */
        error: false,
        /**
         * A list of article IDs representing the articles to be displayed to
         * the user. May be empty.
         */
        articleIds: [],
    },
};
function snapshotReducer(state = defaultSnapshot, action) {
    if (action.type === SET_SNAPSHOT_PARAMS) {
        return Object.assign({}, state, {
            order: action.order,
            filter: action.filter,
            feedIds: action.feedIds,
            include: action.include,
        });
    } else if (action.type === REQUEST_SNAPSHOT) {
        return Object.assign({}, state, {
            response: {
                params: {
                    order: action.order,
                    filter: action.filter,
                    feedIds: action.feedIds,
                    include: action.include,
                },
                loaded: false,
                error: false,
                articleIds: [],
            },
        });
    } else if (action.type === RECEIVE_SNAPSHOT) {
        // Ignore the snapshot if it does not satisfy the current request parameters.
        if (state.order !== action.order
                || state.filter !== action.filter
                || state.feedIds.join(',') !== action.feedIds.join(',')
                || !(state.include === action.include
                     || state.include == null
                     || action.articleIds.includes(state.include))) {
            console.log("Ignoring incoming snapshot as it doesn't match current params");
            return state;
        }
        const newState = Object.assign({}, state, {
            response: {
                params: {
                    order: action.order,
                    filter: action.filter,
                    feedIds: action.feedIds,
                    include: action.include,
                },
                loaded: true,
                error: false,
                articleIds: action.articleIds,
            },
        });
        return newState;
    } else if (action.type === FAIL_SNAPSHOT) {
        // Ignore the failure if it doesn't apply to the last request made.
        if (state.request.params.order !== action.order
                || state.request.params.filter !== action.filter
                || state.response.params.feedIds.join(',') !== action.feedIds.join(',')
                || state.response.params.include !== action.include) {
            return state;
        }
        return Object.assign({}, state, {
            response: {
                params: {
                    order: action.order,
                    filter: action.filter,
                    feedIds: action.feedIds,
                    include: action.include,
                },
                loading: false,
                error: true,
                articleIds: action.articleIds,
            },
        });
    }
    return state;
}

function labelReducer(state = null, action) {
    if (action.type === RECEIVE_LABELS) {
        return action.labelsById;
    }
    return state;
}
function labelOrderReducer(state = null, action) {
    if (action.type === RECEIVE_LABELS) {
        return action.labelOrder;
    }
    return state;
}

import { SET_LAYOUT, LAYOUT_NARROW, validLayout } from './actions.js';
function layoutReducer(state = LAYOUT_NARROW, action) {
    if (action.type === SET_LAYOUT) {
        if (__debug__ && !validLayout(action.layout)) {
            throw new Error("invalid layout " + action.layout);
        }
        return action.layout;
    }
    return state;
}


import { SET_THEME, THEME_LIGHT, THEME_DARK, validTheme } from './actions.js';
function themeReducer(state = THEME_LIGHT, action) {
    if (action.type === SET_THEME) {
        if (__debug__ && !validTheme(action.theme)) {
            throw new Error("invalid theme " + action.theme);
        }
        return action.theme;
    }
    return state;
}


export default combineReducers({
    route: routeReducer,
    articlesById: articleReducer,
    feedsById: feedReducer,
    feedOrder: feedOrderReducer,
    snapshot: snapshotReducer,
    labelsById: labelReducer,
    labelOrder: labelOrderReducer,
    layout: layoutReducer,
    theme: themeReducer,
});
