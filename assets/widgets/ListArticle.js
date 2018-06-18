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
 * The row must be slid at least this many pixels to trigger an action.
 */
const MIN_SLIDE = 40;
/**
 * The maximum number of pixels the row can be slid. It will stop moving after
 * this point.
 */
const MAX_SLIDE = 70;

/**
 * ListArticle displays article metadata in a few lines of text, along with
 * some links and buttons.
 *
 * +----------------------------------------------------+------+------+
 * | FEED TITLE - date                                  | read | view |
 * | Title of article                                   | read | view |
 * +----------------------------------------------------+------+------+
 *     ↑                                                    ↑     ↑
 *     link: article on source site                         |     |
 *                                        button: toggle read     |
 *                                           link: view in Yarrharr
 *
 * The row can also be dragged right to toggle read or left to toggle
 * fave.
 */
export default class ListArticle extends React.PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            dx: 0,
        };
        this.dragPointer = null;
        this.x0 = null;
        this.suppressNextClick = false;
        this.onDown = event => {
            console.log('onDown', event.pointerId, event.pageX);
            if (this.dragPointer == null) {
                event.target.setPointerCapture(event.pointerId);
                this.dragPointer = event.pointerId;
                this.x0 = event.pageX;
            }
        };
        this.onDrag = event => {
            if (this.dragPointer !== event.pointerId) return;
            // TODO cap dx in each direction, animate action icon and text appearing
            const dx = event.pageX - this.x0;
            console.log('onMove', event.pointerId, event.pageX, dx);
            this.setState({dx});
        };
        this.onCancel = event => {
            if (this.dragPointer !== event.pointerId) return;
            console.log('onCancel', event);
            this.dragPointer = null;
            this.setState({dx: 0});
        };
        this.onUp = event => {
            if (this.dragPointer !== event.pointerId) return;
            const dx = event.pageX - this.x0;
            console.log('onUp', event.pointerId, event.pageX, dx);
            if (dx < -MIN_SLIDE) {
                console.log('markFave');
                this.props.onMarkArticlesFave([this.props.id], !this.props.fave);
                this.suppressNextClick = true;
            } else if (dx > MIN_SLIDE) {
                console.log('markRead');
                this.props.onMarkArticlesRead([this.props.id], !this.props.read);
                this.suppressNextClick = true;
            }
            this.dragPointer = null;
            this.setState({dx: 0});
        }
        this.onClickCapture = event => {
            // Prevent buttons and links in sub-components from handling the event when dragging.
            if (this.suppressNextClick) {
                event.preventDefault();
                event.stopPropagation();
                this.suppressNextClick = false;
            }
        };
    }
    render() {
        const props = this.props;
        if (props.loading) {
            return <div className="list-article">
                <div className="list-article-inner">
                </div>
            </div>
        }
        var {dx} = this.state;
        if (dx < -MAX_SLIDE) {
            dx = -MAX_SLIDE;
        } else if (dx > MAX_SLIDE) {
            dx = MAX_SLIDE;
        }
        return <div className="list-article">
            <div className="list-article-inner">
                <div className="list-article-slider"
                        onPointerDown={this.onDown}
                        onPointerMove={this.onDrag}
                        onPointerUp={this.onUp}
                        onPointerCancel={this.onCancel}
                        onClickCapture={this.onClickCapture}
                        onDragStart={cancel}
                        style={{transform: `translateX(${dx}px)`}}
                    >
                    <a className="outbound" href={props.url} target="_blank" title="View on source site" onDragStart={cancel}>
                        <span className="meta">{props.feed.text || props.feed.title} — <RelativeTime then={props.date} /></span>
                        <span className="title">{props.title || "Untitled"} {props.fave ? HEART_ICON : null}</span>
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
