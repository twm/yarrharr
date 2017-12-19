import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Logo, LabelIcon, FeedIcon } from 'widgets/icons.js';
import Heart from 'icons/heart-empty.svg';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AddFeedLink, InventoryLink, RootLink } from 'widgets/links.js';
import Header from 'widgets/Header.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { FILTER_UNREAD, FILTER_FAVE } from 'actions.js';
import { labelsByTitle, feedsByTitle } from 'sorting.js';
import './RootView.less';


class RootView extends React.PureComponent {
    render() {
        const labelList = labelsByTitle(this.props);
        const feedList = feedsByTitle(this.props);
        return <div className="root-view">
            <GlobalBar>
                <div className="bar-inset">
                    <div className="text">
                        <h1>Yarrharr Feed Reader</h1>
                    </div>
                </div>
            </GlobalBar>
            <div className="tabs">
                <div className="tabs-inner">
                    <RootLink disabled={true}>Home</RootLink>
                    <InventoryLink>Manage Feeds</InventoryLink>
                    <AddFeedLink>Add Feed</AddFeedLink>
                </div>
            </div>
            <div className="root-inner-wrap">
                <div className="root-inner">
                    <p className="all-link">
                        <AllLink filter={FILTER_UNREAD}>All Feeds</AllLink>
                    </p>

                    <ul>
                        {labelList.length
                            ? labelList.map((label) =>
                                <li key={"label-" + label.id}>
                                    <LabelLink labelId={label.id} filter={FILTER_UNREAD}>
                                        <LabelIcon aria-hidden={true} />
                                        {label.text}
                                    </LabelLink>
                                </li>)
                            : null}
                    </ul>

                    <ul>
                        {feedList.length
                            ? feedList.map((feed) =>
                                <li key={"feed-" + feed.id}>
                                    <FeedLink feedId={feed.id} filter={FILTER_UNREAD}>
                                        <FeedIcon aria-hidden={true} />
                                        {feed.text || feed.title}
                                    </FeedLink>
                                </li>)
                            : <li>No feeds.  Add one?</li>}
                    </ul>
                </div>
            </div>
        </div>;
    }
}

if (process.env.NODE_ENV !== 'production') {
    RootView.propTypes = {
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
    };
}

export default connect(state => state)(RootView);
