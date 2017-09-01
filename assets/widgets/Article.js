import React from 'react';
import PropTypes from 'prop-types';
import { FeedLink } from "widgets/links.js";
import { FILTER_ALL, FLAG_READ, FLAG_FAVE } from 'actions.js';
import { Outbound } from 'widgets/icons.js';
import { ReadToggle, FaveToggle } from 'widgets/StateToggle.js';
import "./Article.less";

class Article extends React.Component {
    render() {
        return <div className="article-wrap">
            <div className="tools">
                <div className="tool-wrap">
                    <ReadToggle articleId={this.props.id} read={this.props.read} onMarkArticlesRead={this.props.onMarkArticlesRead} />
                    <FaveToggle articleId={this.props.id} fave={this.props.fave} onMarkArticlesFave={this.props.onMarkArticlesFave} />
                    <a href={this.props.url} target="_blank" title="View on source site">
                        <Outbound alt="View on source site" width="32" height="32" />
                    </a>
                </div>
            </div>
            <article>
                <h1><a href={this.props.url}>{this.props.title || "Untitled"}</a></h1>
                {this.props.author
                    ? <p className="meta">By {this.props.author} from {this.props.feed.text || this.props.feed.title}</p>
                    : <p className="meta">From <FeedLink feedId={this.props.feedId} filter={FILTER_ALL}>{this.props.feed.text || this.props.feed.title}</FeedLink></p>}
                <p className="meta">Posted {this.props.date}</p>
                <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}} />
            </article>
        </div>;
    }
}

if (process.env.NODE_ENV !== 'production') {
    Article.propTypes = {
        // Data attributes
        id: PropTypes.number.isRequired,
        url: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        author: PropTypes.string,
        content: PropTypes.string.isRequired,
        date: PropTypes.string.isRequired,
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string,
            title: PropTypes.string.isRequired,
        }).isRequired,
        read: PropTypes.bool.isRequired,
        fave: PropTypes.bool.isRequired,
        // Non-null indicates that a mark operation is in-progress.
        marking: PropTypes.shape({
            [FLAG_READ]: PropTypes.bool,
            [FLAG_FAVE]: PropTypes.bool,
        }),
        // Event handlers
        onMarkArticlesRead: PropTypes.func.isRequired,
        onMarkArticlesFave: PropTypes.func.isRequired,
    };
}

export default Article;
