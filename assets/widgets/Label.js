import React from 'react';
import PropTypes from 'prop-types';
import { LabelLink } from 'widgets/links.js';
import { FILTER_UNREAD } from '../actions.js';
import "./Label.less";


/**
 * <Label> displays the name of a label as a link to that label's view.
 */
export class Label extends React.PureComponent {
    render() {
        return <LabelLink labelId={this.props.label.id} filter={FILTER_UNREAD}>
            {this.props.label.text}
        </LabelLink>;
    }
}

if (__debug__) {
    Label.propTypes = {
        feedId: PropTypes.number.isRequired,
        label: PropTypes.shape({
            id: PropTypes.number.isRequired,
            text: PropTypes.string.isRequired,
        }).isRequired,
    };
}
