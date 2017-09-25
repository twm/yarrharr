import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Add, Remove, Logo, Heart } from 'widgets/icons.js';
import Header from 'widgets/Header.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { Label, AttachLabelButton, LabelPicker } from 'widgets/Label.js';
import { AddFeedLink, FeedLink, LabelLink, RootLink } from 'widgets/links.js';
import { FILTER_NEW, FILTER_SAVED } from 'actions.js';
import { setLayout, LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { addFeed, markFeedActive, removeFeed, addLabel, attachLabel, detachLabel } from 'actions.js';
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
            <div className="inventory-header">
                <div className="inventory-header-inner">
                    <h1>Manage Feeds</h1>
                    <p>{feedList.length === 1 ? "1 feed" : feedList.length + " feeds"}</p>
                </div>
            </div>
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
            {feedList.map(feed => <InventoryItem
                key={feed.id}
                feed={feed}
                labelList={labelList}
                labelsById={this.props.labelsById}
                onAddLabel={this.props.onAddLabel}
                onAttachLabel={this.props.onAttachLabel}
                onDetachLabel={this.props.onDetachLabel}
                onMarkFeedActive={this.props.onMarkFeedActive}
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

class InventoryItem extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleActiveToggle = event => {
            props.onMarkFeedActive(this.props.feed.id, !this.props.feed.active);
        };
        this.handleClickRemoveFeed = event => {
            event.preventDefault();
            props.onRemoveFeed(this.props.feed.id);
        };
    }
    render() {
        const feed = this.props.feed;
        const labelList = this.props.labelList;
        return <div className="inventory-item-wrap">
            <div className="inventory-item">
                <h2>{feed.text || feed.title || feed.url} {feed.active ? null : <i>(inactive)</i>}</h2>
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
                <div><a href={feed.url} target="_blank">{feed.url}</a></div>
                <div><FeedLink feedId={feed.id} filter={FILTER_NEW}>{feed.newCount} new</FeedLink></div>
                <div><FeedLink feedId={feed.id} filter={FILTER_SAVED}>{feed.faveCount} marked favorite</FeedLink></div>
                <div>Last updated {feed.updated || "never"}</div>
                {feed.error ? <div style={{whiteSpace: 'pre-wrap'}}><strong>Error:</strong> {feed.error}</div> : null}
                <div className="tools">
                    <label><input type="checkbox" checked={feed.active} onChange={this.handleActiveToggle} /> Check this feed for updates</label>
                    <a className="remove-button text-button" role="button" href="#" onClick={this.handleClickRemoveFeed}>Remove Feed</a>
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
        onMarkFeedActive: PropTypes.func.isRequired,
        onRemoveFeed: PropTypes.func.isRequired,
        onSetLayout: PropTypes.func.isRequired,
        onAddLabel: PropTypes.func.isRequired,
    };

    InventoryItem.propTypes = {
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            error: PropTypes.string,
        }).isRequired,
        onMarkFeedActive: PropTypes.func.isRequired,
        onRemoveFeed: PropTypes.func.isRequired,
        onAttachLabel: PropTypes.func.isRequired,
        onAddLabel: PropTypes.func.isRequired,
    };
}

export const ConnectedInventoryView = connect(state => state, {
    onAttachLabel: attachLabel,
    onAddLabel: addLabel,
    onDetachLabel: detachLabel,
    onMarkFeedActive: markFeedActive,
    onRemoveFeed: removeFeed,
    onSetLayout: setLayout,
})(InventoryView);

export class AddFeedView extends React.PureComponent {
    render() {
        return <div className={"add-feed-view layout-" + this.props.layout}>
            <GlobalBar layout={this.props.layout} onSetLayout={this.props.onSetLayout} />
            <div className="add-feed">
                <div className="add-feed-inner">
                    <h1>Add Feed</h1>
                    <p>Enter the URL of an Atom or RSS feed:</p>
                    <UrlForm onSubmit={this.props.onSubmit} defaultUrl={this.props.defaultUrl} />
                    {this.renderAdd()}
                </div>
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
