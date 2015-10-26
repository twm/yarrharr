'use strict';
var React = require('react');
require('./base.less');

function assign(target, ...sources) {
    for (var i = 0; i < sources.length; i++) {
        for (var key in sources[i]) {
            target[key] = sources[i][key];
        }
    }
    return target;
}

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
    getInitialState() {
        return {
            // Lazily-loaded articles.
            articlesById: {},
        };
    },

    setSnapshotParams(params) {
        var p = assign({}, this.props.snapshotParams, params);
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

    /**
     * Get a list of the articles available for display right now.  This merges
     * the preloaded articles (from props) and the lazily-loaded articles (from
     * state).
     *
     * Each article is also copied to add in a reference to its feed.
     *
     * This is icky.
     */
    getArticles() {
        const articles = [];
        this.props.snapshot.map((id) => {
            const article = this.props.articlesById[id] || this.state.articlesById[id];
            if (article) {
                articles.push(assign({
                    feed: this.props.feedsById[article.feedId]
                }, article));
            }
        });
        return articles;
    },

    /**
     * This is called when there isn't another viewport's worth of content
     * below the fold.  (It may be called many times.)
     *
     * Load another chunk of articles.
     */
    handleArticleShortage() {
        var count = 0;
        const body = new FormData();
        for (var i = 0; i < this.props.snapshot.length; i++) {
            var id = this.props.snapshot[i];
            if (!this.props.articlesById[id] && !this.state.articlesById[id]) {
                body.append('article', String(id));
                count++;
            }
            if (count >= 10) {
                break;
            }
        }

        if (count <= 0) {
            return; // No more articles available.
        }

        fetch('/articles/', {
            method: 'POST',
            body: body,
            headers: new Headers({
                'X-CSRFToken': document.cookie.match(/csrftoken=([^\s;]+)/)[1],
            }),
            credentials: 'same-origin',
        }).then((response) => {
            if (!response.ok) {
                throw new Error(response);
            }
            return response.json();
        }).then((json) => {
            console.log('new articles loaded', json);
            this.setState({
                articlesById: assign({}, this.state.articlesById, json),
            });
        }).catch((e) => {console.error(e)});
    },

    render() {
        for (var id in this.props.articlesById) {
            // XXX: Mutating props is a dirty hack; need a real data model.
            var article = this.props.articlesById[id];
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
                <ScrollSpy onNearBottom={this.handleArticleShortage}>
                    {this.props.snapshotParams.view === 'text' ?
                        <div className="full-text-view">
                            {this.getArticles().map((article) => {
                                return <Article key={article.id} {...article} />
                            })}
                        </div>
                    : this.props.snapshotParams.view === 'list' ?
                            <div className="article-list">
                                {this.getArticles().map((article) => {
                                    return <ListArticle key={article.id} {...article} />
                                })}
                            </div>
                    : <div>Invalid view: {this.props.snapshotParams.view}</div>
                    }
                </ScrollSpy>
            </div>
        );
    }
});


/**
 * A component which watches the window scroll position and fires an event when
 * it nears the end.  While this monitors the global scroll position, it is
 * useful to install and remove the event listeners as part of the component
 * life cycle.
 *
 * This will fire events as long as there is less than a full viewport's worth
 * of content below the fold.
 */
var ScrollSpy = React.createClass({
    propTypes: {
        onNearBottom: React.PropTypes.func.isRequired,
    },
    componentDidMount() {
        window.addEventListener('scroll', this.handleChange, false);
        window.addEventListener('resize', this.handleChange, false);
        // Immediately schedule a check now that we have rendered.
        this.handleChange();
    },
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleChange, false);
        window.removeEventListener('scroll', this.handleChange, false);
    },
    /**
     * The view has resized or scrolled.  Schedule a check for whether we need
     * to load more items.
     */
    handleChange(event) {
        if (this._scrollTimeout) {
            clearTimeout(this._scrollTimeout);
        }
        this._scrollTimeout = setTimeout(this.checkBufferSize, 50);
    },
    /**
     * Schedule the load of more items once we get near the bottom of the
     * scrollable area.
     */
    checkBufferSize() {
        const viewportHeight = document.documentElement.clientHeight;
        // Only Firefox seems to support window.scrollMaxY, but this generally seems to be equivalent.
        const scrollMaxY = document.body.scrollHeight - viewportHeight;
        const buffer = scrollMaxY - window.scrollY;
        if (buffer < viewportHeight) {
            console.log('scroll near bottom: buffer=%d < viewportHeight=%d', buffer, viewportHeight);
            this.props.onNearBottom();
        }
    },
    render() {
        return <div>{this.props.children}</div>;
    }
});

module.exports = Yarrharr;
