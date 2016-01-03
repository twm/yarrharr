import React from 'react';
import { FeedLink } from "widgets/links.js";
import { STATE_NEW, STATE_SAVED, STATE_DONE } from 'actions.js';
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
        state: React.PropTypes.oneOf([STATE_NEW, STATE_SAVED, STATE_DONE]),
        // Non-null indicates that a mark operation is in-progress.
        marking: React.PropTypes.oneOf([null, STATE_NEW, STATE_SAVED, STATE_DONE]),
        // Event handlers
        onMark: React.PropTypes.func.isRequired,
    },
    getDefaultProps() {
        return {
            marking: null,
        };
    },
    renderMarkButton(text, targetState) {
        var className = (this.props.state === targetState) ? "current" : "";
        if (this.props.marking === targetState) {
            className += ' progress';
        }
        return <button className={className} onClick={(event) => {
            event.preventDefault();
            this.props.onMark(this.props.id, targetState);
        }}>
            {text}
        </button>;
    },
    render() {
        return <article>
            <h1><a href={this.props.url}>{this.props.title}</a></h1>
            {this.props.author
                ? <p className="meta">By {this.props.author} from {this.props.feed.text || this.props.feed.title}</p>
                : <p className="meta">From <FeedLink feedId={this.props.feedId}>{this.props.feed.text || this.props.feed.title}</FeedLink></p>}
            <p className="meta">Posted {this.props.date}</p>
            <div>
                <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}} />
                <footer>
                    {this.renderMarkButton('New', STATE_NEW)}
                    {this.renderMarkButton('Saved', STATE_SAVED)}
                    {this.renderMarkButton('Done', STATE_DONE)}
                    <a href={this.props.url} target="_blank">View externally</a>
                </footer>
            </div>
        </article>;
    }
});

module.exports = Article;
