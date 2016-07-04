import React from 'react';
import { connect } from 'react-redux';
import { Add, Remove, Logo, Heart } from 'widgets/icons.js';
import { ViewButton } from 'widgets/ViewControls.js';
import Header from 'widgets/Header.js';
import { AddFeedLink, FeedLink, LabelLink, RootLink } from 'widgets/links.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import { setLayout, LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { addFeed, removeFeed, addLabel, attachLabel, detachLabel } from 'actions.js';
import { sortedLabels } from 'views/RootView.js';
import { feedsByTitle, labelsByTitle } from 'sorting.js';
import './InventoryView.less';

export const LABEL_DRAG_DROP_TYPE = 'yarrharr/label';

export const InventoryView = React.createClass({
    propTypes: {
        dispatch: React.PropTypes.func.isRequired,
        labelsById: React.PropTypes.object.isRequired,
        feedsById: React.PropTypes.object.isRequired,
        layout: React.PropTypes.oneOf([LAYOUT_NARROW, LAYOUT_WIDE]).isRequired,
        onRemoveFeed: React.PropTypes.func.isRequired,
        onSetLayout: React.PropTypes.func.isRequired,
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
                <AddFeedLink className="text-button text-button-left" style={{margin: '0 4px 0 auto'}}>
                    Add Feed
                    <span className="button">
                        <Add alt="" />
                    </span>
                </AddFeedLink>
                <ViewButton layout={this.props.layout} onSetLayout={this.props.onSetLayout} />
            </div>
            <Header>Manage Feeds</Header>
            {this.renderFeeds(feedList, labelList)}
        </div>;
    },
    renderFeeds(feedList, labelList) {
        if (!feedList.length) {
            return <div className="floater-wrap">
                <div className="floater">No feeds.  <AddFeedLink>Add one?</AddFeedLink></div>
            </div>;
        }

        return <div>
            {feedList.map(feed => <div key={feed.id} className={`feed-wrap ${this.props.layout}`}>
                <div className="feed-info">
                    <h2>{feed.text || feed.title} {feed.active ? null : <i>(inactive)</i>}</h2>
                    <div><a href={feed.url}>{feed.url}</a></div>
                    {feed.labels.length
                        ? feed.labels.map(labelId => {
                            const label = this.props.labelsById[labelId];
                            return <Label
                                key={labelId}
                                label={label}
                                onDetach={event => this.props.onDetachLabel(feed.id, labelId)}
                            />;
                        })
                        : "No labels"}
                        <AttachLabelButton
                            feed={feed}
                            labelList={labelList}
                            onLabelAdd={this.props.onAddLabel}
                            onLabelPick={(feed, label) => {
                                this.props.onAttachLabel(feed.id, label.id);
                            }}
                        />
                    <div><FeedLink feedId={feed.id} filter={FILTER_NEW}>{feed.newCount} new</FeedLink></div>
                    <div><FeedLink feedId={feed.id} filter={FILTER_SAVED}>{feed.savedCount} saved</FeedLink></div>
                    <div>Last updated {feed.updated}</div>
                    {feed.error ? <div style={{whiteSpace: 'pre-wrap'}}><strong>Error:</strong> {feed.error}</div> : null}
                </div>
                <div className="tools">
                    <div className="tools-inner">
                        <button className="button" title="Remove feed" onClick={e => this.handleRemoveFeed(feed.id)}>
                            <Remove width="40" height="40" alt="Remove feed" />
                        </button>
                    </div>
                </div>
            </div>)}
        </div>;
    },
    handleRemoveFeed(feedId) {
        const feed = this.props.feedsById[feedId];
        if (!feed) return;
        if (confirm("Remove feed " + (feed.text || feed.title) + " and associated articles?")) {
            this.props.onRemoveFeed(feedId);
        }
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

export const ConnectedInventoryView = connect(state => state, {
    onAttachLabel: attachLabel,
    onAddLabel: addLabel,
    onDetachLabel: detachLabel,
    onRemoveFeed: removeFeed,
    onSetLayout: setLayout,
})(InventoryView);

export const AddFeedView = React.createClass({
    propTypes: {
        /**
         * Pre-fill the URL field with this value.
         */
        defaultUrl: React.PropTypes.string,
        /**
         * The current feed add operation (if one is ongoing).
         */
        feedAdd: React.PropTypes.object.isRequired,
        /**
         * A superficially valid URL has been entered by the user.  Attempt to add
         * it as a feed.
         *
         * @param url String Something that looks like a URL.
         */
        onSubmit: React.PropTypes.func.isRequired,
    },
    render() {
        return <div className="add-feed-view">
            <div className="global-tools">
                <RootLink className="text-button">
                    <span className="button"><Logo /></span>
                    Return to Feed List
                </RootLink>
            </div>
            <Header>Add Feed</Header>
            <div className="form">
                <p>Enter the URL of Atom or RSS feed:</p>
                <UrlForm onSubmit={this.props.onSubmit} defaultUrl={this.props.defaultUrl} />
                {this.renderAdd()}
            </div>
        </div>;
    },
    renderAdd() {
        const { url=null, error=null, feedId=null } = this.props.feedAdd;
        if (!url) {
            return null;
        }
        if (error) {
            return <div>
                <p>Error adding {url}</p>
            </div>;
        }
        if (feedId) {
            return <div>
                <p>Added feed <FeedLink feedId={feedId}>{url}</FeedLink></p>
            </div>;
        }
        return <p>Adding feed {url}</p>;
    },
});

const UrlForm = React.createClass({
    propTypes: {
        onSubmit: React.PropTypes.func.isRequired,
        defaultUrl: React.PropTypes.string,
    },
    getInitialState() {
        return {url: ''};
    },
    render() {
        return <form onSubmit={this.handleSubmit}>
            <input type="url" name="url" defaultValue={this.props.defaultUrl} value={this.state.url} onChange={this.handleUrlChange} />
            <input type="submit" value="Add" />
        </form>;
    },
    handleUrlChange(event) {
        this.setState({url: event.target.value});
    },
    handleSubmit(event) {
        event.preventDefault();
        this.props.onSubmit(this.state.url);
    },
});

export const ConnectedAddFeedView = connect(state => state, {
    onSubmit: addFeed,
})(AddFeedView);
