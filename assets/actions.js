const __debug__ = process.env.NODE_ENV !== 'production';

export const SET_LAYOUT = 'SET_LAYOUT';
export const LAYOUT_NARROW = 'narrow';
export const LAYOUT_WIDE = 'wide';
export function setLayout(layout) {
    return {
        type: SET_LAYOUT,
        layout,
    };
}
export function validLayout(layout) {
    switch (layout) {
        case LAYOUT_NARROW:
        case LAYOUT_WIDE:
            return true;
    }
    return false;
}

export const SET_SNAPSHOT_PARAMS = 'SET_SNAPSHOT_PARAMS';

export const FILTER_UNREAD = 'unread';
export const FILTER_FAVE = 'fave';
export const FILTER_ALL = 'all';
/**
 * Is `filter` a valid filter?
 */
export function validFilter(filter) {
    switch (filter) {
        case FILTER_UNREAD:
        case FILTER_FAVE:
        case FILTER_ALL:
            return true;
    }
    return false;
}

export const ORDER_DATE = 'date';
export const ORDER_TAIL = 'tail';
export function setOrder(order) {
    if (__debug__ && !validOrder(order)) {
        throw new Error(`Invalid order '${order}'`);
    }
    return (dispatch, getState) => {
        const { snapshot } = getState();
        const action = {
            type: SET_SNAPSHOT_PARAMS,
            order,
            filter: snapshot.filter,
            feedIds: snapshot.feedIds,
            include: snapshot.include,
        };
        return _setSnapshot(action, dispatch, getState);
    };
}
/**
 * Is `order` a valid order?
 */
export function validOrder(order) {
    switch (order) {
        case ORDER_DATE:
        case ORDER_TAIL:
            return true;
    }
    return false;
}

export const REQUEST_SNAPSHOT = 'REQUEST_SNAPSHOT';
function requestSnapshot(order, filter, feedIds, include) {
    return {
        type: REQUEST_SNAPSHOT,
        order,
        filter,
        feedIds,
        include,
    };
}


export const RECEIVE_SNAPSHOT = 'RECEIVE_SNAPSHOT';
function receiveSnapshot(order, filter, feedIds, include, articleIds) {
    return {
        type: RECEIVE_SNAPSHOT,
        order,
        filter,
        feedIds,
        include,
        articleIds,
    };
}


export const FAIL_SNAPSHOT = 'FAIL_SNAPSHOT';
function failSnapshot(order, filter, feedIds, include) {
    return {
        type: FAIL_SNAPSHOT,
        order,
        filter,
        feedIds,
        include,
    };
}


export const REQUEST_ARTICLES = 'REQUEST_ARTICLES';
function requestArticles(articleIds) {
    return {
        type: REQUEST_ARTICLES,
        articleIds,
    };
}


export const RECEIVE_ARTICLES = 'RECEIVE_ARTICLES';
function receiveArticles(articlesById) {
    return {
        type: RECEIVE_ARTICLES,
        articlesById,
    };
}


export const FAIL_ARTICLES = 'FAIL_ARTICLES';
function failArticles(articleIds) {
    return {
        type: FAIL_ARTICLES,
        articleIds,
    };
}


export const REQUEST_MARK_ARTICLE = 'REQUEST_MARK_ARTICLE';
export const FLAG_READ = 'read';
export const FLAG_FAVE = 'fave';
function requestMarkArticle(articleId, flagName, flag) {
    if (__debug__ && (flagName !== FLAG_READ && flagName !== FLAG_FAVE)) {
        throw new Error(`Invalid flag ${flagName}`);
    }
    return {
        type: REQUEST_MARK_ARTICLE,
        articleId,
        flagName,
        flag
    };
}

export const FAIL_MARK_ARTICLE = 'FAIL_MARK_ARTICLE';
function failMarkArticle(articleId, flagName, flag, error) {
    if (__debug__ && (flagName === FLAG_READ || flagName === FLAG_FAVE)) {
        throw new Error(`Invalid flag ${flagName}`);
    }
    return {
        type: FAIL_MARK_ARTICLE,
        articleId,
        flagName,
        flag,
        error,
    };
}

function get(path) {
    return fetch(path, {
        method: 'GET',
        headers: new Headers({
            // Pass the Django CSRF token (or the request will be rejected).
            'X-CSRFToken': document.cookie.match(/csrftoken=([^\s;]+)/)[1],
        }),
        // Pass cookies (or the request will be rejected).
        credentials: 'same-origin',
    }).then((response) => {
        if (!response.ok) {
            throw new Error(response);
        }
        return response.json();
    });
}

function post(path, body) {
    return fetch(path, {
        method: 'POST', // a.k.a. "RPC"
        body: body,
        headers: new Headers({
            // Pass the Django CSRF token (or the request will be rejected).
            'X-CSRFToken': document.cookie.match(/csrftoken=([^\s;]+)/)[1],
        }),
        // Pass cookies (or the request will be rejected).
        credentials: 'same-origin',
    }).then((response) => {
        if (!response.ok) {
            throw new Error(response);
        }
        return response.json();
    });
}


function makeMarkArticles(flagName) {
    return function(articleIds, flag) {
        if (__debug__ && (flag !== true && flag !== false)) {
            throw new Error(`Invalid ${flagName} flag: ${flag}`);
        }
        return (dispatch) => {
            const body = new FormData();
            body.append(flagName, flag ? 'true' : 'false');

            articleIds.forEach(articleId => {
                body.append('article', String(articleId))
                dispatch(requestMarkArticle(articleId, flagName, flag));
            });

            post('/api/flags/', body).then(json => {
                const { articlesById } = json;
                dispatch(receiveArticles(articlesById));
            }).catch(e => {
                console.error(`Failed to mark articles ${flagName} ${flag}`, articleIds, '->', e);
            });
        };
    };
}

export const markArticlesRead = makeMarkArticles('read');
export const markArticlesFave = makeMarkArticles('fave');


/**
 * Query the backend for a snapshot of the given feed(s).  The result is
 * a Promise which resolves to an object of this layout:
 *
 *     {
 *         snapshot: Array<articleId>,
 *         articlesById: Object<articleId, *>,
 *     }
 */
function fetchSnapshot(order, filter, feedIds, include) {
    const body = new FormData();
    feedIds.forEach((id) => body.append('feeds', String(id)));
    body.append('order', order);
    body.append('filter', filter);
    if (include != null) {
        body.append('include', include);
    }
    return post('/api/snapshots/', body);
}


/**
 * Query the backend for a list of articles.  The result is
 * a Promise which resolves to an object of this layout:
 *
 *     Object<articleId, *>
 *
 * The result will contain all of the articles requested provided they are
 * owned by the authenticated user.
 */
function fetchArticles(articleIds) {
    const body = new FormData();
    articleIds.forEach((id) => body.append('article', String(id)));
    return post('/api/articles/', body);
}

/**
 * Display a combined view of all feeds to the user.  Load a fresh snapshot if
 * none is cached.
 */
export function showAll(filter, articleId) {
    if (__debug__ && !(articleId === null || Number.isInteger(articleId))) {
        throw new Error(`invalid articleId: '${articleId}'`);
    }
    return (dispatch, getState) => {
        // FIXME This is getting increasingly ridiculous.
        if (articleId != null) {
            dispatch(loadMore([articleId]));
        }

        const { feedsById, snapshot } = getState();
        const feedIds = Object.keys(feedsById).map(Number);
        feedIds.sort();
        const action = {
            type: SET_SNAPSHOT_PARAMS,
            order: snapshot.order,
            filter,
            feedIds,
            include: articleId,
        };
        return _setSnapshot(action, dispatch, getState);
    };
}

/**
 * Display a feed to the user.  Load a fresh snapshot if none is cached.
 */
export function showFeed(feedId, filter, articleId) {
    if (__debug__ && !Number.isInteger(feedId)) {
        throw new Error(`invalid feedId: ${feedId}`);
    }
    if (__debug__ && !(articleId === null || Number.isInteger(articleId))) {
        throw new Error(`invalid articleId: ${articleId}`);
    }
    return (dispatch, getState) => {
        // FIXME This is getting increasingly ridiculous.
        if (articleId != null) {
            dispatch(loadMore([articleId]));
        }

        const { snapshot } = getState();
        const action = {
            type: SET_SNAPSHOT_PARAMS,
            order: snapshot.order,
            filter,
            feedIds: [feedId],
            include: articleId,
        };
        return _setSnapshot(action, dispatch, getState);
    };
}

/**
 * Display a label to the user.  Load a fresh snapshot if none is cached.
 */
export function showLabel(labelId, filter, articleId) {
    if (__debug__ && !Number.isInteger(labelId)) {
        throw new Error(`invalid labelId: '${labelId}'`);
    }
    if (__debug__ && !(articleId === null || Number.isInteger(articleId))) {
        throw new Error(`invalid articleId: '${articleId}'`);
    }
    return (dispatch, getState) => {
        // FIXME This is getting increasingly ridiculous.
        if (articleId != null) {
            dispatch(loadMore([articleId]));
        }

        const { feedsById, snapshot } = getState();
        const feedIds = Object.keys(feedsById)
            .filter(feedId => feedsById[feedId].labels.indexOf(Number(labelId)) >= 0)
            .map(Number);
        feedIds.sort();
        const action = {
            type: SET_SNAPSHOT_PARAMS,
            order: snapshot.order,
            filter,
            feedIds,
            include: articleId,
        };
        return _setSnapshot(action, dispatch, getState);
    };
}

// Adopting the new snapshot parameters requires no changes (most likely the
// parameters have not changed).
const NOTHING = 1;
// A new snapshot must be requested to satisfy the new parameters.
const LOAD = 2;
// The new parameters only change the order parameter, so they may be satisfied
// by reversing the order of the articleIds array.
const FLIP = 3;

function _setSnapshot(action, dispatch, getState) {
    if (__debug__ && !validFilter(action.filter)) {
        throw new Error(`Invalid filter ${filter}`);
    }

    const snapshot = getState().snapshot;
    dispatch(action);

    if (transitionRequires(snapshot, action) === NOTHING) {
        console.log('No snapshot load required');
        return;
    }
    // TODO special case for FLIP

    const {order, filter, feedIds, include} = action;
    dispatch(requestSnapshot(order, filter, feedIds, include));

    return fetchSnapshot(order, filter, feedIds, include).then(
        json => {
            // Updated articles are always welcome.
            dispatch(receiveArticles(json.articlesById));
            dispatch(receiveSnapshot(order, filter, feedIds, include, json.snapshot));
        },
        err => {
            console.error(err);
            dispatch(failSnapshot(order, filter, feedIds, include))
        });
}

/**
 * Compare the parameters in the SET_SNAPSHOT_PARAMS action with the current
 * snapshot and determine what action is required to adopt the new parameters.
 */
function transitionRequires(snapshot, action) {
    if (action.feedIds.length === 0) {
        return NOTHING;
    }
    if (snapshot.filter !== action.filter) {
        return LOAD;
    }
    if (snapshot.feedIds.join(',') !== action.feedIds.join(',')) {
        return LOAD;
    }
    // If the "include" articleId wasn't either requested, or is already in the
    // response, we'll need to make a request to ensure it's present.
    if (action.include != null) {
        // Key optimization: when we've already loaded a snapshot, clicking on
        // the link to display the article text should not trigger a reload of
        // the snapshot.
        if (snapshot.include !== action.include
            && !snapshot.response.articleIds.includes(action.include)) {
            return LOAD;
        }
    }
    if ((snapshot.order === ORDER_TAIL && action.order == ORDER_DATE)
        || (snapshot.order === ORDER_DATE && action.order == ORDER_TAIL)) {
        return FLIP;
    }
    return NOTHING;
}


/**
 * Load the specified articles if they are not already loading.
 *
 * @param {number[]} articleIds Articles to load.
 */
export function loadMore(articleIds) {
    return (dispatch, getState) => {
        const { articlesById } = getState();

        // Filter out articles which area already loaded or loading.
        const nextBatch = [];
        for (var i = 0; i < articleIds.length; i++) {
            let id = articleIds[i];
            let article = articlesById[id];
            if (!article) {
                nextBatch.push(id);
            }
        }

        if (nextBatch.length) {
            dispatch(requestArticles(nextBatch));

            return fetchArticles(nextBatch).then(
                json => {
                    dispatch(receiveArticles(json));
                },
                err => {
                    console.error(err);
                    dispatch(failArticles(nextBatch));
                });
        }
    };
}

export const RECEIVE_FEEDS = 'RECEIVE_FEEDS';
export function receiveFeeds(feedsById, feedOrder) {
    if (__debug__ && !feedsById) {
        throw new Error("feedsById not given");
    }
    if (__debug__ && !feedOrder) {
        throw new Error("feedOrder not given");
    }
    return {
        type: RECEIVE_FEEDS,
        feedsById,
        feedOrder,
    };
}

export function loadFeeds() {
    return (dispatch) => {
        get('/api/inventory/').then(json => {
            dispatch(receiveFeeds(json.feedsById, json.feedOrder));
        }).catch(e => {
            console.error(e);
            // TODO: Error handling
        });
    };
}

export const REQUEST_ADD_FEED = 'REQUEST_ADD_FEED';
export function addFeed(url) {
    return (dispatch) => {
        dispatch({
            type: REQUEST_ADD_FEED,
            url,
        });
        const body = new FormData();
        body.append('action', 'create');
        body.append('url', url);
        return post('/api/inventory/', body).then(json => {
            // TODO: Handle expected error conditions.
            const { feedId, feedsById } = json;
            dispatch(receiveAddFeed(url, feedId));
            dispatch(receiveFeeds(feedsById, json.feedOrder));
        }).catch(e => {
            console.error("Error adding", url, "->", e);
            dispatch(failAddFeed(url, "Unexpected error"));
        });
    };
}

export const RECEIVE_ADD_FEED = 'RECEIVE_ADD_FEED';
export function receiveAddFeed(url, feedId) {
    return {
        type: RECEIVE_ADD_FEED,
        url,
        feedId,
    };
}

export const FAIL_ADD_FEED = 'FAIL_ADD_FEED';
export function failAddFeed(url, error) {
    return {
        type: FAIL_ADD_FEED,
        url,
        error,
    };
}

export const REQUEST_UPDATE_FEED = 'REQUEST_UPDATE_FEED';
/**
 * Enable or disable checking a feed.
 *
 * @param {number} feedId
 * @param {boolean} active
 */
export function updateFeed(feedId, text, url, active, labels) {
    return (dispatch) => {
        dispatch({
            type: REQUEST_UPDATE_FEED,
            feedId,
            text,
            url,
            active,
            labels,
        });
        const body = new FormData();
        body.append('action', 'update');
        body.append('feed', feedId);
        body.append('title', text); // user_title on Feed
        body.append('url', url);
        body.append('active', active ? 'on' : 'off');
        labels.forEach(id => body.append('label', id));
        return post('/api/inventory/', body).then(json => {
            const { feedsById, feedOrder, labelsById, labelOrder } = json;
            dispatch(receiveLabels(labelsById, labelOrder));
            dispatch(receiveFeeds(feedsById, feedOrder));
        }).catch(e => {
            console.error(`Error marking feed ${feedId} active=${active}`, e);
            dispatch(failMarkFeedActive(feedId, text, url, active));
        });
    };
}

export const FAIL_UPDATE_FEED = 'FAIL_UPDATE_FEED';
export function failMarkFeedActive(feedId, text, url, active) {
    return {
        type: FAIL_UPDATE_FEED,
        feedId,
        text,
        url,
        active,
    };
}

export const REQUEST_REMOVE_FEED = 'REQUEST_REMOVE_FEED';
export function removeFeed(feedId) {
    return (dispatch) => {
        dispatch({
            type: REQUEST_REMOVE_FEED,
            feedId,
        });
        const body = new FormData();
        body.append('action', 'remove');
        body.append('feed', feedId);
        return post('/api/inventory/', body).then(json => {
            // TODO: Handle expected error conditions.
            const { feedsById, feedOrder, labelsById, labelOrder } = json;
            dispatch(setPath('/inventory'));
            dispatch(receiveLabels(labelsById, labelOrder));
            dispatch(receiveFeeds(feedsById, feedOrder));
        }).catch(e => {
            console.error("Error removing", feedId, "->", e);
            dispatch(failRemoveFeed(feedId, "Unexpected error"));
        });
    };
}

export const FAIL_REMOVE_FEED = 'FAIL_REMOVE_FEED';
export function failRemoveFeed(feedId, error) {
    return {
        type: FAIL_REMOVE_FEED,
        feedId,
        error,
    };
}

export const ADD_LABEL = 'ADD_LABEL';
export function addLabel(text) {
    return (dispatch) => {
        dispatch({
            type: ADD_LABEL,
            text,
        });
        const body = new FormData();
        body.append('action', 'create');
        body.append('text', text);
        return post('/api/labels/', body).then(json => {
            const { labelsById, labelOrder } = json;
            dispatch(receiveLabels(labelsById, labelOrder));
        }).catch(e => {
            console.error(e);
            dispatch(failAddLabel(text));
        });
    };
}

export const RECEIVE_LABELS = 'RECEIVE_LABELS';
export function receiveLabels(labelsById, labelOrder) {
    return {
        type: RECEIVE_LABELS,
        labelsById,
        labelOrder,
    };
}

export const FAIL_ADD_LABEL = 'FAIL_ADD_LABEL';
export function failAddLabel(text) {
    // TODO: Do something async?
    alert("Failed to add label " + text + ".");
}

export function failAttachLabel(feedId, labelId) {
    // TODO
    alert("Failed to add label to feed");
    console.log("Failed to add label", labelId, "to feed", feedId);
}

export const ATTACH_LABEL = 'ATTACH_LABEL';
export function attachLabel(feedId, labelId) {
    return (dispatch) => {
        dispatch({
            type: ATTACH_LABEL,
            feedId,
            labelId,
        });
        const body = new FormData();
        body.append('action', 'attach');
        body.append('feed', feedId);
        body.append('label', labelId);
        return post('/api/labels/', body).then(json => {
            const { feedsById, feedOrder, labelsById, labelOrder } = json;
            dispatch(receiveLabels(labelsById, labelOrder));
            dispatch(receiveFeeds(feedsById, feedOrder));
        }).catch(e => {
            console.error(e);
            dispatch(failAttachLabel(feedId, labelId));
        });
    };
}

export const DETACH_LABEL = 'DETACH_LABEL';
export function detachLabel(feedId, labelId) {
    return (dispatch) => {
        dispatch({
            type: DETACH_LABEL,
            feedId,
            labelId,
        });
        const body = new FormData();
        body.append('action', 'detach');
        body.append('feed', feedId);
        body.append('label', labelId);
        return post('/api/labels/', body).then(json => {
            const { feedsById, feedOrder, labelsById, labelOrder } = json;
            dispatch(receiveLabels(labelsById, labelOrder));
            dispatch(receiveFeeds(feedsById, feedOrder));
        }).catch(e => {
            console.error(e);
            alert('Failed to detach label');
            // TODO
        });
    }
}

export const REMOVE_LABEL = 'REMOVE_LABEL';
export function removeLabel(labelId) {
    return (dispatch) => {
        dispatch({
            type: 'REMOVE_LABEL',
            labelId,
        });
        const body = new FormData();
        body.append('action', 'remove');
        body.append('label', labelId);
        return post('/api/inventory/', body).then(json => {
            const { feedsById, feedOrder, labelsById, labelOrder } = json;
            dispatch(receiveFeeds(feedsById, feedOrder));
            dispatch(receiveLabels(labelsById, labelOrder));
        }).catch(e => {
            console.error(e);
            alert('Failed to remove label ' + labelId);
            // TODO
        });
    };
}

export const SET_PATH = 'SET_PATH';
/**
 * Navigate to a new URL path (relative to the Yarrharr root path).
 *
 * @param {string} path
 * @param {number} scrollX Initial horizontal scroll position
 * @param {number} scrollY Initial vertical scroll position
 */
export function setPath(path, scrollX = 0, scrollY = 0) {
    const match = matchPath(path);
    if (!match) {
        throw new Error(`path ${path} does not match a known route`);
    }
    const {route, params} = match;
    return dispatch => {
        if (ROUTE_LOADERS[route]) {
            dispatch(ROUTE_LOADERS[route](params));
        }
        dispatch({
            type: SET_PATH,
            path,
            route,
            params,
            scrollX,
            scrollY,
        });
    }
}

const ROUTE_LOADERS = {
    '/inventory': params => loadFeeds(),
    '/all/:filter': params => showAll(params.filter, null),
    '/all/:filter/:articleId': params => showAll(params.filter, params.articleId),
    '/label/:labelId/:filter': params => showLabel(params.labelId, params.filter, null),
    '/label/:labelId/:filter/:articleId': params => showLabel(params.labelId, params.filter, params.articleId),
    '/feed/:feedId/:filter': params => showFeed(params.feedId, params.filter, null),
    '/feed/:feedId/:filter/:articleId': params => showFeed(params.feedId, params.filter, params.articleId),
};

export const ROUTES = [
    '/',
    '/inventory',
    '/inventory/add',
    '/inventory/labels',
    '/inventory/feed/:feedId',
    '/inventory/label/:labelId',
    '/all/:filter',
    '/all/:filter/:articleId',
    '/label/:labelId/:filter',
    '/label/:labelId/:filter/:articleId',
    '/feed/:feedId/:filter',
    '/feed/:feedId/:filter/:articleId',
];

const PARAM_TYPES = {
    'articleId': '(\\d+)',
    'labelId': '(\\d+)',
    'feedId': '(\\d+)',
    'filter': '(' + [FILTER_UNREAD, FILTER_FAVE, FILTER_ALL].join('|') + ')',
};

const PARAM_CONVERT = {
    'articleId': Number,
    'labelId': Number,
    'feedId': Number,
    'filter': String,
};

const PATH_MATCHERS = ROUTES.map(route => {
    var pattern = '^';
    const paramNames = [];
    route.split('/').forEach(label => {
        if (label.charAt(0) === ':') {
            const paramName = label.slice(1);
            paramNames.push(paramName);
            pattern += PARAM_TYPES[paramName];
        } else {
            pattern += label;
        }
        pattern += '/';
    });
    pattern += '?$'
    // console.log(`route ${route} => regexp ${pattern}`);
    const regex = new RegExp(pattern);
    return path => {
        var match = regex.exec(path);
        if (!match) {
            // console.log(`path ${path} does not match regexp ${regex}`);
            return null;
        }
        var params = {};
        for (var i = 1; i < match.length; i++) {
            var paramName = paramNames[i - 1];
            params[paramName] = PARAM_CONVERT[paramName](match[i]);
        }
        console.log(`path ${path} matches route ${route}`);
        return {path, route, params};
    };
});

/**
 * Match the given URL path against the configured routes.
 *
 * @param String path
 *
 * If a route matches the path an object describing the match is returned:
 *
 *     {
 *         path: '/article/1234/',
 *         route: '/article/:articleId',
 *         params: {articleId: '1234'},
 *     }
 *
 * Otherwise null.
 */
export function matchPath(path) {
    for (var i = 0; i < PATH_MATCHERS.length; i++) {
        var match = PATH_MATCHERS[i](path);
        if (match) {
            return match;
        }
    }
    return null;
}
