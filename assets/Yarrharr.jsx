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
                    <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "new")}>New</span>
                    <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "saved")}>Saved</span>
                    <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "read")}>Read</span>
                    <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "all")}>All</span>
                </div>
                <h2>Sort</h2>
                <div className="group">
                    <span tabIndex="0" onClick={this.handleOrderClick.bind(this, "date")}>Oldest first</span>
                    <span tabIndex="0" onClick={this.handleOrderClick.bind(this, "tail")}>Latest first</span>
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
        return <div className="drop-button" tabIndex="0" onClick={this.handleClick}>
            <div className="trigger">{this.props.text}</div>
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

var Article = React.createClass({
    render() {
        return (
            <article>
                <h1><a href={this.props.url}>{this.props.title}</a></h1>
                <p>{this.props.author}</p>
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

    render() {
        var articles = this.getArticles();
        return (
            <div id="yarrharr">
                <Toolbar>
                    <DropButton text="Feeds">
                        <FeedPicker controller={this} feedList={this.props.feedList} />
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
