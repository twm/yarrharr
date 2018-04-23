import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { FollowIcon, HeartIcon, OutboundIcon } from 'widgets/icons.js';
import { ReadToggle } from 'widgets/StateToggle.js';
import { RelativeTime } from 'widgets/time.jsm';
import "./ListArticle.less";

const OUTBOUND_ICON = <OutboundIcon aria-hidden={true} />;
const HEART_ICON = <HeartIcon />;

export default class ListArticle extends React.PureComponent {
    render() {
        const props = this.props;
        if (props.loading) {
            return <div className="list-article">
                <div className="list-article-inner">
                </div>
            </div>
        }
        return <div className="list-article">
            <div className="list-article-inner">
                <a className="outbound" href={props.url} target="_blank" title="View on source site">
                    <span className="meta">{props.feed.text || props.feed.title} — <RelativeTime then={props.date} /> {OUTBOUND_ICON}</span>
                    <span className="title">{props.title || "Untitled"} {props.fave ? HEART_ICON : null}</span>
                </a>
                <ReadToggle articleId={props.id} read={props.read} onMarkArticlesRead={props.onMarkArticlesRead} />
                {props.renderLink({
                    articleId: props.id,
                    className: "square view-link",
                    children: [
                        <FollowIcon key="icon" title="View article" />
                    ],
                })}
            </div>
        </div>;
    }
}
