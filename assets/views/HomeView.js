import React from 'react';
import PropTypes from 'prop-types';

import { connect } from 'react-redux';
import { Title } from 'widgets/Title.jsm';
import { GlobeIcon, LabelIcon, FeedIcon } from 'widgets/icons.js';
import { Count } from 'widgets/Count.js';
import { AllLink, FeedLink, LabelLink } from 'widgets/links.js';
import { AddFeedLink, FeedListLink, LabelListLink, HomeLink } from 'widgets/links.js';
import { Tabs } from 'widgets/Tabs.js';
import { GlobalBar, HomeIconLink } from 'widgets/GlobalBar.js';
import { FILTER_UNREAD, FILTER_FAVE } from 'actions.js';
import { labelsByTitle, feedsByTitle } from 'sorting.js';
import './HomeView.less';


class HomeView extends React.PureComponent {
    render() {
        const allLabels = labelsByTitle(this.props);
        const allFeeds = feedsByTitle(this.props);
        const labelList = allLabels.filter(l => l.unreadCount !== 0);
        const feedList = allFeeds.filter(f => f.unreadCount !== 0);
        return <React.Fragment>
            <GlobalBar>
                <Tabs>
                    <FeedListLink aria-selected={false} className="no-underline">Feeds</FeedListLink>
                    <LabelListLink aria-selected={false} className="no-underline">Labels</LabelListLink>
                    <AddFeedLink aria-selected={false} className="no-underline">Add Feed</AddFeedLink>
                </Tabs>
            </GlobalBar>
            <Title title="Home" />
            <div className="root">
                <h1>Home</h1>
                <p>{allLabels.length} labels, {allFeeds.length} feeds</p>

                <ul className="root-list">
                    <li>
                        <AllLink filter={FILTER_UNREAD} className="no-underline">
                            <GlobeIcon aria-hidden={true} />
                            All Feeds
                        </AllLink>
                    </li>
                    {labelList.length
                        ? labelList.map((label) =>
                            <li key={"label-" + label.id} className="home-item">
                                <LabelLink labelId={label.id} filter={FILTER_UNREAD} className="no-underline">
                                    <span>
                                        <LabelIcon aria-hidden={true} />
                                        {label.text}
                                    </span>
                                    <Count value={label.unreadCount} />
                                </LabelLink>
                            </li>)
                        : <li>No labels.  <LabelListLink>Add one?</LabelListLink></li>}
                    {feedList.length
                        ? feedList.map((feed) =>
                            <li key={"feed-" + feed.id} className="home-item">
                                <FeedLink feedId={feed.id} filter={FILTER_UNREAD} className="no-underline">
                                    <span>
                                        <FeedIcon aria-hidden={true} />
                                        {feed.text || feed.title}
                                    </span>
                                    <Count value={feed.unreadCount} />
                                </FeedLink>
                            </li>)
                        : <li>No feeds.  Add one?</li>}
                </ul>
            </div>
        </React.Fragment>;
    }
}

if (process.env.NODE_ENV !== 'production') {
    HomeView.propTypes = {
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
    };
}

export default connect(state => state)(HomeView);
