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


export const RECEIVE_ARTICLES = 'RECEIVE_ARTICLES';
function receiveArticles(articlesById) {
    return {
        type: RECEIVE_ARTICLES,
        articlesById,
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
 * Display a feed to the user.  Load a fresh snapshot if none is cached.
 */
export function showFeed(feedId) {
    return (dispatch, getState) => {
        const feedIds = [feedId];
        const { order, filter } = getState();

        // TODO: Only load snapshot if not already cached
        dispatch(requestFeedSnapshot(feedIds, order, filter));

        return fetchSnapshot(feedIds, order, filter)
            .then(
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
