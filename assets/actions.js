export const REQUEST_FEED_SNAPSHOT = 'REQUEST_FEED_SNAPSHOT';
function requestFeedSnapshot(feedId, order, filter) {
    return {
        type: REQUEST_FEED_SNAPSHOT,
        feedId,
        order,
        filter,
    };
}

export const RECEIVE_FEED_SNAPSHOT = 'RECEIVE_FEED_SNAPSHOT';
function receiveFeedSnapshot(feedId, order, filter, articleIds) {
    return {
        type: RECEIVE_FEED_SNAPSHOT,
        feedId,
        order,
        filter,
        articleIds,
    };
}


export const FAIL_FEED_SNAPSHOT = 'FAIL_FEED_SNAPSHOT';
function failFeedSnapshot(feedId, order, filter) {
    return {
        type: FAIL_FEED_SNAPSHOT,
        feedId,
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
 *     {
 *         articlesById: Object<articleId, *>,
 *     }
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
        const { order, filter } = getState();

        // TODO: Only load snapshot if not already cached
        dispatch(requestFeedSnapshot(feedIds, order, filter));

        return fetchSnapshot(feedIds, order, filter).then(
            json => {
                dispatch(receiveArticles(json.articlesById));
                dispatch(receiveFeedSnapshot(feedIds, order, filter, json.snapshot));
            },
            err => {
                console.error(err);
                dispatch(failFeedSnapshot(feedIds, order, filter))
            });
    };
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
