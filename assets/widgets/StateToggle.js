import React from 'react';
import PropTypes from 'prop-types';
import { HeartIcon } from 'widgets/icons.js';
import './StateToggle.less';

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
        const actionText = read ? "Mark unread" : "Mark read"
        return <button className="read-toggle square" tabIndex="0" aria-pressed={read} aria-label="Read" title={actionText} href="#" onClick={this.handleClick}>
            <svg width="1em" height="1em" viewBox="-10 -10 20 20" aria-hidden={true} className={this.props.iconClass}>
                <circle cx="0" cy="0" r="7" />
                <path d="M-7 2 l 5 5 l 9 -11" />
            </svg>
        </button>;
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
            this.props.onMarkArticlesFave([this.props.articleId], newFlag);
        };
    }
    render() {
        const fave = this.props.fave;
        if (fave == null) {
            return <a role="button" className="square" aria-disabled={true} tabIndex={-1} href="#"></a>;
        }
        const actionText = fave ? "Mark article as not favorite" : "Mark article as favorite";
        return <button className="fave-toggle square" tabIndex="0" aria-pressed={fave} aria-label="Favorite" title={actionText} href="#" onClick={this.handleClick}>
            <HeartIcon className={this.props.iconClass} aria-hidden={true} />
        </button>;
    }
}

FaveToggleLink.defaultProps = {iconClass: "icon"};

if (__debug__) {
    FaveToggleLink.propTypes = {
        articleId: PropTypes.number.isRequired,
        fave: PropTypes.bool,  // null indicates no value (the control is disabled)
        onMarkArticlesFave: PropTypes.func.isRequired,
    };
}

export { FaveToggleLink as FaveToggle }; // TODO finish rename
