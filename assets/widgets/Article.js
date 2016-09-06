import React from 'react';
import { FeedLink } from "widgets/links.js";
import { STATE_NEW, STATE_SAVED, STATE_ARCHIVED } from 'actions.js';
import { Outbound } from 'widgets/icons.js';
import StateToggle from 'widgets/StateToggle.js';
import "./Article.less";

const Article = React.createClass({
    propTypes: {
        // Data attributes
        id: React.PropTypes.number.isRequired,
        url: React.PropTypes.string.isRequired,
        title: React.PropTypes.string.isRequired,
        author: React.PropTypes.string,
        content: React.PropTypes.string.isRequired,
        date: React.PropTypes.string.isRequired,
        feed: React.PropTypes.shape({
            id: React.PropTypes.number.isRequired,
            text: React.PropTypes.string,
            title: React.PropTypes.string.isRequired,
        }).isRequired,
        state: React.PropTypes.oneOf([STATE_NEW, STATE_SAVED, STATE_ARCHIVED]).isRequired,
        // Non-null indicates that a mark operation is in-progress.
        marking: React.PropTypes.oneOf([null, STATE_NEW, STATE_SAVED, STATE_ARCHIVED]),
        // Event handlers
        onMark: React.PropTypes.func.isRequired,
    },
    render() {
        return <div className="article-wrap">
            <div className="tools">
                <div className="tool-wrap">
                    <StateToggle {...this.props} />
                    <a href={this.props.url} target="_blank" title="View on source site">
                        <Outbound alt="View on source site" width="32" height="32" />
                    </a>
                </div>
            </div>
            <article>
                <h1><a href={this.props.url}>{this.props.title || "Untitled"}</a></h1>
                {this.props.author
                    ? <p className="meta">By {this.props.author} from {this.props.feed.text || this.props.feed.title}</p>
                    : <p className="meta">From <FeedLink feedId={this.props.feedId}>{this.props.feed.text || this.props.feed.title}</FeedLink></p>}
                <p className="meta">Posted {this.props.date}</p>
                <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}} />
            </article>
        </div>;
    }
});

export default Article;
