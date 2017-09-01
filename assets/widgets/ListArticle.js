import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { Outbound } from 'widgets/icons.js';
import { ReadToggle } from 'widgets/StateToggle.js';
import "./ListArticle.less";

export default function ListArticle(props) {
    if (props.loading) {
        return <div className="list-article">
            <span className="button"> </span>
            {props.renderLink({
                articleId: props.id,
                className: "view-link",
                children: [
                    <span className="meta">...</span>,
                    <br />,
                    "...",
                ],
            })}
            <span className="button"> </span>
        </div>;
    }
    return <div className="list-article">
        <ReadToggle articleId={props.id} read={props.read} onMarkArticlesRead={props.onMarkArticlesRead} />
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
