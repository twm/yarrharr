import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Logo, Heart } from 'widgets/icons.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AddFeedLink, InventoryLink } from 'widgets/links.js';
import Header from 'widgets/Header.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { setLayout, LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import { labelsByTitle, feedsByNewCount } from 'sorting.js';
import './RootView.less';


class RootView extends React.PureComponent {
    render() {
        const labelList = labelsByTitle(this.props);
        const feedList = feedsByNewCount(this.props);
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
                            {label.faveCount
                                ? <LabelLink className="fave-link" labelId={label.id} filter={FILTER_SAVED}>
                                    <Heart width="48" height="48" alt="" className="star-icon" />
                                    <span className="fave-count">{label.faveCount}</span>
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
                            {feed.faveCount
                                ? <FeedLink className="fave-link" feedId={feed.id} filter={FILTER_SAVED}>
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
