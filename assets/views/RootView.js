import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Logo, Heart } from 'widgets/icons.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AddFeedLink, InventoryLink } from 'widgets/links.js';
import Header from 'widgets/Header.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { setLayout, LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { FILTER_UNREAD, FILTER_FAVE } from 'actions.js';
import { labelsByTitle, feedsByTitle } from 'sorting.js';
import './RootView.less';


class RootView extends React.PureComponent {
    render() {
        const labelList = labelsByTitle(this.props);
        const feedList = feedsByTitle(this.props);
        return <div className={"root-view layout-" + this.props.layout}>
            <GlobalBar layout={this.props.layout} onSetLayout={this.props.onSetLayout} />
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
                    <AllLink className="unread-link" filter={FILTER_UNREAD}>
                        <div className="feed-title">All Feeds</div>
                    </AllLink>
                </li>
                {labelList.length
                    ? labelList.map((label) =>
                        <li key={"label-" + label.id}>
                            <LabelLink className="unread-link" labelId={label.id} filter={FILTER_UNREAD}>
                                <div className="feed-title">{label.text}</div>
                                <div className="unread-count">{label.unreadCount} unread</div>
                            </LabelLink>
                            {label.faveCount
                                ? <LabelLink className="fave-link" labelId={label.id} filter={FILTER_FAVE}>
                                    <Heart width="48" height="48" alt="" className="star-icon" />
                                    <span className="fave-count">{label.faveCount}</span>
                                </LabelLink>
                                : null}
                        </li>)
                    : null}
                {feedList.length
                    ? feedList.map((feed) =>
                        <li key={"feed-" + feed.id}>
                            <FeedLink className="unread-link" feedId={feed.id} filter={FILTER_UNREAD}>
                                <div className="feed-title">{feed.text || feed.title}</div>
                                <div className="unread-count">{feed.unreadCount} unread</div>
                            </FeedLink>
                            {feed.faveCount
                                ? <FeedLink className="fave-link" feedId={feed.id} filter={FILTER_FAVE}>
                                    <Heart width="48" height="48" alt="" className="star-icon" />
                                    <span className="fave-count">{feed.faveCount}</span>
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
        layout: PropTypes.oneOf([LAYOUT_NARROW, LAYOUT_WIDE]).isRequired,
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
    };
}

export default connect(state => state, {
    onSetLayout: setLayout,
})(RootView);
