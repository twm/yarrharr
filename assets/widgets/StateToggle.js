import React from 'react';
import PropTypes from 'prop-types';
import { Star, Check, Heart, HeartEmpty } from 'widgets/icons.js';

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
        const Image = this.props.read ? Check : Star;
        const text = this.props.read ? "Archived" : "New";
        return <button className="button" onClick={this.handleClick}>
            <Image alt={text} />
        </button>;
    }
}

ReadToggle.defaultProps = {marking: null};

ReadToggle.propTypes = {
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

FaveToggle.defaultProps = {marking: null};

FaveToggle.propTypes = {
    articleId: PropTypes.number.isRequired,
    fave: PropTypes.bool.isRequired,
    onMarkArticlesFave: PropTypes.func.isRequired,
};
