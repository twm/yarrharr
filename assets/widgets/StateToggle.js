import React from 'react';
import PropTypes from 'prop-types';
import { Check, CheckEmpty, Heart } from 'widgets/icons.js';

const STYLE_HIDDEN = {visibility: "hidden"};

export class ReadToggleLink extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = (event) => {
            event.preventDefault();
            const newFlag = !this.props.read;
            this.setState({read: newFlag});
            this.props.onMarkArticlesRead([this.props.articleId], newFlag);
        };
    }
    render() {
        if (this.props.read == null) {
            return <a role="button" aria-disabled={true} tabIndex={-1} href="#"><CheckEmpty width="40" height="40" alt="" style={STYLE_HIDDEN} /></a>;
        }
        const Image = this.props.read ? Check : CheckEmpty;
        const text = this.props.read ? "Read" : "Unread"
        const actionText = this.props.read ? "Mark unread" : "Mark read"
        return <a role="button" tabIndex="0" href="#" onClick={this.handleClick} title={actionText} ><Image width="40" height="40" alt={text} /></a>;
    }
}

ReadToggleLink.defaultProps = {marking: null};

ReadToggleLink.propTypes = {
    articleId: PropTypes.number.isRequired,
    read: PropTypes.bool,  // null indicates no value (the control is disabled)
    onMarkArticlesRead: PropTypes.func.isRequired,
};

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
        if (this.props.fave == null) {
            return <a role="button" aria-disabled={true} tabIndex={-1} href="#"><HeartEmpty width="40" height="40" alt="" style={STYLE_HIDDEN} /></a>;
        }
        const text = this.props.fave ? "Favorite" : "Not Favorite";
        const actionText = this.props.fave ? "Mark article as not favorite" : "Mark article as favorite";
        return <a role="button" tabIndex="0" aria-label={text} title={actionText} href="#" onClick={this.handleClick}><Heart empty={!this.props.fave} aria-hidden="true" /></a>;
    }
}

FaveToggleLink.defaultProps = {marking: null};

FaveToggleLink.propTypes = {
    articleId: PropTypes.number.isRequired,
    fave: PropTypes.bool,  // null indicates no value (the control is disabled)
    onMarkArticlesFave: PropTypes.func.isRequired,
};
