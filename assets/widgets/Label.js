import React from 'react';
import PropTypes from 'prop-types';
import "./Label.less";

const __debug__ = process.env.NODE_ENV !== 'production';

export class Label extends React.PureComponent {
    render() {
        return <span className="label">
            <span className="label-text">{this.props.label.text}</span>
            {this.props.onDetach ? <a className="label-x" role="button" href="#" onClick={this.props.onDetach}> × </a> : null}
        </span>;
    }
}

if (__debug__) {
    Label.propTypes = {
        label: PropTypes.shape({
            text: PropTypes.string.isRequired,
        }).isRequired,
        onDetach: PropTypes.func,
    };
}
