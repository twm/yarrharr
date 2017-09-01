import React from 'react';
import PropTypes from 'prop-types';
import { Star, Check } from 'widgets/icons.js';

class StateToggle extends React.PureComponent {
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

StateToggle.defaultProps = {marking: null};

StateToggle.propTypes = {
    articleId: PropTypes.number.isRequired,
    read: PropTypes.bool.isRequired,
    onMarkArticlesRead: PropTypes.func.isRequired,
};

export default StateToggle;
