import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { OutboundIcon } from 'widgets/icons.js';
import { ReadToggleLink } from 'widgets/StateToggle.js';
import { RelativeTime } from 'widgets/time.jsm';
import Heart from '../icons/heart-empty.svg';
import "./ListArticle.less";

const PLACEHOLDER = <div className="list-article"></div>;
const BR = <br key="br" />;
const OUTBOUND_ICON = <OutboundIcon aria-hidden={true} />;
const HEART_ICON = <React.Fragment key="heart">
    <Heart key="heart" className="icon-heart" />
</React.Fragment>;

export default class ListArticle extends React.PureComponent {
    render() {
        const props = this.props;
        if (props.loading) {
            return PLACEHOLDER;
        }
        return <div className="list-article">
            <div className="list-article-inner">
                {props.renderLink({
                    articleId: props.id,
                    className: "view-link",
                    children: [
                        <span key="meta" className="meta">{props.feed.text || props.feed.title || props.feed.url} — <RelativeTime then={props.date} /></span>,
                        BR,
                        props.title || "Untitled",
                        props.fave ? HEART_ICON : null,
                    ],
                })}
                <ReadToggleLink articleId={props.id} read={props.read} onMarkArticlesRead={props.onMarkArticlesRead} />
                <a className="outbound" href={props.url} target="_blank" title="View on source site">
                    {OUTBOUND_ICON}
                </a>
            </div>
        </div>;
    }
}
