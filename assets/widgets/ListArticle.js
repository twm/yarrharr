import React from 'react';
import { FeedLink } from 'widgets/links.js';
import { FollowIcon, HeartIcon, OutboundIcon } from 'widgets/icons.js';
import { ReadToggle } from 'widgets/StateToggle.js';
import { RelativeTime } from 'widgets/time.jsm';
import "./ListArticle.less";

const HEART_ICON = <HeartIcon />;

function cancel(event) {
    event.preventDefault();
}

/**
 * ListArticle displays article metadata in a few lines of text, along with
 * some links and buttons.
 *
 * +----------------------------------------------------+------+------+
 * | FEED TITLE - date                                  | read | view |
 * | Title of article - snippet of article content...   | read | view |
 * +----------------------------------------------------+------+------+
 *     ↑                                                    ↑     ↑
 *     link: article on source site                         |     |
 *                                        button: toggle read     |
 *                                           link: view in Yarrharr
 */
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
                    <a className="outbound" href={props.url} target="_blank" title="View on source site" onDragStart={cancel}>
                        <span className="meta1">
                            {props.feed.text || props.feed.title} — <RelativeTime then={props.date} />
                            {props.author ? <React.Fragment> — {props.author}</React.Fragment> : null}
                        </span>
                        <span className="meta2"><span className="title">{props.title || "Untitled"}</span> {props.fave ? HEART_ICON : null} <span className="snippet">{props.snippet}</span></span>
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
