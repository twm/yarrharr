import React from 'react';
import PropTypes from 'prop-types';

const __debug__ = process.env.NODE_ENV !== 'production';

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
