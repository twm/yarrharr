import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Add, Remove, Logo, Heart } from 'widgets/icons.js';
import Header from 'widgets/Header.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { Label } from 'widgets/Label.js';
import { AddFeedLink, FeedLink, LabelLink, RootLink } from 'widgets/links.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import { setLayout, LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { addFeed, removeFeed, addLabel, attachLabel, detachLabel } from 'actions.js';
import { sortedLabels } from 'views/RootView.js';
import { feedsByTitle, labelsByTitle } from 'sorting.js';
import './InventoryView.less';

const __debug__ = process.env.NODE_ENV !== 'production';

export class InventoryView extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleRemoveFeed = this.handleRemoveFeed.bind(this);
    }
    render() {
        const feedList = feedsByTitle(this.props);
        const labelList = labelsByTitle(this.props);
        return <div className={"inventory-view layout-" + this.props.layout}>
            <GlobalBar layout={this.props.layout} onSetLayout={this.props.onSetLayout} />
            <Header text="Manage Feeds" />
            <div className="floater-wrap">
                <div className="floater">
                        <AddFeedLink>Add Feed</AddFeedLink>
                </div>
            </div>
            {this.renderFeeds(feedList, labelList)}
        </div>;
    }
    renderFeeds(feedList, labelList) {
        if (!feedList.length) {
            return <div className="floater-wrap">
                <div className="floater">No feeds.  <AddFeedLink>Add one?</AddFeedLink></div>
            </div>;
        }

        return <div>
            {feedList.map(feed => <FeedInfo
                key={feed.id}
                feed={feed}
                labelList={labelList}
                labelsById={this.props.labelsById}
                onAddLabel={this.props.onAddLabel}
                onAttachLabel={this.props.onAttachLabel}
                onDetachLabel={this.props.onDetachLabel}
                onRemoveFeed={this.handleRemoveFeed}
            />)}
        </div>;
    }
    handleRemoveFeed(feedId) {
        const feed = this.props.feedsById[feedId];
        if (!feed) return;
        if (confirm("Remove feed " + (feed.text || feed.title || feed.url) + " and associated articles?")) {
            this.props.onRemoveFeed(feedId);
        }
    }
}

class FeedInfo extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClickRemoveFeed = e => props.onRemoveFeed(props.feed.id);
    }
    render() {
        const feed = this.props.feed;
        const labelList = this.props.labelList;
        return <div className="feed-wrap">
            <div className="feed-info">
                <h2>{feed.text || feed.title || feed.url} {feed.active ? null : <i>(inactive)</i>}</h2>
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
                        onAddLabel={this.props.onAddLabel}
                        onLabelPick={(feed, label) => {
                            this.props.onAttachLabel(feed.id, label.id);
                        }}
                    />
                <div><FeedLink feedId={feed.id} filter={FILTER_NEW}>{feed.newCount} new</FeedLink></div>
                <div><FeedLink feedId={feed.id} filter={FILTER_SAVED}>{feed.faveCount} marked favorite</FeedLink></div>
                <div>Last updated {feed.updated}</div>
                {feed.error ? <div style={{whiteSpace: 'pre-wrap'}}><strong>Error:</strong> {feed.error}</div> : null}
            </div>
            <div className="tools">
                <div className="tools-inner">
                    <button className="button" title="Remove feed" onClick={this.handleClickRemoveFeed}>
                        <Remove width="40" height="40" alt="Remove feed" />
                    </button>
                </div>
            </div>
        </div>;
    }
}

if (__debug__) {
    InventoryView.propTypes = {
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
        layout: PropTypes.oneOf([LAYOUT_NARROW, LAYOUT_WIDE]).isRequired,
        onRemoveFeed: PropTypes.func.isRequired,
        onSetLayout: PropTypes.func.isRequired,
        onAddLabel: PropTypes.func.isRequired,
    };

    FeedInfo.propTypes = {
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            error: PropTypes.string,
        }).isRequired,
        onRemoveFeed: PropTypes.func.isRequired,
        onAttachLabel: PropTypes.func.isRequired,
        onAddLabel: PropTypes.func.isRequired,
    };
}

export class AttachLabelButton extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {open: false};
        this.handleClick = (event) => {
            this.setState({open: !this.state.open});
        };
    }
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
    }
}

AttachLabelButton.propTypes = {
    labelList: PropTypes.array.isRequired,
    feed: PropTypes.object.isRequired,
    // Will be called with the text of the label to add.
    onAddLabel: PropTypes.func.isRequired,
    // Will be called with the feed and label to associate it with.
    onLabelPick: PropTypes.func.isRequired,
};

/**
 *
 */
export class LabelPicker extends React.PureComponent {
    unappliedLabels() {
        return this.props.labelList.filter(function(label) {
            return this.props.feed.labels.indexOf(label.id) < 0;
        }, this);
    }
    render() {
        return <div
            onClick={e => this.handleCancel(e)}
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
                        onClick={e => this.handleAdd(e)}>
                        <Add alt="+" width="32" height="32" />
                    </button>
                </header>
                <div className="center">
                    {this.unappliedLabels().map(label => <div>
                        <button className="invisible-button" onClick={e => this.handleLabelClick(label)}>{label.text}</button>
                    </div>)}
                </div>
                <footer>
                    <button className="invisible-button cancel" onClick={e => this.handleCancel(e)}>Cancel</button>
                </footer>
            </section>
        </div>;
    }
    handleAdd(event) {
        var text = prompt("Label Name:", "");
        if (text) {
            this.props.onAddLabel(text);
        }
        event.stopPropagation();
    }
    /**
     * A label was clicked.  Call the associated callback.
     */
    handleLabelClick(label) {
        this.props.onLabelPick(this.props.feed, label);
    }
    handleCancel(event) {
        this.props.onCancel();
    }
    componentDidMount() {
        // TODO: Focus the first button
    }
}

LabelPicker.propTypes = {
    // Feed object
    feed: PropTypes.shape({
        text: PropTypes.string.isRequired,
        labels: PropTypes.arrayOf(PropTypes.number).isRequired,
    }).isRequired,
    // All available labels (only those not associated with the feed will be shown).
    labelList: PropTypes.arrayOf(PropTypes.object).isRequired,
    // Will be called with the text of the label to add.
    onAddLabel: PropTypes.func.isRequired,
    // Will be called with the feed and label to associate it with.
    onLabelPick: PropTypes.func.isRequired,
    // Called with no arguments when the Cancel button is clicked.
    onCancel: PropTypes.func.isRequired,
};

export const ConnectedInventoryView = connect(state => state, {
    onAttachLabel: attachLabel,
    onAddLabel: addLabel,
    onDetachLabel: detachLabel,
    onRemoveFeed: removeFeed,
    onSetLayout: setLayout,
})(InventoryView);

export class AddFeedView extends React.PureComponent {
    render() {
        return <div className={"add-feed-view layout-" + this.props.layout}>
            <GlobalBar layout={this.props.layout} onSetLayout={this.props.onSetLayout} />
            <div className="form">
                <h2>Add Feed</h2>
                <p>Enter the URL of Atom or RSS feed:</p>
                <UrlForm onSubmit={this.props.onSubmit} defaultUrl={this.props.defaultUrl} />
                {this.renderAdd()}
            </div>
        </div>;
    }
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
                <p>Added feed <FeedLink feedId={feedId} filter={FILTER_NEW}>{url}</FeedLink></p>
            </div>;
        }
        return <p>Adding feed {url}</p>;
    }
}

AddFeedView.propTypes = {
    /**
     * Pre-fill the URL field with this value.
     */
    defaultUrl: PropTypes.string,
    /**
     * The current feed add operation (if one is ongoing).
     */
    feedAdd: PropTypes.object.isRequired,
    /**
     * A superficially valid URL has been entered by the user.  Attempt to add
     * it as a feed.
     *
     * @param {string} url Something that looks like a URL.
     */
    onSubmit: PropTypes.func.isRequired,
};

class UrlForm extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {url: ''};
        this.handleUrlChange = event => {
            this.setState({url: event.target.value});
        };
        this.handleSubmit = event => {
            event.preventDefault();
            this.props.onSubmit(this.state.url);
        };
    }
    render() {
        return <form onSubmit={this.handleSubmit}>
            <input type="url" name="url" defaultValue={this.props.defaultUrl} value={this.state.url} onChange={this.handleUrlChange} />
            <input type="submit" value="Add" />
        </form>;
    }
}

UrlForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    defaultUrl: PropTypes.string,
};

export const ConnectedAddFeedView = connect(state => state, {
    onSubmit: addFeed,
    onSetLayout: setLayout,
})(AddFeedView);
