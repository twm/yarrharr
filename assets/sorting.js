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
        return (textA < textB) ? -1 :
               (textA > textB) ? 1 :
               b.id - a.id;
    });
    return labelList;
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
