import React from 'react';
import PropTypes from 'prop-types';
import { FeedLink } from "widgets/links.js";
import { FILTER_ALL } from 'actions.js';
// import { Outbound } from 'widgets/icons.js';
import "./Article.less";

class Article extends React.PureComponent {
    render() {
        // TODO Put the outbound icon in the <h1>: <Outbound alt="" width="16" height="16" />
        return <article>
            <h1><a href={this.props.url} target="_blank">{this.props.title || "Untitled"}</a></h1>
            <div className="meta">
                {this.props.author
                    ? <p>By {this.props.author} from <FeedLink feedId={this.props.feedId} filter={FILTER_ALL}>{this.props.feed.text || this.props.feed.title}</FeedLink></p>
                    : <p>From <FeedLink feedId={this.props.feedId} filter={FILTER_ALL}>{this.props.feed.text || this.props.feed.title}</FeedLink></p>}
                <p>Posted {this.props.date}</p>
            </div>
            <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}} />
        </article>;
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
    };
}

export default Article;
