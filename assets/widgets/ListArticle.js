import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { FollowIcon, HeartIcon, OutboundIcon } from 'widgets/icons.js';
import { ReadToggle } from 'widgets/StateToggle.js';
import { RelativeTime } from 'widgets/time.jsm';
import "./ListArticle.less";

const OUTBOUND_ICON = <span className="outbound-icon"><OutboundIcon aria-hidden={true} /></span>;
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
                <div className="list-article-slider">
                    <a className="outbound" href={props.url} target="_blank" title="View on source site">
                        <span className="meta">{props.feed.text || props.feed.title} — <RelativeTime then={props.date} /></span>
                        <span className="title">{props.title || "Untitled"} {props.fave ? HEART_ICON : null}</span>
                        {OUTBOUND_ICON}
                    </a>
                    <ReadToggle articleId={props.id} read={props.read} onMarkArticlesRead={props.onMarkArticlesRead} />
                    {props.renderLink({
                        articleId: props.id,
                        className: "square view-link",
                        children: <FollowIcon key="icon" title="View article" />,
                    })}
                </div>
            </div>
        </div>;
    }
}
