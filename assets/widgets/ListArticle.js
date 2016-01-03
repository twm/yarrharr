import React from 'react';
import { FeedLink } from 'widgets/links.js';
import "./ListArticle.less";

function ListArticle(props) {
    if (props.loading) {
        return <div className="list-article loading"></div>;
    }
    var className = props.focused ? "list-article focused" : "list-article";
    return <div className={className}>
        <span className="icon">
            <img src={props.iconUrl} alt="*" width="16" height="16" />
        </span>
        <span className="meta">
            <FeedLink feedId={props.feed.id} className="feed">
                {props.feed.text || props.feed.title}
            </FeedLink>
            <time dateTime={props.date}>{props.date}</time>
        </span>
        <a className="title" href={props.url} target="_blank">{props.title}</a>
    </div>
}

module.exports = ListArticle;
