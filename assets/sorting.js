 /**
 * Get all the labels, sorted alphabetically.
 *
 * @param state
 */
export function labelsByTitle({labelsById, labelOrder}) {
    return labelOrder.map(id => labelsById[id]);
}


/**
 * Compute a list of feeds sorted by name.  The sort is stable (using feed ID
 * as a tie-breaker).
 *
 * @param state
 */
export function feedsByTitle({feedsById, feedOrder}) {
    return feedOrder.map(id => feedsById[id]);
}
