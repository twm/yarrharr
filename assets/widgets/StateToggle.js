import React from 'react';
import PropTypes from 'prop-types';
import Heart from '../icons/heart-empty.svg';
import 'widgets/icons.less';

const __debug__ = process.env.NODE_ENV !== 'production';

export class ReadToggleLink extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = (event) => {
            event.preventDefault();
            const newFlag = !this.props.read;
            this.props.onMarkArticlesRead([this.props.articleId], newFlag);
        };
    }
    render() {
        const read = this.props.read;
        if (read == null) {
            return <a role="button" className="square" aria-disabled={true} tabIndex={-1} href="#"></a>;
        }
        const text = read ? "Read" : "Unread"
        const actionText = read ? "Mark unread" : "Mark read"
        const iconClass = `${this.props.iconClass} icon-check ${read ? "icon-check-pressed" : ""}`;
        const w = 20;
        const h = 20;
        return <a role="button" className="square" tabIndex="0" aria-label={text} title={actionText} href="#" onClick={this.handleClick}>
            <svg width="1em" height="1em" viewBox={`${w / -2} ${h / -2} ${w} ${h}`} aria-hidden={true} className={iconClass}>
                <circle cx="0" cy="0" r="7" />
                <path d={`M-7 2 l 5 5 l 9 -11`} />
            </svg>
        </a>;
    }
}

ReadToggleLink.defaultProps = {iconClass: "icon"};

if (__debug__) {
    ReadToggleLink.propTypes = {
        articleId: PropTypes.number.isRequired,
        read: PropTypes.bool,  // null indicates no value (the control is disabled)
        onMarkArticlesRead: PropTypes.func.isRequired,
    };
}

export { ReadToggleLink as ReadToggle };  // TODO finish rename

export class FaveToggleLink extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = (event) => {
            event.preventDefault();
            const newFlag = !this.props.fave;
            this.setState({fave: newFlag});
            this.props.onMarkArticlesFave([this.props.articleId], newFlag);
        };
    }
    render() {
        const iconClass = "icon icon-heart" + (this.props.fave ? "" : " icon-empty");
        if (this.props.fave == null) {
            return <a role="button" className="square" aria-disabled={true} tabIndex={-1} href="#"><Heart className={iconClass + " icon-hidden"} /></a>;
        }
        const text = this.props.fave ? "Favorite" : "Not Favorite";
        const actionText = this.props.fave ? "Mark article as not favorite" : "Mark article as favorite";
        return <a role="button" tabIndex="0" className="square" aria-label={text} title={actionText} href="#" onClick={this.handleClick}><Heart className={iconClass} aria-hidden={true} /></a>;
    }
}

FaveToggleLink.defaultProps = {marking: null};

if (__debug__) {
    FaveToggleLink.propTypes = {
        articleId: PropTypes.number.isRequired,
        fave: PropTypes.bool,  // null indicates no value (the control is disabled)
        onMarkArticlesFave: PropTypes.func.isRequired,
    };
}

export { FaveToggleLink as FaveToggle }; // TODO finish rename
