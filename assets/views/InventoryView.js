import React from 'react';
import { connect } from 'react-redux';
import { Add, Logo, Heart } from 'widgets/icons.js';
import { FeedLink, LabelLink, RootLink } from 'widgets/links.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import { addLabel, attachLabel, detachLabel } from 'actions.js';
import { sortedLabels } from 'views/RootView.js';
import { feedsByTitle, labelsByTitle } from 'sorting.js';
import './InventoryView.less';

export const LABEL_DRAG_DROP_TYPE = 'yarrharr/label';

export const InventoryView = React.createClass({
    propTypes: {
        labelsById: React.PropTypes.object.isRequired,
        feedsById: React.PropTypes.object.isRequired,
    },
    render() {
        const feedList = feedsByTitle(this.props);
        const labelList = labelsByTitle(this.props);
        return <div className="inventory-view">
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
            {this.renderFeeds(feedList, labelList)}
        </div>;
    },
    renderFeeds(feedList, labelList) {
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
                </tr>
            </thead>
            <tbody>
            {feedList.map(feed => <tr key={feed.id}>
                <td>
                    <FeedLink className="new-link" feedId={feed.id} filter={FILTER_NEW}>
                        <div className="feed-title">{feed.text || feed.title}</div>
                    </FeedLink>
                    {feed.labels.length
                        ? feed.labels.map(labelId => {
                            const label = this.props.labelsById[labelId];
                            return <Label
                                key={labelId}
                                label={label}
                                onDetach={event => this.handleLabelDetach(feed.id, labelId)}
                            />;
                        })
                        : "No labels"}
                    <AttachLabelButton
                        feed={feed}
                        labelList={labelList}
                        onLabelAdd={this.handleLabelAdd}
                        onLabelPick={(feed, label) => {
                            this.props.dispatch(attachLabel(feed.id, label.id));
                        }}
                    />
                </td>
                <td><FeedLink feedId={feed.id} filter={FILTER_NEW}>{feed.newCount}</FeedLink></td>
                <td><FeedLink feedId={feed.id} filter={FILTER_SAVED}>{feed.savedCount}</FeedLink></td>
            </tr>)}
            </tbody>
        </table>;
    },
    handleLabelAdd(text) {
        this.props.dispatch(addLabel(text));
    },
    /**
     * Detach the given label from a feed it is currently associated with.
     */
    handleLabelDetach(feedId, labelId) {
        this.props.dispatch(detachLabel(feedId, labelId));
    },
});

export const Label = React.createClass({
    propTypes: {
        label: React.PropTypes.object.isRequired,
        onDetach: React.PropTypes.func.isRequired,
    },
    render() {
        return <span style={{
            'whiteSpace': 'nowrap',
            'padding': '0 0.25em 0 0',
        }}>
            <span style={{
                'padding': '0 0.25em 0 0.5em',
                'background': 'no-repeat -0.25em 50% url(' + window.__webpack_public_path__ + require('../label.inkscape.svg') + ')',
            }}>
                {this.props.label.text}
            </span>
            <button
                className="invisible-button"
                onClick={this.props.onDetach}>
                <span
                    style={{
                        'borderLeft': '1px solid #f0f0f0',
                        'background': '#dbdbdb',
                        'font': 'inherit',
                        'padding': '0 0.25em',
                        'display': 'inline',
                    }}>
                    ×
                </span>
            </button>
        </span>;
    },
});

export const AttachLabelButton = React.createClass({
    propTypes: {
        labelList: React.PropTypes.array.isRequired,
        feed: React.PropTypes.object.isRequired,
        // Will be called with the text of the label to add.
        onLabelAdd: React.PropTypes.func.isRequired,
        // Will be called with the feed and label to associate it with.
        onLabelPick: React.PropTypes.func.isRequired,
    },
    getInitialState() {
        return {open: false};
    },
    handleClick(event) {
        this.setState({open: !this.state.open});
    },
    render() {
        return <span>
            <button
                className="invisible-button"
                onClick={this.handleClick}
                style={{'padding': '0 0.25em'}}>
                +
            </button>
            {this.state.open
                ? <LabelPicker
                    {...this.props}
                    onCancel={() => this.setState({open: false})}
                    />
                : null}
        </span>;
    },
});

/**
 *
 */
export const LabelPicker = React.createClass({
    propTypes: {
        // Feed object
        feed: React.PropTypes.shape({
            text: React.PropTypes.string.isRequired,
            labels: React.PropTypes.arrayOf(React.PropTypes.number).isRequired,
        }).isRequired,
        // All available labels (only those not associated with the feed will be shown).
        labelList: React.PropTypes.arrayOf(React.PropTypes.object).isRequired,
        // Will be called with the text of the label to add.
        onLabelAdd: React.PropTypes.func.isRequired,
        // Will be called with the feed and label to associate it with.
        onLabelPick: React.PropTypes.func.isRequired,
        // Called with no arguments when the Cancel button is clicked.
        onCancel: React.PropTypes.func.isRequired,
    },
    unappliedLabels() {
        return this.props.labelList.filter(function(label) {
            return this.props.feed.labels.indexOf(label.id) < 0;
        }, this);
    },
    render() {
        return <div
            onClick={this.handleCancel}
            style={{
                position: 'fixed',
                width: '100vw',
                height: '100vh',
                top: '0px',
                left: '0px',
                background: 'rgba(0, 0, 0, 0.5)',
            }}>
            <section className="label-picker">
                <header>
                    <h1>Attach Label to {this.props.feed.text || this.props.feed.title}</h1>
                    <button
                        title="Create Label"
                        className="button"
                        onClick={this.handleAdd}>
                        <Add alt="+" width="32" height="32" />
                    </button>
                </header>
                <div className="center">
                    {this.unappliedLabels().map(label => <div>
                        <button className="invisible-button" onClick={e => this.handleLabelClick(label)}>{label.text}</button>
                    </div>)}
                </div>
                <footer>
                    <button className="invisible-button cancel" onClick={this.handleCancel}>Cancel</button>
                </footer>
            </section>
        </div>;
    },
    handleAdd(event) {
        var text = prompt("Label Name:", "");
        if (text) {
            this.props.onLabelAdd(text);
        }
        event.stopPropagation();
    },
    /**
     * A label was clicked.  Call the associated callback.
     */
    handleLabelClick(label) {
        this.props.onLabelPick(this.props.feed, label);
    },
    handleCancel(event) {
        this.props.onCancel();
    },
    componentDidMount() {
        // TODO: Focus the first button
    },
});

export default connect(state => state, null)(InventoryView);
