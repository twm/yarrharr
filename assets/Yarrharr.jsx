var React = require('react');

require('./toolbar.css');
var Toolbar = React.createClass({
    handleFilterClick(filter) {
        this.props.controller.setState({filter: filter});
    },
    render() {
        return (
            <div className="toolbar">
                {this.props.feedList.length} Feeds
                <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "new")}>New</span>
                <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "saved")}>Saved</span>
                <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "read")}>Read</span>
                <span tabIndex="0" onClick={this.handleFilterClick.bind(this, "all")}>All</span>
            </div>
        );
    },
});

require('./feed-list.css');
var FeedList = React.createClass({
    handleFeedClick(feed) {
        console.log('feed click %o', feed);
        this.props.controller.setState({
            feeds: [feed.id],
        });
    },
    render() {
        var feedItems = [];
        for (var i = 0; i < this.props.feedList.length; i++) {
            var feed = this.props.feedList[i];
            feedItems.push(
                <div key={feed.id} className="feed" tabIndex="0"
                        onClick={this.handleFeedClick.bind(this, feed)}>
                    {feed.text || feed.title}
                </div>
            );
        }
        return (
            <div className="feed-list">
                {feedItems}
            </div>
        );
    },
});

require("./article-list.css");
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
            filter: 'saved',  // 'all', 'new', 'read', 'saved'
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
                <Toolbar controller={this} feedList={this.props.feedList} articles={articles} {...this.state} />
                <ArticleList articles={articles} />
                <FeedList controller={this} feedList={this.props.feedList} />
            </div>
        );
    }
});

module.exports = Yarrharr;
