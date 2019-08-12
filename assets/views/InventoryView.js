import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { Title } from 'widgets/Title.jsm';
import { Add, EditIcon, FeedIcon, LabelIcon, Remove } from 'widgets/icons.js';
import { Tabs } from 'widgets/Tabs.js';
import { RelativeTime } from 'widgets/time.jsm';
import { GlobalBar, Header, HomeIconLink } from 'widgets/GlobalBar.js';
import { Label } from 'widgets/Label.js';
import { Count } from 'widgets/Count.js';
import { AddFeedLink, FeedLink, FeedListLink, FeedDetailLink, LabelDetailLink, LabelLink, LabelListLink } from 'widgets/links.js';
import { FILTER_UNREAD, FILTER_FAVE, FILTER_ALL } from 'actions.js';
import { addFeed, updateFeed, removeFeed } from 'actions.js';
import { addLabel, updateLabel, removeLabel } from 'actions.js';
import { sortedLabels } from 'views/HomeView.js';
import { feedsByTitle, labelsByTitle } from 'sorting.js';
import './InventoryView.less';



function Centered(props) {
    return <div className="inventory">
        {props.children}
    </div>;
}


export class FeedListView extends React.PureComponent {
    render() {
        const feedList = feedsByTitle(this.props);
        const labelList = labelsByTitle(this.props);
        return <React.Fragment>
            <Title title="Feeds" />
            <GlobalBar>
                <HomeIconLink />
                <Tabs>
                    <FeedListLink aria-selected={true} className="no-underline">Feeds</FeedListLink>
                    <LabelListLink aria-selected={false} className="no-underline">Labels</LabelListLink>
                    <AddFeedLink aria-selected={false} className="no-underline">Add Feed</AddFeedLink>
                </Tabs>
            </GlobalBar>
            {this.renderHeader()}
            {this.renderFeeds(feedList, labelList)}
        </React.Fragment>;
    }
    renderHeader() {
        return <div className="label-header">
            <h1>Feeds</h1>
            <div>
                <AddFeedLink className="text-button text-button-primary no-underline">Add Feed</AddFeedLink>
            </div>
        </div>
    }
    renderFeeds(feedList, labelList) {
        if (!feedList.length) {
            return <p>No feeds.  <AddFeedLink>Add one?</AddFeedLink></p>
        }

        // TODO sorting
        // TODO filtering
        return <table className="feed-list">
            <thead>
                <tr className="feed-list-item feed-list-item-header">
                    <th className="col-feed">Feed</th>
                    <th className="col-unread">Unread</th>
                    <th className="col-fave">Favorite</th>
                    <th className="col-site-url">Site URL</th>
                    <th className="col-updated">Last Updated</th>
                    <th className="col-edit"></th>
                </tr>
            </thead>
            <tbody>
                {feedList.map(feed => <tr className="feed-list-item" key={feed.id}>
                    <td className="col-feed">
                        <FeedLink feedId={feed.id} filter={FILTER_UNREAD}>
                            {feed.text || feed.title}
                        </FeedLink>
                        {feed.active ? "" : <i title="This feed is not checked for updates">&nbsp;(inactive)</i>}
                    </td>
                    <td className="col-unread">{feed.unreadCount}</td>
                    <td className="col-fave">{feed.faveCount}</td>
                    <td className="col-site-url">
                        <a target="_blank" rel="noreferrer noopener" href={feed.siteUrl}>{feed.siteUrl}</a>
                    </td>
                    <td className="col-updated">
                        {feed.error ? <span title={feed.error}>⚠️&nbsp;</span> : ""}
                        {feed.updated ? <RelativeTime then={feed.updated} /> : "never"}
                    </td>
                    <td className="col-edit">
                        <FeedDetailLink feedId={feed.id} title="Edit Feed">
                            <EditIcon aria-label="Edit Feed" />
                        </FeedDetailLink>
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
            url: props.feed.url,
            active: props.feed.active,
            text: props.feed.text,
            labels: props.feed.labels,
        };
        this.handleActiveToggle = event => {
            this.setState({active: event.target.checked});
        };
        this.handleInputChange = event => {
            this.setState({[event.target.name]: event.target.value});
        };
        this.handleLabelsChange = event => {
            this.setState({labels: Array.filter(event.target.options, o => o.selected).map(o => Number(o.value))});
        };
        this.handleSubmit = event => {
            event.preventDefault();
            // TODO Validation
            // TODO loading indicator...
            props.onUpdateFeed(this.props.feed.id, this.state.text, this.state.url, this.state.active, this.state.labels);
        };
        this.handleClickRemove = event => {
            event.preventDefault();
            props.onRemoveFeed(this.props.feed.id);
        };
    }
    render() {
        const feed = this.props.feed;
        const state = this.state;
        const labelList = this.props.labelList;
        return <Fragment>
            <div>Site URL: <a href={feed.siteUrl} target="_blank">{feed.siteUrl}</a></div>
            <div>Last checked {feed.checked ? <RelativeTime then={feed.checked} /> : "never"}</div>
            <div>Last updated {feed.updated ? <RelativeTime then={feed.updated} /> : "never"}</div>
            {feed.error ? <div className="feed-error"><strong>Error:</strong> {feed.error}</div> : null}
            <form onSubmit={this.handleSubmit}>
                <p>
                    <label htmlFor="id_text">Title Override</label>
                    <input id="id_text" type="text" name="text" value={this.state.text} placeholder={feed.title} onChange={this.handleInputChange} />
                </p>
                <p>
                    <label htmlFor="id_url">
                        Feed URL
                        {(/^https?:\/\//i.test(this.state.url))
                            ? <Fragment> (<a href={this.state.url} target="_blank">link</a>)</Fragment>
                            : null}
                    </label>
                    <input id="id_url" type="url" name="url" value={this.state.url} onChange={this.handleInputChange} />
                </p>
                <p>
                    <label className="checkbox"><input type="checkbox" name="active" checked={this.state.active} onChange={this.handleActiveToggle} /> Check this feed for updates</label>
                </p>
                <p>
                    <label htmlFor="id_labels">Labels</label>
                    <select id="id_labels" name="labels" multiple={true} value={this.state.labels} onChange={this.handleLabelsChange} size={labelList.length}>
                        {labelList.map(label => <option key={label.id} value={label.id}>{label.text}</option>)}
                    </select>
                </p>
                <div className="inventory-tools">
                    <input className="remove-button text-button text-button-danger" type="button" value="Remove" onClick={this.handleClickRemove} />
                    <input className="text-button text-button-primary" type="submit" value="Save" />
                </div>
            </form>
        </Fragment>;
    }
}

if (__debug__) {
    FeedListView.propTypes = {
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
    };
}

export const ConnectedFeedListView = connect(state => state)(FeedListView);

export class LabelListView extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleAddLabel = this.handleAddLabel.bind(this);
    }
    render() {
        const labelList = labelsByTitle(this.props);
        const feedList = feedsByTitle(this.props);
        return <React.Fragment>
            <Title title="Labels" />
            <GlobalBar>
                <HomeIconLink />
                <Tabs>
                    <FeedListLink aria-selected={false} className="no-underline">Feeds</FeedListLink>
                    <LabelListLink aria-selected={true} className="no-underline">Labels</LabelListLink>
                    <AddFeedLink aria-selected={false} className="no-underline">Add Feed</AddFeedLink>
                </Tabs>
            </GlobalBar>
            {this.renderLabelHeader()}
            {this.renderLabels(labelList, feedList)}
        </React.Fragment>;
    }
    handleAddLabel(event) {
        var title = prompt("Label title:");
        if (title) {
            // FIXME: Handle failure (e.g. due to duplicate name)
            this.props.onAddLabel(title);
        }
    }
    renderLabelHeader() {
        return <div className="label-header">
            <h1>Labels</h1>
            <div>
                <button className="text-button text-button-primary" onClick={this.handleAddLabel}>Add Label</button>
            </div>
        </div>
    }
    renderLabels(labelList, feedList) {
        if (!labelList.length) {
            return <p>No labels.</p>;
        }

        // TODO sorting
        // TODO filtering
        return <table className="label-list">
            <thead>
                <tr className="label-list-item label-list-item-header">
                    <th></th>
                    <th>Label</th>
                    <th>Feeds</th>
                    <th>Unread</th>
                    <th>Favorite</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
            {labelList.map(label => <tr className="label-list-item" key={label.id}>
                <td><LabelIcon aria-hidden /></td>
                <td>{label.text}</td>
                <td>{feedList.filter(feed => feed.labels.indexOf(label.id) !== -1).length}</td>
                <td><LabelLink labelId={label.id} filter={FILTER_UNREAD}>{label.unreadCount}</LabelLink></td>
                <td><LabelLink labelId={label.id} filter={FILTER_FAVE}>{label.faveCount}</LabelLink></td>
                <td>
                    <LabelDetailLink labelId={label.id} title="Edit Label">
                        <EditIcon aria-label="Edit Label" />
                    </LabelDetailLink>
                </td>
            </tr>)}
            </tbody>
        </table>;
    }
}

if (__debug__) {
    LabelListView.propTypes = {
        labelsById: PropTypes.object.isRequired,
        feedsById: PropTypes.object.isRequired,
        onAddLabel: PropTypes.func.isRequired,
    };
}

export const ConnectedLabelListView = connect(state => state, {
    onAddLabel: addLabel,
})(LabelListView);

export class ManageFeedView extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleRemoveFeed = this.handleRemoveFeed.bind(this);
    }
    render() {
        const feedId = this.props.params.feedId;
        const feed = this.props.feedsById[feedId];
        const feedTitle = feed.text || feed.title;
        const labelList = labelsByTitle(this.props);
        return <React.Fragment>
            <Title title={"Edit " + feedTitle} />
            <GlobalBar>
                <HomeIconLink />
                <div className="square">
                    <FeedIcon aria-hidden={true} />
                </div>
                <Header>{feedTitle}</Header>
            </GlobalBar>
            <Tabs>
                <FeedLink aria-selected={false} feedId={feedId} filter={FILTER_UNREAD} className="no-underline">Unread <Count value={feed.unreadCount} /></FeedLink>
                <FeedLink aria-selected={false} feedId={feedId} filter={FILTER_FAVE} className="no-underline">Favorite <Count value={feed.faveCount} /></FeedLink>
                <FeedLink aria-selected={false} feedId={feedId} filter={FILTER_ALL} className="no-underline">All</FeedLink>
                <FeedDetailLink aria-selected={true} feedId={feedId} title="Edit Feed" className="no-underline">
                    <EditIcon aria-label="Edit Feed" />
                </FeedDetailLink>
            </Tabs>
            <Centered>
                <InventoryItem
                    key={feed.id}
                    feed={feed}
                    labelList={labelList}
                    labelsById={this.props.labelsById}
                    onUpdateFeed={this.props.onUpdateFeed}
                    onRemoveFeed={this.handleRemoveFeed}
                />
            </Centered>
        </React.Fragment>;
    }
    handleRemoveFeed(feedId) {
        const feed = this.props.feedsById[feedId];
        if (!feed) return;
        if (confirm("Remove feed " + (feed.text || feed.title) + " and associated articles?")) {
            this.props.onRemoveFeed(feedId);
            // FIXME This should have a progress indicator
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
    };
}

export const ConnectedManageFeedView = connect(state => state, {
    onUpdateFeed: updateFeed,
    onRemoveFeed: removeFeed,
})(ManageFeedView);


export class ManageLabelView extends React.Component {
    constructor(props) {
        super(props);
        this.handleUpdateLabel = this.handleUpdateLabel.bind(this);
        this.handleRemoveLabel = this.handleRemoveLabel.bind(this);
    }
    render() {
        const labelId = this.props.params.labelId;
        const label = this.props.labelsById[labelId];
        const feedList = feedsByTitle(this.props);
        return <React.Fragment>
            <GlobalBar>
                <HomeIconLink />
                <div className="square">
                    <LabelIcon aria-hidden={true} />
                </div>
                <Header>{label.text}</Header>
            </GlobalBar>
            <Title title={"Edit Label " + label.text} />
            <Tabs>
                <LabelLink aria-selected={false} labelId={labelId} filter={FILTER_UNREAD} className="no-underline">Unread <Count value={label.unreadCount} /></LabelLink>
                <LabelLink aria-selected={false} labelId={labelId} filter={FILTER_FAVE} className="no-underline">Favorite <Count value={label.faveCount} /></LabelLink>
                <LabelLink aria-selected={false} labelId={labelId} filter={FILTER_ALL} className="no-underline">All</LabelLink>
                <LabelDetailLink aria-selected={true} labelId={labelId} title="Edit Label" className="no-underline">
                    <EditIcon aria-label="Edit Label" />
                </LabelDetailLink>
            </Tabs>
            <Centered>
                <LabelForm label={label} feedList={feedList}
                    onUpdateLabel={this.handleUpdateLabel}
                    onRemoveLabel={this.handleRemoveLabel}
                    />
            </Centered>
        </React.Fragment>;
    }
    handleUpdateLabel(labelId, text, feeds) {
        // TODO: Progress indication, etc.
        this.props.onUpdateLabel(labelId, text, feeds);
    }
    handleRemoveLabel(labelId) {
        const label = this.props.labelsById[labelId];
        if (!label) return;
        if (confirm("Remove label " + label.text + "?")) {
            this.props.onRemoveLabel(labelId);
            // FIXME This should have a progress indicator
        }
    }
}

if (__debug__) {
    ManageLabelView.propTypes = {
        params: PropTypes.shape({
            labelId: PropTypes.number.isRequired,
        }).isRequired,
        onUpdateLabel: PropTypes.func.isRequired,
        onRemoveLabel: PropTypes.func.isRequired,
    };
}

export const ConnectedManageLabelView = connect(state => state, {
    onUpdateLabel: updateLabel,
    onRemoveLabel: removeLabel,
})(ManageLabelView);


class LabelForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            text: props.label.text,
            feeds: props.label.feeds,
        };
        this.handleInputChange = event => {
            this.setState({[event.target.name]: event.target.value});
        };
        this.handleFeedsChange = event => {
            this.setState({feeds: Array.filter(event.target.options, o => o.selected).map(o => Number(o.value))});
        };
        this.handleSubmit = event => {
            event.preventDefault();
            this.props.onUpdateLabel(this.props.label.id, this.state.text, this.state.feeds);
        };
        this.handleClickRemove = event => {
            event.preventDefault();
            this.props.onRemoveLabel(this.props.label.id);
        };
    }
    render() {
        return <form onSubmit={this.handleSubmit}>
            <p>
                <label htmlFor="id_label_text">Title</label>
                <input id="id_label_text" type="text" name="text" value={this.state.text} onChange={this.handleInputChange} />
            </p>
            <p>
                <label htmlFor="id_label_feeds">Feeds</label>
                {/* FIXME The UX here is terrible when there are many feeds.  This should probably be a list of the current feeds and a combo box which allows addition of more via search. */}
                <select id="id_label_feeds" name="feeds" multiple={true} value={this.state.feeds} onChange={this.handleFeedsChange} size={this.props.feedList.length}>
                    {this.props.feedList.map(feed => <option key={feed.id} value={feed.id}>{feed.text || feed.title}</option>)}
                </select>
            </p>
            <div className="inventory-tools">
                <input className="remove-button text-button text-button-danger" type="button" value="Remove" onClick={this.handleClickRemove} />
                <input className="text-button text-button-primary" type="submit" value="Save" />
            </div>
        </form>
    }
}

if (__debug__) {
    LabelForm.propTypes = {
        label: PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string.isRequired,
            feeds: PropTypes.arrayOf(PropTypes.number.isRequired).isRequired,
        }).isRequired,
        feedList: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string,
            title: PropTypes.string,
            url: PropTypes.string.isRequired,
        }).isRequired).isRequired,
        onUpdateLabel: PropTypes.func.isRequired,
        onRemoveLabel: PropTypes.func.isRequired,
    };
}


export class AddFeedView extends React.Component {
    constructor(props) {
        super(props);
        this.state = {url: ''};
    }
    render() {
        return <Fragment>
            <GlobalBar>
                <HomeIconLink />
                <Tabs>
                    <FeedListLink aria-selected={false} className="no-underline">Feeds</FeedListLink>
                    <LabelListLink aria-selected={false} className="no-underline">Labels</LabelListLink>
                    <AddFeedLink aria-selected={true} className="no-underline">Add Feed</AddFeedLink>
                </Tabs>
            </GlobalBar>
            <Title title="Add Feed" />
            <Centered>
                <h1>Add Feed</h1>
                <AddFeedForm
                    defaultUrl={this.props.searchParams.get('url') || ''}
                    onAddFeed={this.props.onAddFeed}
                    />
            </Centered>
        </Fragment>;
    }
}

if (__debug__) {
    AddFeedView.propTypes = {
        /**
         * A superficially valid URL has been entered by the user.  Attempt to add
         * it as a feed.
         *
         * @param {string} url Something that looks like a URL.
         */
        onAddFeed: PropTypes.func.isRequired,
        searchParams: PropTypes.object.isRequired,
    };
}

export const ConnectedAddFeedView = connect(state => state, {onAddFeed: addFeed})(AddFeedView);


class AddFeedForm extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            adding: false,
            error: '',
            url: props.defaultUrl,
        };
        this.handleUrlChange = event => {
            this.setState({url: event.target.value});
        };
        this.handleSubmit = event => {
            event.preventDefault();
            if (this.state.adding) {
                return;
            }
            // TODO form validation
            this.setState({
                adding: true,
                error: '',
            });
            this.props.onAddFeed(this.state.url).catch(err => {
                this.setState({
                    adding: false,
                    error: String(err),
                });
            });
        };
    }
    render() {
        return <form onSubmit={this.handleSubmit}>
            <p><label htmlFor="id_add_feed_url">Enter the URL of an Atom or RSS feed</label></p>
            {this.state.adding
                ?  <p>Adding...</p>
                : <p className="add-feed-form">
                    <input
                        id="id_add_feed_url"
                        type="url"
                        name="url"
                        placeholder="https://example.com/"
                        value={this.state.url}
                        onChange={this.handleUrlChange} />
                    <input
                        type="submit"
                        className="text-button text-button-primary"
                        value="Add" />
                </p>}
            {this.state.error ? <p>⚠️  {this.state.error}</p> : null}
        </form>;
    }
}


if (__debug__) {
    AddFeedForm.propTypes = {
        defaultUrl: PropTypes.string.isRequired, // May be empty
        onAddFeed: PropTypes.func.isRequired,
    };
}
