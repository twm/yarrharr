import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { Outbound } from 'widgets/icons.js';
import { ReadToggle } from 'widgets/StateToggle.js';
import "./ListArticle.less";

const PLACEHOLDER = <div className="list-article" />;
const BR = <br />;
const OUTBOUND_ICON = <Outbound alt="View on source site" width="32" height="32" />;

export default function ListArticle(props) {
    if (props.loading) {
        return PLACEHOLDER;
    }
    return <div className="list-article">
        <ReadToggle articleId={props.id} read={props.read} onMarkArticlesRead={props.onMarkArticlesRead} />
        {props.renderLink({
            articleId: props.id,
            className: "view-link",
            children: [
                <span className="meta">{props.feed.text || props.feed.title} on {props.date}</span>,
                BR,
                props.title || "Untitled",
            ],
        })}
        <a href={props.url} className="button" target="_blank" title="View on source site">
            {OUTBOUND_ICON}
        </a>
    </div>;
}
