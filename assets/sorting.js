 /**
 * Get all the labels, sorted alphabetically.
 *
 * @param state
 */
export function labelsByTitle({labelsById}) {
    var labelList = Object.keys(labelsById).map((labelId) => labelsById[labelId]);
    labelList.sort((a, b) => {
        var textA = a.text.toLowerCase();
        var textB = b.text.toLowerCase();
        return (titleA < titleB) ? -1 :
               (titleA > titleB) ? 1 :
               b.id - a.id;
    });
    return labelList;
}


/**
 * Compute a sorted list of available feeds.  Feeds are ordered by count of new
 * posts, then alphabetically.  The sort is stable (using feed ID as
 * a tie-breaker).
 *
 * @param state
 */
export function feedsByNewCount({feedsById}) {
    var feedList = Object.keys(feedsById).map((feedId) => feedsById[feedId]);
    feedList.sort((a, b) => {
        // TODO: Investigate Intl.Collator and friends to make this more correct.
        var titleA = (a.text || a.title).toLowerCase();
        var titleB = (b.text || b.title).toLowerCase();
        return (a.newCount > b.newCount) ? -1 :
               (a.newCount < b.newCount) ? 1 :
               (titleA < titleB) ? -1 :
               (titleA > titleB) ? 1 :
               b.id - a.id;
    })
    return feedList;
}

/**
 * Compute a list of feeds sorted by name.  The sort is stable (using feed ID
 * as a tie-breaker).
 *
 * @param state
 */
export function feedsByTitle({feedsById}) {
    var feedList = Object.keys(feedsById).map((feedId) => feedsById[feedId]);
    feedList.sort((a, b) => {
        // TODO: Investigate Intl.Collator and friends to make this more correct.
        var titleA = (a.text || a.title).toLowerCase();
        var titleB = (b.text || b.title).toLowerCase();
        return (titleA < titleB) ? -1 :
               (titleA > titleB) ? 1 :
               b.id - a.id;
    })
    return feedList;
}
