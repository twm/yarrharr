import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Add, EditIcon, Remove, Logo, Heart } from 'widgets/icons.js';
import Header from 'widgets/Header.js';
import { GlobalBar } from 'widgets/GlobalBar.js';
import { Label, LabelSelector } from 'widgets/Label.js';
import { AddFeedLink, FeedLink, InventoryLink, InventoryFeedLink, LabelLink, RootLink } from 'widgets/links.js';
import { FILTER_UNREAD, FILTER_FAVE } from 'actions.js';
import { addFeed, updateFeed, removeFeed } from 'actions.js';
import { addLabel, attachLabel, detachLabel } from 'actions.js';
import { sortedLabels } from 'views/RootView.js';
import { feedsByTitle, labelsByTitle } from 'sorting.js';
import './InventoryView.less';

const __debug__ = process.env.NODE_ENV !== 'production';


function Centered(props) {
    return <div className="inventory">
        <div className="inventory-inner">
            {props.children}
        </div>
    </div>;
}


export class InventoryView extends React.PureComponent {
    constructor(props) {
        super(props);
    }
    render() {
        // XXX This ordering may change when the feed title is overridden,
        // causing the current object of focus to jump around on the page.
        const feedList = feedsByTitle(this.props);
        const labelList = labelsByTitle(this.props);
        return <div className="inventory-view">
            <GlobalBar>
                <div className="bar-inset">
                    <h1>Manage Feeds</h1>
                </div>
            </GlobalBar>
            <div className="tabs">
                <div className="tabs-inner">
                    <RootLink>Home</RootLink>
                    <InventoryLink disabled={true}>Manage Feeds</InventoryLink>
                    <AddFeedLink>Add Feed</AddFeedLink>
                </div>
            </div>
            <Centered>
                {this.renderFeeds(feedList, labelList)}
            </Centered>
        </div>;
    }
    renderFeeds(feedList, labelList) {
        if (!feedList.length) {
            return <p>No feeds.  <AddFeedLink>Add one?</AddFeedLink></p>
        }

        // TODO sorting
        // TODO filtering
        return <table className="inventory-table">
            <thead>
                <tr>
                    <th className="col-error"><span title="Error?">⚠️ </span></th>
                    <th className="col-unread">Unread Articles</th>
                    <th className="col-feed">Feed</th>
                    <th className="col-site-url">Site URL</th>
                    <th className="col-updated">Last Updated</th>
                    <th className="col-edit"></th>
                </tr>
            </thead>
            <tbody>
                {feedList.map(feed => <tr key={feed.id}>
                    <td className="col-error">
                        {feed.error ? <span title={feed.error}>⚠️ </span> : ""}
                    </td>
                    <td className="col-unread">
                        {feed.unreadCount}
                    </td>
                    <td className="col-feed">
                        <FeedLink feedId={feed.id} filter={FILTER_UNREAD}>{feed.text || feed.title}
                            {feed.active ? "" : <i title="This feed is not checked for updates"> (inactive)</i>}
                        </FeedLink>
                    </td>
                    <td className="col-site-url">
                        <a target="_blank" rel="noreferrer noopener" href={feed.siteUrl}>{feed.siteUrl}</a>
                    </td>
                    <td className="col-updated">
                        {/* TODO use <time> element, display relative date */}
                        {feed.updated}
                    </td>
                    <td className="col-edit">
                        <InventoryFeedLink className="square" feedId={feed.id} title="Edit Feed">
                            <EditIcon className="icon" aria-label="Edit Feed" />
                        </InventoryFeedLink>
                    </td>
                </tr>)}
            </tbody>
        </table>;
    }
}

class InventoryItem extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            url: null,
            active: null,
            text: null,
        };
        this.handleActiveToggle = event => {
            this.setState({active: event.target.checked});
        };
        this.handleInputChange = event => {
            this.setState({[event.target.name]: event.target.value});
        };
        this.handleSubmit = event => {
            event.preventDefault();
            // TODO loading indicator...
            props.onUpdateFeed(this.props.feed.id, this.current('text'), this.current('url'), this.current('active'));
            // XXX This can cause flashing and extra re-layouts because neither
            // setState nor action dispatch is guaranteed to take place
            // immediately...
            this.setState({
                url: null,
                active: null,
                text: null,
            });
        };
        this.handleClickRemoveFeed = event => {
            event.preventDefault();
            props.onRemoveFeed(this.props.feed.id);
        };
    }
    current(name) {
        if (this.state[name] == null) {
            return this.props.feed[name];
        }
        return this.state[name];
    }
    render() {
        const feed = this.props.feed;
        const state = this.state;
        const labelList = this.props.labelList;
        return <div className="inventory-item-wrap">
            <div className="inventory-item">
                <h2>{feed.text || feed.title || feed.url} {feed.active ? null : <i>(inactive)</i>}</h2>
                <div><a href={feed.siteUrl} target="_blank">{feed.siteUrl}</a></div>
                <div>{feed.labels.length
                    ? feed.labels.map(labelId => {
                        const label = this.props.labelsById[labelId];
                        return <Label key={labelId} feedId={feed.id} label={label} />;
                    })
                    : "No labels"}</div>
                <div><FeedLink feedId={feed.id} filter={FILTER_UNREAD}>{feed.unreadCount} new</FeedLink></div>
                <div><FeedLink feedId={feed.id} filter={FILTER_FAVE}>{feed.faveCount} marked favorite</FeedLink></div>
                <div>Last updated {feed.updated || "never"}</div>
                {feed.error ? <div style={{whiteSpace: 'pre-wrap'}}><strong>Error:</strong> {feed.error}</div> : null}
                <LabelSelector feed={feed} labelList={labelList}
                    onAddLabel={this.props.onAddLabel}
                    onAttachLabel={this.props.onAttachLabel}
                    onDetachLabel={this.props.onDetachLabel} />
                <form onSubmit={this.handleSubmit}>
                    <p>
                        <label>Title Override</label>
                        <input type="text" name="text" value={this.current('text')} placeholder={feed.title} onChange={this.handleInputChange} />
                    </p>
                    <p>
                        <label>Feed URL (<a href={this.current('url')} target="_blank">link</a>)</label>
                        <input type="url" name="url" value={this.current('url')} onChange={this.handleInputChange} />
                    </p>
                    <p>
                        <label><input type="checkbox" name="active" checked={this.current('active')} onChange={this.handleActiveToggle} /> Check this feed for updates</label>
                    </p>
                    <div className="tools">
                        <a className="remove-button text-button" role="button" href="#" onClick={this.handleClickRemoveFeed}>Remove Feed</a>
                        <input type="submit" value="Save" />
                    </div>
                </form>
            </div>
        </div>;
    }
}

if (__debug__) {
    InventoryView.propTypes = {
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
    };

    InventoryItem.propTypes = {
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            error: PropTypes.string,
        }).isRequired,
        onUpdateFeed: PropTypes.func.isRequired,
        onRemoveFeed: PropTypes.func.isRequired,
        onAttachLabel: PropTypes.func.isRequired,
        onAddLabel: PropTypes.func.isRequired,
    };
}

export const ConnectedInventoryView = connect(state => state)(InventoryView);


export class ManageFeedView extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleRemoveFeed = this.handleRemoveFeed.bind(this);
    }
    render() {
        const feed = this.props.feedsById[this.props.params.feedId];
        const labelList = labelsByTitle(this.props);
        return <div className="inventory-view">
            <GlobalBar />
            <div className="tabs">
                <div className="tabs-inner">
                    <RootLink>Home</RootLink>
                    <InventoryLink>Manage Feeds</InventoryLink>
                    <AddFeedLink>Add Feed</AddFeedLink>
                </div>
            </div>
            <Centered>
                <InventoryItem
                    key={feed.id}
                    feed={feed}
                    labelList={labelList}
                    labelsById={this.props.labelsById}
                    onAddLabel={this.props.onAddLabel}
                    onAttachLabel={this.props.onAttachLabel}
                    onDetachLabel={this.props.onDetachLabel}
                    onUpdateFeed={this.props.onUpdateFeed}
                    onRemoveFeed={this.handleRemoveFeed}
                />
            </Centered>
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

if (__debug__) {
    ManageFeedView.propTypes = {
        params: PropTypes.shape({
            feedId: PropTypes.number.isRequired,
        }).isRequired,
        onUpdateFeed: PropTypes.func.isRequired,
        onRemoveFeed: PropTypes.func.isRequired,
        onAddLabel: PropTypes.func.isRequired,
    };
}

export const ConnectedManageFeedView = connect(state => state, {
    onAttachLabel: attachLabel,
    onAddLabel: addLabel,
    onDetachLabel: detachLabel,
    onUpdateFeed: updateFeed,
    onRemoveFeed: removeFeed,
})(ManageFeedView);


export class ManageLabelView extends React.PureComponent {
    render() {
        return <p>TODO: manage label {this.props.params.labelId}</p>
    }
}

if (__debug__) {
    ManageLabelView.propTypes = {
        params: PropTypes.shape({
            labelId: PropTypes.number.isRequired,
        }).isRequired,
    };
}

export const ConnectedManageLabelView = connect(state => state, {
    onAttachLabel: attachLabel,
    onAddLabel: addLabel,
    onDetachLabel: detachLabel,
})(ManageLabelView);


export class AddFeedView extends React.PureComponent {
    render() {
        return <div className="add-feed-view">
            <GlobalBar layout={this.props.layout} onSetLayout={this.props.onSetLayout}>
                <div className="bar-inset">
                    <h1>Add Feed</h1>
                </div>
            </GlobalBar>
            <div className="tabs">
                <div className="tabs-inner">
                    <RootLink>Home</RootLink>
                    <InventoryLink>Manage Feeds</InventoryLink>
                    <AddFeedLink disabled={true}>Add Feed</AddFeedLink>
                </div>
            </div>
            <Centered>
                <h1>Add Feed</h1>
                <p>Enter the URL of an Atom or RSS feed:</p>
                <AddFeedForm className="add-feed-form" onSubmit={this.props.onSubmit} defaultUrl={this.props.defaultUrl} />
                {this.renderAdd()}
            </Centered>
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
                <p>Added feed <FeedLink feedId={feedId} filter={FILTER_UNREAD}>{url}</FeedLink></p>
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

class AddFeedForm extends React.PureComponent {
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
        return <form className="add-feed-form" onSubmit={this.handleSubmit}>
            <input type="url" name="url" defaultValue={this.props.defaultUrl} value={this.state.url} onChange={this.handleUrlChange} />
            <input type="submit" value="Add" />
        </form>;
    }
}

AddFeedForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
    defaultUrl: PropTypes.string,
};

export const ConnectedAddFeedView = connect(state => state, {
    onSubmit: addFeed,
})(AddFeedView);
