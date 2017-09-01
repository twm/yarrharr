import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { Outbound } from 'widgets/icons.js';
import StateToggle from 'widgets/StateToggle.js';
import "./ListArticle.less";

export default function ListArticle(props) {
    return <div className="list-article">
        <StateToggle className="button" {...props} />
        {props.renderLink({
            articleId: props.id,
            className: "view-link",
            children: [
                <span className="meta">{props.feed.text || props.feed.title} on {props.date}</span>,
                <br />,
                props.title || "Untitled",
            ],
        })}
        <a href={props.url} className="button" target="_blank" title="View on source site">
            <Outbound alt="View on source site" width="32" height="32" />
        </a>
    </div>;
}
