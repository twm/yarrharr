import React from 'react';
import PropTypes from 'prop-types';


export class Title extends React.PureComponent {
    render() {
        window.document.title = this.props.title + " - Yarrharr";
        return null;
    }
}

if (__debug__) {
    Title.propTypes = {
        title: PropTypes.string.isRequired,
    };
}
