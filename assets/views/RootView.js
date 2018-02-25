import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Logo, LabelIcon, FeedIcon } from 'widgets/icons.js';
import Heart from 'icons/heart-empty.svg';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AddFeedLink, InventoryLink, RootLink } from 'widgets/links.js';
import Header from 'widgets/Header.js';
import { Tabs } from 'widgets/Tabs.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { FILTER_UNREAD, FILTER_FAVE } from 'actions.js';
import { labelsByTitle, feedsByTitle } from 'sorting.js';
import './RootView.less';


class RootView extends React.PureComponent {
    render() {
        const labelList = labelsByTitle(this.props).filter(l => l.unreadCount !== 0);
        const feedList = feedsByTitle(this.props).filter(f => f.unreadCount !== 0);
        return <React.Fragment>
            <GlobalBar />
            <Tabs>
                <RootLink disabled={true}>Home</RootLink>
                <InventoryLink>Manage Feeds</InventoryLink>
                <AddFeedLink>Add Feed</AddFeedLink>
            </Tabs>
            <div className="root">
                <ul className="root-list">
                    <li className="all-link">
                        <AllLink filter={FILTER_UNREAD}>All Feeds</AllLink>
                    </li>

                    {labelList.length
                        ? labelList.map((label) =>
                            <li key={"label-" + label.id}>
                                <LabelLink labelId={label.id} filter={FILTER_UNREAD}>
                                    <LabelIcon className="icon" aria-hidden={true} />
                                    <span className="text">{label.text}</span>
                                </LabelLink>
                            </li>)
                        : null}

                    {feedList.length
                        ? feedList.map((feed) =>
                            <li key={"feed-" + feed.id}>
                                <FeedLink feedId={feed.id} filter={FILTER_UNREAD}>
                                    <FeedIcon className="icon" aria-hidden={true} />
                                    <span className="text">{feed.text || feed.title}</span>
                                </FeedLink>
                            </li>)
                        : <li>No feeds.  Add one?</li>}
                </ul>
            </div>
        </React.Fragment>;
    }
}

if (process.env.NODE_ENV !== 'production') {
    RootView.propTypes = {
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
    };
}

export default connect(state => state)(RootView);
