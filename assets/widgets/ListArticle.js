import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { Outbound } from 'widgets/icons.js';
import { ReadToggleLink } from 'widgets/StateToggle.js';
import "./ListArticle.less";

const PLACEHOLDER = <div className="list-article loading"><span></span></div>;
const BR = <br />;
const OUTBOUND_ICON = <Outbound alt="View on source site" width="40" height="40" />;

export default class ListArticle extends React.PureComponent {
    render() {
        const props = this.props;
        if (props.loading) {
            return PLACEHOLDER;
        }
        return <div className="list-article">
            {props.renderLink({
                articleId: props.id,
                className: "view-link",
                children: [
                    <span className="meta">{props.feed.text || props.feed.title} on {props.date}</span>,
                    BR,
                    props.title || "Untitled",
                ],
            })}
            <ReadToggleLink articleId={props.id} read={props.read} onMarkArticlesRead={props.onMarkArticlesRead} />
            <a className="outbound" href={props.url} target="_blank" title="View on source site">
                {OUTBOUND_ICON}
            </a>
        </div>;
    }
}
