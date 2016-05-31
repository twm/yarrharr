import React from 'react';
import PureRenderMixin from 'react-addons-pure-render-mixin';
import { connect } from 'react-redux';
import { Logo, Heart } from 'widgets/icons.js';
import { FeedLink, InventoryLink, LabelLink } from 'widgets/links.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import { labelsByTitle, feedsByNewCount } from 'sorting.js';
import './RootView.less';


export const RootView = React.createClass({
    mixins: [PureRenderMixin],
    propTypes: {
        labelsById: React.PropTypes.object.isRequired,
        feedsById: React.PropTypes.object.isRequired,
    },
    render() {
        const labelList = labelsByTitle(this.props);
        const feedList = feedsByNewCount(this.props);
        return <div className="root-view">
            <div className="floater-wrap">
                <div className="floater">
                    <Logo width="48" height="48" />
                    <div>Yarrharr Feed Reader</div>
                </div>
            </div>
            <div className="floater-wrap">
                <div className="floater">
                    <InventoryLink>Manage Feeds</InventoryLink>
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
    },
});

export default connect(state => state, null)(RootView);
