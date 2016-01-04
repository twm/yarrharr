import React from 'react';
import { connect } from 'react-redux';
import Logo from 'widgets/Logo.js';
import { FeedLink, LabelLink } from 'widgets/links.js';
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
        <div className="controls">
            <div className="toolbar-button"><Logo /></div>
            <div className="expand">Yarrharr Feed Reader</div>
            {/* TODO: Add useful functionality here */}
        </div>
        <div className="labels">
            <h1>Labels</h1>
            {labelList.length
                ? <ul>{labelList.map((label) => <li key={label.id}><LabelLink labelId={label.id}>{label.text}</LabelLink></li>)}</ul>
                : <div>No labels.  Add one?</div>}
        </div>
        <div className="feeds">
            <h1>Feeds</h1>
            {feedList.length
                ? <ul>{feedList.map((feed) =>
                    <li key={feed.id}>
                        <FeedLink feedId={feed.id}>{feed.text || feed.title}</FeedLink>
                        &nbsp;<span className="new-count">{ feed.newCount }</span>
                    </li>)}</ul>
                : <div>No feeds.  Add one?</div>}
        </div>
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
