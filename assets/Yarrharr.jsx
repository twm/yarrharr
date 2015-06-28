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
    render() {
        return (
            <span className="view-picker">
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

require("./article-list.less");
var ArticleList = React.createClass({
    render() {
        var articles = [];
        this.props.articles.forEach((article) => {
            articles.push(<Article key={article.id} {...article} />);
        });
        return <div className="article-list">{articles}</div>;
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
                <ArticleList articles={articles} />
            </div>
        );
    }
});

module.exports = Yarrharr;
