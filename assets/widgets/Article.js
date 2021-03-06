import React from 'react';
import PropTypes from 'prop-types';
import { FeedLink } from "widgets/links.js";
import { RelativeTime } from 'widgets/time.jsm';
import { FILTER_ALL } from 'actions.js';
import { OutboundIcon } from 'widgets/icons.js';
import "./Article.less";

export class Article extends React.PureComponent {
    render() {
        return <article>
            <div className="meta">
                <FeedLink feedId={this.props.feedId} filter={FILTER_ALL}>{this.props.feed.text || this.props.feed.title}</FeedLink> — <RelativeTime then={this.props.date} />
                {this.props.author
                    ? <React.Fragment> — {this.props.author} </React.Fragment>
                    : null}
            </div>
            <h1>
                <a href={this.props.url} target="_blank">
                    <span>{this.props.title || "Untitled"}</span>
                    <OutboundIcon aria-hidden={true} />
                </a>
            </h1>
            <div className="content" dangerouslySetInnerHTML={{__html: this.props.content}} />
        </article>;
    }
}

if (__debug__) {
    Article.propTypes = {
        // Data attributes
        id: PropTypes.number.isRequired,
        url: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        author: PropTypes.string,
        content: PropTypes.string.isRequired,
        date: PropTypes.number.isRequired,
        feed: PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string,
            title: PropTypes.string.isRequired,
        }).isRequired,
        read: PropTypes.bool.isRequired,
        fave: PropTypes.bool.isRequired,
    };
}

const LOADING_ARTICLE = <article>
    <h1><a href="javascript:void(0)">••••• ••••••••••••• ••••••••</a></h1>
    <div className="meta">
        <p>••••••••••••••••••••••••••••••••</p>
        <p>••••••••••••••••</p>
    </div>
    <div className="content">
        <p>••••••••••••••••• ••••• •••••••••••••• ••••••••••••• ••••••••••••••••• ••••••••••••• •••••••••••••••••• •• •••••••••••••</p>
    </div>
</article>;

export function LoadingArticle() {
    return LOADING_ARTICLE;
}
