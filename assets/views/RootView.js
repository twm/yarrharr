import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Logo, Heart } from 'widgets/icons.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AddFeedLink, InventoryLink } from 'widgets/links.js';
import Header from 'widgets/Header.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import { labelsByTitle, feedsByNewCount } from 'sorting.js';
import './RootView.less';


class RootView extends React.PureComponent {
    render() {
        const labelList = labelsByTitle(this.props);
        const feedList = feedsByNewCount(this.props);
        return <div className="root-view">
            <Header icon={<Logo width="48" height="48" />} text="Yarrharr Feed Reader" />
            <div className="floater-wrap">
                <div className="floater">
                    <InventoryLink>Manage Feeds</InventoryLink>
                    {" \x1b\x1b "}
                    <AddFeedLink>Add Feed</AddFeedLink>
                </div>
            </div>
            <ul className="tiles">
                <li>
                    <AllLink className="new-link" filter={FILTER_NEW}>
                        <div className="feed-title">All Feeds</div>
                    </AllLink>
                </li>
                {labelList.length
                    ? labelList.map((label) =>
                        <li key={"label-" + label.id}>
                            <LabelLink className="new-link" labelId={label.id} filter={FILTER_NEW}>
                                <div className="feed-title">{label.text}</div>
                                <div className="new-count">{label.newCount} new</div>
                            </LabelLink>
                            {label.savedCount
                                ? <LabelLink className="saved-link" labelId={label.id} filter={FILTER_SAVED}>
                                    <Heart width="48" height="48" alt="" className="star-icon" />
                                    <span className="saved-count">{label.savedCount}</span>
                                </LabelLink>
                                : null}
                        </li>)
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
}

if (process.env.NODE_ENV !== 'production') {
    RootView.propTypes = {
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
    };
}

export default connect(state => state, null)(RootView);
