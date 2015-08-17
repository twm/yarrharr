'use strict';
var React = require('react');
require('./base.less');

require('./toolbar.less');
var Toolbar = React.createClass({
    render() {
        return <div className="toolbar">{this.props.children}</div>;
    },
});

require("./view-picker.less");
var ViewPicker = React.createClass({
    handleFilterClick(filter) {
        this.props.controller.setSnapshotParams({filter});
    },
    handleOrderClick(order) {
        this.props.controller.setSnapshotParams({order});
    },
    handleViewClick(view) {
        this.props.controller.setSnapshotParams({view});
    },
    render() {
        return (
            <span className="view-picker">
                <h2>View</h2>
                <div className="group">
                    <button onClick={this.handleViewClick.bind(this, "list")}>List</button>
                    <button onClick={this.handleViewClick.bind(this, "text")}>Full Text</button>
                </div>
                <h2>Filter</h2>
                <div className="group">
                    <button onClick={this.handleFilterClick.bind(this, "new")}>New</button>
                    <button onClick={this.handleFilterClick.bind(this, "saved")}>Saved</button>
                    <button onClick={this.handleFilterClick.bind(this, "read")}>Read</button>
                    <button onClick={this.handleFilterClick.bind(this, "all")}>All</button>
                </div>
                <h2>Sort</h2>
                <div className="group">
                    <button onClick={this.handleOrderClick.bind(this, "date")}>Oldest first</button>
                    <button onClick={this.handleOrderClick.bind(this, "tail")}>Latest first</button>
                </div>
            </span>
        );
    },
});

require("./drop-button.less");
var DropButton = React.createClass({
    getInitialState() {
        return {open: false};
    },
    handleClick() {
        this.setState({open: !this.state.open});
    },
    render() {
        var drop = this.state.open ? <div className="card">{this.props.children}</div> : null;
        return <div className="drop-button" onClick={this.handleClick}>
            <button className="trigger">{this.props.text}</button>
            {drop}
        </div>;
    }
});

require('./feed-picker.less');
var FeedPicker = React.createClass({
    handleFeedClick(feed) {
        this.props.controller.setSnapshotParams({
            feeds: [feed.id],
        });
    },
    render() {
        // TODO: Filtering for keyboard, alphabetical jumps for touch
        return <div className="feed-picker">
            {this.props.feedList.map((feed) =>
                <li key={feed.id} tabIndex="0"
                        onClick={this.handleFeedClick.bind(this, feed)}>
                    <img src={feed.iconUrl} alt="" width="16" height="16" />
                    {feed.text || feed.title}
                </li>
            )}
        </div>;
    }
});

require("./article.less");
var Article = React.createClass({
    render() {
        return (
            <article>
                <h1><a href={this.props.url}>{this.props.title}</a></h1>
                {this.props.author
                    ? <p className="meta">By {this.props.author} from {this.props.feed.text || this.props.feed.title}</p>
                    : <p className="meta">From {this.props.feed.text || this.props.feed.title}</p>}
                <p className="meta">Posted {this.props.date}</p>
                <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}} />
            </article>
        );
    }
});

require("./list-article.less");
var ListArticle = React.createClass({
    handleClick(event) {
    },
    render() {
        if (this.props.loading) {
            return <div className="list-article loading"></div>;
        }
        var className = this.props.focused ? "list-article focused" : "list-article";
        return <div className={className}>
            <span className="icon">
                <img src={this.props.iconUrl} alt="*" width="16" height="16" />
            </span>
            <span className="meta">
                <span className="feed">{this.props.feed.text || this.props.feed.title}</span>
                <time dateTime={this.props.date}>{this.props.date}</time>
            </span>
            <a className="title" href={this.props.url} target="_blank">{this.props.title}</a>
        </div>
    }
});


var Yarrharr = React.createClass({
    setSnapshotParams(params) {
        var p = Object.assign({}, this.props.snapshotParams, params);
        var query = p.feeds.map((id) => "feeds=" + id);
        query.push('filter=' + p.filter);
        query.push('order=' + p.order);
        query.push('view=' + p.view);
        window.location.search = query.join('&');
    },
    /**
     * Compute a sorted list of available feeds.
     */
    getFeedList() {
        var feedList = Object.keys(this.props.feedsById).map((feedId) => this.props.feedsById[feedId]);
        feedList.sort((a, b) => {
            // TODO: Investigate Intl.Collator and friends to make this more correct.
            var titleA = (a.text || a.title).toLowerCase();
            var titleB = (b.text || b.title).toLowerCase();
            return (titleA < titleB) ? -1 :
                   (titleA > titleB) ? 1 :
                   b.id - a.id;
        })
        return feedList;
    },

    render() {
        for (var id in this.props.articlesById) {
            // XXX: Mutating props is a dirty hack; need a real data model.
            var article = this.props.articlesById[id];
            article.feed = this.props.feedsById[article.feedId];
        }

        return (
            <div id="yarrharr">
                <Toolbar>
                    <DropButton text="Feeds">
                        <FeedPicker controller={this} feedList={this.getFeedList()} />
                    </DropButton>
                    <DropButton text="View">
                        <ViewPicker controller={this} {...this.props.snapshotParams} />
                    </DropButton>
                </Toolbar>
                {this.props.snapshotParams.view === 'text' ?
                    <div className="full-text-view">
                        {this.props.snapshot.map((id) => {
                            var article = this.props.articlesById[id];
                            if (article) {
                                return <Article key={id} {...article} />
                            } else {
                                return <div key={id}>Loading {id}...</div>;
                            }
                        })}
                    </div>
                : this.props.snapshotParams.view === 'list' ?
                    <div className="article-list">
                        {this.props.snapshot.map((id) => {
                            var article = this.props.articlesById[id];
                            if (article) {
                                return <ListArticle key={id} {...article} />;
                            } else {
                                return <ListArticle key={id} loading={true} />;
                            }
                        })}
                    </div>
                : <div>Invalid view: {this.props.snapshotParams.view}</div>
                }
            </div>
        );
    }
});

module.exports = Yarrharr;
