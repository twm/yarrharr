import React from 'react';
import PropTypes from 'prop-types';
import { Check, CheckEmpty, Heart, HeartEmpty } from 'widgets/icons.js';

const STYLE_HIDDEN = {visibility: "hidden"};

export class ReadToggle extends React.PureComponent {
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
        const Image = this.props.read ? Check : CheckEmpty;
        const text = this.props.read ? "Read" : "Unread";
        return <button className="button" onClick={this.handleClick}>
            <Image alt={text} />
        </button>;
    }
}

export class ReadToggleLink extends ReadToggle {
    render() {
        if (this.props.read == null) {
            return <span role="button" aria-disabled={true} tabIndex={-1}><CheckEmpty width="40" height="40" alt="" style={STYLE_HIDDEN} /></span>;
        }
        const Image = this.props.read ? Check : CheckEmpty;
        const text = this.props.read ? "Read" : "Unread"
        const actionText = this.props.read ? "Mark unread" : "Mark read"
        return <span role="button" tabIndex="0" onClick={this.handleClick} title={actionText} ><Image width="40" height="40" alt={text} /></span>;
    }
}

ReadToggle.defaultProps = ReadToggleLink.defaultProps = {marking: null};

ReadToggle.propTypes = ReadToggleLink.propTypes = {
    articleId: PropTypes.number.isRequired,
    read: PropTypes.bool,  // null indicates no value (the control is disabled)
    onMarkArticlesRead: PropTypes.func.isRequired,
};

export class FaveToggle extends React.PureComponent {
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
        const Image = this.props.fave ? Heart : HeartEmpty;
        const text = this.props.fave ? "Favorite" : "Not Favorite";
        return <button className="button" onClick={this.handleClick}>
            <Image alt={text} />
        </button>;
    }
}

export class FaveToggleLink extends FaveToggle {
    render() {
        if (this.props.fave == null) {
            return <span role="button" aria-disabled={true} tabIndex={-1}><HeartEmpty width="40" height="40" alt="" style={STYLE_HIDDEN} /></span>;
        }
        const Image = this.props.fave ? Heart : HeartEmpty;
        const text = this.props.fave ? "Favorite" : "Not Favorite";
        const actionText = this.props.fave ? "Mark article as not favorite" : "Mark article as favorite";
        return <span role="button" tabIndex="0" title={actionText} onClick={this.handleClick}><Image width="40" height="40" alt={text} /></span>;
    }
}

FaveToggle.defaultProps = FaveToggleLink.defaultProps = {marking: null};

FaveToggle.propTypes = FaveToggleLink.propTypes = {
    articleId: PropTypes.number.isRequired,
    fave: PropTypes.bool,  // null indicates no value (the control is disabled)
    onMarkArticlesFave: PropTypes.func.isRequired,
};
