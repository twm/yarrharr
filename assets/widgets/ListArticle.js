import React from 'react';
import { ArticleLink, FeedLink } from 'widgets/links.js';
import { Outbound } from 'widgets/icons.js';
import StateToggle from 'widgets/StateToggle.js';
import "./ListArticle.less";

function ListArticle(props) {
    return <div className="list-article">
        <StateToggle className="button" {...props} />
        <ArticleLink articleId={props.id} className="view-link">
            <span className="meta">{props.feed.text || props.feed.title} on {props.date}</span>
            <br />
            {props.title}
        </ArticleLink>
        <a href={props.url} className="button" target="_blank" title="View on source site">
            <Outbound alt="View on source site" width="32" height="32" />
        </a>
    </div>;
}

module.exports = ListArticle;
