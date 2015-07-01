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
        this.props.controller.setState({filter});
    },
    handleOrderClick(order) {
        this.props.controller.setState({order});
    },
    handleViewClick(view) {
        this.props.controller.setState({view});
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
        this.props.controller.setState({
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
    render() {
        return <div className="list-article">
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
    getInitialState() {
        // For now we will just use state on this top-level component for the
        // overall state of the UI.  Eventually this stuff should move to the
        // URL.
        return {
            // XXX: Temp hack: start with all feeds selected.
            feeds: Object.keys(this.props.articlesByFeed), // Set of feeds to display.
            filter: 'new',  // 'all', 'new', 'read', 'saved'
            order: 'date', // 'date', 'tail' (maybe 'group' someday?)
            view: 'list', // 'list', 'text', someday 'gallery'
        };
    },

    /**
     * Compute the list of articles to display based on the current state.
     */
    getArticles() {
        var articles = [];
        this.state.feeds.forEach((feedId) => {
            this.props.articlesByFeed[feedId].forEach((article) => {
                // FIXME: This is a hack and shouldn't go here.  Need a real data model...
                article.feed = this.props.feedsById[feedId];

                if (this.state.filter === 'all' || this.state.filter === article.state) {
                    articles.push(article);
                }
            });
        });
        articles.sort((a, b) => {
            var order = (a.date < b.date) ? -1 :
                        (a.date > b.date) ? 1 :
                        b.id - a.id;
            return this.state.order === 'date' ? order : order * -1;
        });
        return articles;
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
        var articles = this.getArticles();
        return (
            <div id="yarrharr">
                <Toolbar>
                    <DropButton text="Feeds">
                        <FeedPicker controller={this} feedList={this.getFeedList()} />
                    </DropButton>
                    <DropButton text="View">
                        <ViewPicker controller={this} {...this.state} />
                    </DropButton>
                </Toolbar>
                {this.state.view === 'text' ?
                    <div className="full-text-view">
                        {this.getArticles().map((article) => <Article key={article.id} {...article} />)}
                    </div>
                : this.state.view === 'list' ?
                    <div className="article-list">
                        {this.getArticles().map((article) => <ListArticle key={article.id} {...article} />)}
                    </div>
                : <div>Invalid view: {this.state.view}</div>
                }
            </div>
        );
    }
});

module.exports = Yarrharr;
