import React from 'react';
import PropTypes from 'prop-types';
import { HeartIcon } from 'widgets/icons.js';
import './StateToggle.less';


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
            return <button className="read-toggle-button" aria-pressed={false} aria-label="Read" aria-disabled={true} tabIndex={-1} />;
        }
        const actionText = read ? "Mark unread" : "Mark read"
        return <button className="read-toggle square" aria-pressed={read} aria-label="Read" title={actionText} onClick={this.handleClick}>
            <svg width="1em" height="1em" viewBox="0 0 1 1" aria-hidden={true} className={this.props.iconClass}>
                <defs>
                    {/* This would be defined in <IconSprite />, but referencing it as url(#check-mask) it doesn't work if I put it there. Duplicate IDs, oh well. */}
                    <mask id="check-mask">
                        <use xlinkHref="#icon-check" color="white" />
                    </mask>
                </defs>
                <g mask="url(#check-mask)">
                    <rect className="inactive" width="1" height="1" />
                    <rect className="active" width="1" height="1" />
                </g>
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
        return <button className="fave-toggle square" tabIndex="0" aria-pressed={fave} aria-label="Favorite" title={actionText} onClick={this.handleClick}>
            <svg width="1em" height="1em" viewBox="0 0 1 1" aria-hidden={true} className={this.props.iconClass}>
                <defs>
                    {/* This would be defined in <IconSprite />, but referencing it as url(#check-mask) it doesn't work if I put it there. Duplicate IDs, oh well. */}
                    <mask id="heart-mask">
                        <use xlinkHref="#icon-heart" color="white" />
                    </mask>
                </defs>
                <g mask="url(#heart-mask)">
                    <rect className="inactive" width="1" height="1" />
                    <rect className="active" width="1" height="1" />
                </g>
            </svg>
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
