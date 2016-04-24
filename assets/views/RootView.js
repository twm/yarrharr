import React from 'react';
import { connect } from 'react-redux';
import { Logo, Heart } from 'widgets/icons.js';
import { FeedLink, LabelLink } from 'widgets/links.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import './RootView.less';


/**
 * Get all the labels, sorted alphabetically.
 *
 * @param state
 */
function sortedLabels({labelsById}) {
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
function sortedFeeds({feedsById}) {
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


function RootView({labelList, feedList}) {
    return <div className="root-view">
        <div className="floater-wrap">
            <div className="floater">
                <Logo width="48" height="48" />
                <div>Yarrharr Feed Reader</div>
            </div>
        </div>
        <ul className="tiles">
            {labelList.length
                ? labelList.map((label) => <li key={"label-" + label.id}><LabelLink labelId={label.id}>{label.text}</LabelLink></li>)
                : null}
            {feedList.length
                ? feedList.map((feed) =>
                    <li key={"feed-" + feed.id}>
                        <FeedLink className="new-link" feedId={feed.id} filter={FILTER_NEW}>
                            <div className="feed-title">{feed.text || feed.title}</div>
                            <div className="new-count">{feed.newCount} new</div>
                        </FeedLink>
                        {feed.savedCount
                            ? <FeedLink className="saved-link" feedId={feed.id} filter={FILTER_SAVED}>
                                <Heart width="48" height="48" alt="" className="star-icon" />
                                <span className="saved-count">{feed.savedCount}</span>
                            </FeedLink>
                            : null}
                    </li>)
                : <li>No feeds.  Add one?</li>}
        </ul>
    </div>;
}
RootView.propTypes = {
    labelList: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
    feedList: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
};

module.exports = connect(state => {
    return {
        labelList: sortedLabels(state),
        feedList: sortedFeeds(state),
    };
}, null)(RootView);
