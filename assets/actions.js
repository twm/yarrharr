export const SET_VIEW = 'SET_VIEW';
export const VIEW_LIST = 'list';
export const VIEW_TEXT = 'text';
export function setView(view) {
    return {
        type: SET_VIEW,
        view,
    };
}
export function validView(view) {
    switch (view) {
        case VIEW_LIST:
        case VIEW_TEXT:
            return true;
    }
    return false;
}

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

export const SET_FILTER = 'SET_FILTER';
export const FILTER_NEW = 'new';
export const FILTER_SAVED = 'saved';
export const FILTER_ARCHIVED = 'archived';
export const FILTER_ALL = 'all';
/**
 * Is `filter` a valid filter?
 */
export function validFilter(filter) {
    switch (filter) {
        case FILTER_NEW:
        case FILTER_SAVED:
        case FILTER_ARCHIVED:
        case FILTER_ALL:
            return true;
    }
    return false;
}

export const SET_ORDER = 'SET_ORDER';
export const ORDER_DATE = 'date';
export const ORDER_TAIL = 'tail';
export function setOrder(order) {
    return (dispatch, getState) => {
        const { snapshot: { feedIds, filter, articleId } } = getState();
        return _setSnapshot(feedIds, order, filter, articleId, dispatch, getState);
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
function requestSnapshot(feedIds, order, filter, articleId) {
    return {
        type: REQUEST_SNAPSHOT,
        feedIds,
        order,
        filter,
        articleId,
    };
}


export const RECEIVE_SNAPSHOT = 'RECEIVE_SNAPSHOT';
function receiveSnapshot(feedIds, order, filter, articleId, articleIds) {
    return {
        type: RECEIVE_SNAPSHOT,
        feedIds,
        order,
        filter,
        articleId,
        articleIds,
    };
}


export const FAIL_SNAPSHOT = 'FAIL_SNAPSHOT';
function failSnapshot(feedIds, order, filter, articleId) {
    return {
        type: FAIL_SNAPSHOT,
        feedIds,
        order,
        filter,
        articleId,
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
export const STATE_NEW = 'new';
export const STATE_SAVED = 'saved';
export const STATE_ARCHIVED = 'archived';
function requestMarkArticle(articleId, state) {
    return {
        type: REQUEST_MARK_ARTICLE,
        articleId,
        state,
    };
}

export const FAIL_MARK_ARTICLE = 'FAIL_MARK_ARTICLE';
function failMarkArticle(articleId, state, error) {
    return {
        type: FAIL_MARK_ARTICLE,
        articleId,
        state,
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


export function markArticle(articleId, state) {
    return markArticles([articleId], state);
}

export function markArticles(articleIds, state) {
    return (dispatch) => {
        const body = new FormData();
        // FIXME: Stop pretending these states are mutually exclusive.
        if (state === STATE_NEW) {
            body.append('read', 'false');
            body.append('fave', 'false');
        } else if (state === STATE_ARCHIVED) {
            body.append('read', 'true');
            body.append('fave', 'false');
        } else {
            body.append('read', 'false');
            body.append('fave', 'true');
        }

        articleIds.forEach(articleId => {
            body.append('article', String(articleId))
            dispatch(requestMarkArticle(articleId, state));
        });

        post('/api/state/', body).then(json => {
            const { articlesById } = json;
            dispatch(receiveArticles(articlesById));
        }).catch(e => {
            console.error('Failed to mark articles', articleIds, state, '->', e);
        });
    };
}


/**
 * Query the backend for a snapshot of the given feed(s).  The result is
 * a Promise which resolves to an object of this layout:
 *
 *     {
 *         snapshot: Array<articleId>,
 *         articlesById: Object<articleId, *>,
 *     }
 */
function fetchSnapshot(feedIds, order, filter, includeArticleId) {
    const body = new FormData();
    feedIds.forEach((id) => body.append('feeds', String(id)));
    body.append('order', order);
    body.append('filter', filter);
    if (includeArticleId !== null) {
        body.append('include', includeArticleId);
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
    return (dispatch, getState) => {
        const { feedsById } = getState();
        const feedIds = Object.keys(feedsById).map(Number);
        const { snapshot: { order } } = getState();
        return _setSnapshot(feedIds, order, filter, articleId, dispatch, getState);
    };
}

/**
 * Display a feed to the user.  Load a fresh snapshot if none is cached.
 */
export function showFeed(feedId, filter, articleId) {
    return (dispatch, getState) => {
        const feedIds = [Number(feedId)];
        const { snapshot: { order } } = getState();
        return _setSnapshot(feedIds, order, filter, articleId, dispatch, getState);
    };
}

/**
 * Display a label to the user.  Load a fresh snapshot if none is cached.
 */
export function showLabel(labelId, filter, articleId) {
    return (dispatch, getState) => {
        const { feedsById, snapshot: { order } } = getState();
        const feedIds = Object.keys(feedsById)
            .filter(feedId => feedsById[feedId].labels.indexOf(Number(labelId)) >= 0)
            .map(Number);
        feedIds.sort();
        return _setSnapshot(feedIds, order, filter, articleId, dispatch, getState);
    };
}

/**
 * Display an article within a snapshot.
 */
export const SHOW_ARTICLE = 'SHOW_ARTICLE';
export function showArticle(articleId) {
    return {
        type: SHOW_ARTICLE,
        articleId,
    };
}

function _setSnapshot(feedIds, order, filter, articleId, dispatch, getState) {
    const {
        snapshot: {
            feedIds: oldFeedIds=[],
            order: oldOrder='',
            filter: oldFilter='',
            includeArticleId: oldIncludeArticleId=null,
            articleId: oldArticleId=null,
            articleIds: oldArticleIds=[],
        },
    } = getState();

    if (!validFilter(filter)) {
        // TODO: Handle somehow?  This could be anything since it came from the URL.
    }

    if (oldFeedIds.join() === feedIds.join() && oldOrder === order && oldFilter === filter && (oldIncludeArticleId === articleId || oldArticleIds.includes(Number(articleId)))) {
        // The current snapshot has the same parameters and can display the requested article, so we can just use it.
        if (oldArticleId !== articleId) {
            dispatch(showArticle(articleId));
        }
        return;
    }

    dispatch(requestSnapshot(feedIds, order, filter, articleId));

    return fetchSnapshot(feedIds, order, filter, articleId).then(
        json => {
            // Updated articles are always welcome.
            dispatch(receiveArticles(json.articlesById));
            dispatch(receiveSnapshot(feedIds, order, filter, articleId, json.snapshot));
        },
        err => {
            console.error(err);
            dispatch(failSnapshot(feedIds, order, filter, articleId))
        });
}


/**
 * Given a snapshot of article IDs, load the first few articles which haven't
 * already been loaded.  If those articles are already loading, do nothing.
 */
export function loadMore(articleIds) {
    return (dispatch, getState) => {
        var loading = 0;
        const { articlesById } = getState();

        var i = 0;
        for (; i < articleIds.length; i++) {
            let id = articleIds[i];
            let article = articlesById[id];
            if (!article) {
                break;
            }
            if (article.loading) {
                // We are already loading articles at the end of this
                // snapshot.  No need to kick off another load.
                return;
            }
        }
        const nextBatch = articleIds.slice(i, i + 10);
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
export function receiveFeeds(feedsById) {
    return {
        type: RECEIVE_FEEDS,
        feedsById,
    };
}

export function loadFeeds() {
    return (dispatch) => {
        get('/api/inventory/').then(json => {
            dispatch(receiveFeeds(json.feedsById));
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
            dispatch(receiveFeeds(feedsById));
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
            const { feedsById, labelsById } = json;
            dispatch(receiveLabels(labelsById));
            dispatch(receiveFeeds(feedsById));
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
            const { labelsById } = json;
            dispatch(receiveLabels(labelsById));
        }).catch(e => {
            console.error(e);
            dispatch(failAddLabel(text));
        });
    };
}

export const RECEIVE_LABELS = 'RECEIVE_LABELS';
export function receiveLabels(labelsById) {
    return {
        type: RECEIVE_LABELS,
        labelsById,
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
            dispatch(receiveFeeds(json.feedsById));
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
            dispatch(receiveFeeds(json.feedsById));
        }).catch(e => {
            console.error(e);
            alert('Failed to remove label');
            // TODO
        });
    }
}

export const SET_PATH = 'SET_PATH';
/**
 * Navigate to a new URL path (relative to the Yarrharr root path).
 */
export function setPath(path) {
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
        });
    }
}

const ROUTE_LOADERS = {
    '/inventory': _ => loadFeeds(),
    '/article/:articleId': params => loadMore([params.articleId]),
    '/all/:filter': params => showAll(params.filter, null),
    '/all/:filter/:articleId': params => showAll(params.filter, Number(params.articleId)),
    '/label/:labelId/:filter': params => showLabel(Number(params.labelId), params.filter, null),
    '/label/:labelId/:filter': params => showLabel(Number(params.labelId), params.filter, Number(params.articleId)),
    '/feed/:feedId/:filter': params => showLabel(Number(params.feedId), params.filter, null),
    '/feed/:feedId/:filter/:articleId': params => showLabel(Number(params.feedId), params.filter, Number(params.articleId)),
};

export const ROUTES = [
    '/',
    '/inventory',
    '/inventory/add',
    '/article/:articleId',
    '/all/:filter',
    '/all/:filter/:articleId',
    '/label/:labelId/:filter',
    '/label/:labelId/:filter/:articleId',
    '/feed/:feedId/:filter',
    '/feed/:feedId/:filter/:articleId',
];

export const PARAM_TYPES = {
    'articleId': '(\\d+)',
    'labelId': '(\\d+)',
    'feedId': '(\\d+)',
    'filter': '(' + [FILTER_NEW, FILTER_SAVED, FILTER_ARCHIVED, FILTER_ALL].join('|') + ')',
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
            params[paramNames[i - 1]] = match[i];
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
