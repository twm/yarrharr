export const SET_VIEW = 'SET_VIEW';
export const VIEW_LIST = 'list';
export const VIEW_TEXT = 'text';
export function setView(view) {
    return {
        type: SET_VIEW,
        view,
    };
}


export const SET_FILTER = 'SET_FILTER';
export const FILTER_NEW = 'new';
export const FILTER_SAVED = 'saved';
export const FILTER_DONE = 'done';
export const FILTER_ALL = 'all';
export function setFilter(filter) {
    return (dispatch, getState) => {
        const { snapshot: { feedIds, order } } = getState();
        return _setSnapshot(feedIds, order, filter, dispatch, getState);
    };
}


export const SET_ORDER = 'SET_ORDER';
export const ORDER_DATE = 'date';
export const ORDER_TAIL = 'tail';
export function setOrder(order) {
    return (dispatch, getState) => {
        const { snapshot: { feedIds, filter } } = getState();
        return _setSnapshot(feedIds, order, filter, dispatch, getState);
    };
}


export const REQUEST_SNAPSHOT = 'REQUEST_SNAPSHOT';
function requestSnapshot(feedIds, order, filter) {
    return {
        type: REQUEST_SNAPSHOT,
        feedIds,
        order,
        filter,
    };
}


export const RECEIVE_SNAPSHOT = 'RECEIVE_SNAPSHOT';
function receiveSnapshot(feedIds, order, filter, articleIds) {
    return {
        type: RECEIVE_SNAPSHOT,
        feedIds,
        order,
        filter,
        articleIds,
    };
}


export const FAIL_SNAPSHOT = 'FAIL_SNAPSHOT';
function failSnapshot(feedIds, order, filter) {
    return {
        type: FAIL_SNAPSHOT,
        feedIds,
        order,
        filter,
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


/**
 * Query the backend for a snapshot of the given feed(s).  The result is
 * a Promise which resolves to an object of this layout:
 *
 *     {
 *         snapshot: Array<articleId>,
 *         articlesById: Object<articleId, *>,
 *     }
 */
function fetchSnapshot(feedIds, order, filter) {
    const body = new FormData();
    feedIds.forEach((id) => body.append('feeds', String(id)));
    body.append('order', order);
    body.append('filter', filter);

    return fetch('/snapshots/', {
        method: 'POST',
        body: body,
        headers: new Headers({
            'X-CSRFToken': document.cookie.match(/csrftoken=([^\s;]+)/)[1],
        }),
        credentials: 'same-origin',
    }).then((response) => {
        if (!response.ok) {
            throw new Error(response);
        }
        return response.json();
    });
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

    return fetch('/articles/', {
        method: 'POST',
        body: body,
        headers: new Headers({
            'X-CSRFToken': document.cookie.match(/csrftoken=([^\s;]+)/)[1],
        }),
        credentials: 'same-origin',
    }).then((response) => {
        if (!response.ok) {
            throw new Error(response);
        }
        return response.json();
    });
}

/**
 * Display a feed to the user.  Load a fresh snapshot if none is cached.
 */
export function showFeed(feedId) {
    return (dispatch, getState) => {
        const feedIds = [feedId];
        const { snapshot: { order, filter } } = getState();
        return _setSnapshot(feedIds, order, filter, dispatch, getState);
    };
}

function _setSnapshot(feedIds, order, filter, dispatch, getState) {
    // TODO: Only load snapshot if not already cached
    dispatch(requestSnapshot(feedIds, order, filter));

    return fetchSnapshot(feedIds, order, filter).then(
        json => {
            // Updated articles are always welcome.
            dispatch(receiveArticles(json.articlesById));
            // TODO: Check if the desired snapshot parameters have
            // changed since the request was sent.
            // FIXME (race condition)
            dispatch(receiveSnapshot(feedIds, order, filter, json.snapshot));
        },
        err => {
            console.error(err);
            dispatch(failSnapshot(feedIds, order, filter))
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
