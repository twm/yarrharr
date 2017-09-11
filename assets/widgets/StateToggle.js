import React from 'react';
import PropTypes from 'prop-types';
import { Check, CheckEmpty, Heart, HeartEmpty } from 'widgets/icons.js';

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
        const Image = this.props.read ? Check : CheckEmpty;
        const text = this.props.read ? "Read" : "Unread"
        return <span className="lozenge" role="button" tabIndex="0" onClick={this.handleClick}><Image width="14" height="14" /> {text}</span>;
    }
}

ReadToggle.defaultProps = ReadToggleLink.defaultProps = {marking: null};

ReadToggle.propTypes = ReadToggleLink.propTypes = {
    articleId: PropTypes.number.isRequired,
    read: PropTypes.bool.isRequired,
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
        const Image = this.props.fave ? Heart : HeartEmpty;
        const text = this.props.fave ? "Favorite" : "Not Favorite";
        return <span className="lozenge" role="button" tabIndex="0" onClick={this.handleClick}><Image width="14" height="14" /> {text}</span>;
    }
}

FaveToggle.defaultProps = FaveToggleLink.defaultProps = {marking: null};

FaveToggle.propTypes = FaveToggleLink.propTypes = {
    articleId: PropTypes.number.isRequired,
    fave: PropTypes.bool.isRequired,
    onMarkArticlesFave: PropTypes.func.isRequired,
};
