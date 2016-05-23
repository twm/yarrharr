import React from 'react';
import { connect } from 'react-redux';
import { Logo, Heart } from 'widgets/icons.js';
import { FeedLink, LabelLink, RootLink } from 'widgets/links.js';
import { FILTER_NEW, FILTER_SAVED, addLabels } from 'actions.js';
import { sortedLabels } from 'views/RootView.js';
import { feedsByTitle, labelsByTitle } from 'sorting.js';
//import './InventoryView.less';

export const LABEL_DRAG_DROP_TYPE = 'yarrharr/label';

export const InventoryView = React.createClass({
    propTypes: {
        labelsById: React.PropTypes.object.isRequired,
        feedsById: React.PropTypes.object.isRequired,
    },
    render() {
        const feedList = feedsByTitle(this.props);
        const labelList = labelsByTitle(this.props);
        return <div>
            <div className="global-tools">
                <RootLink className="text-button">
                    <span className="button"><Logo /></span>
                    Return to Feed List
                </RootLink>
            </div>
            <div className="floater-wrap">
                <div className="floater">
                    <div>Manage Feeds</div>
                </div>
            </div>
            {this.renderLabels(labelList)}
            {this.renderFeeds(feedList)}
        </div>;
    },
    renderLabels(labelList) {
        return <div className="labels">
            <h1>Labels <button className="text-button" onClick={this.handleAddLabel}>+</button></h1>
            {labelList.map(label =>
                <span className="label"
                      draggable
                      data-label={label.id}
                      onDragStart={this.handleLabelDragStart}>{label.title}</span>)}
        </div>;
    },
    handleAddLabel(event) {
        var title = prompt("Label Name:", "");
        if (title) {
            addLabel(title);
        }
    },
    handleLabelDragStart(event) {
        event.dataTransfer.setData(LABEL_DRAG_DROP_TYPE, event.currentTarget.dataset.label);
    },
    renderFeeds(feedList) {
        if (!feedList.length) {
            return <div className="floater-wrap">
                <div className="floater">No feeds.  Add one?</div>
            </div>;
        }
        return <table className="feeds">
            <thead>
                <tr>
                    <th>Feed</th>
                    <th>New</th>
                    <th>Saved</th>
                    <th>Labels</th>
                </tr>
            </thead>
            <tbody>
            {feedList.map(feed => <tr key={feed.id}>
                <td>
                    <FeedLink className="new-link" feedId={feed.id} filter={FILTER_NEW}>
                        <div className="feed-title">{feed.text || feed.title}</div>
                    </FeedLink>
                </td>
                <td>{feed.newCount}</td>
                <td>{feed.savedCount}</td>
                <td>{feed.labels.length
                    ? feed.labels.map(labelId => this.renderAppliedLabel(feed, labelId))
                    : "No labels"}</td>
            </tr>)}
            </tbody>
        </table>;
    },
    renderAppliedLabel(feed, labelId) {
        // TODO: Add X button
        return <span className="label">{this.props.labelsById[labelId].title}</span>;
    },
});

export default connect(state => state, null)(InventoryView);
