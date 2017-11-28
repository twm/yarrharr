import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { setLayout, LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import Home from 'icons/home.svg';
import Narrow from 'icons/narrow.svg';
import Wide from 'icons/wide.svg';

import { RootLink } from 'widgets/links.js';

const __debug__ = process.env.NODE_ENV !== 'production';

export class LayoutToggleLink extends React.PureComponent {
    constructor(props) {
        super(props);
        this.handleClick = (event) => {
            event.preventDefault();
            const newLayout = this.props.layout === LAYOUT_NARROW ? LAYOUT_WIDE : LAYOUT_NARROW;
            this.props.onSetLayout(newLayout);
        };
    }
    render() {
        const narrow = this.props.layout === LAYOUT_NARROW;
        const Image = narrow ? Wide : Narrow;
        const text = narrow ? "Wide" : "Narrow"
        const actionText = narrow ? "Switch to wide layout" : "Switch to narrow layout"
        return <a role="button" className="square" tabIndex="0" aria-label={text} href="#" onClick={this.handleClick} title={actionText} ><Image className="icon" aria-hidden={true} /></a>;
    }
}

export const ConnectedLayoutToggleLink = connect(state => {
    return {layout: state.layout};
}, {
    onSetLayout: setLayout,
})(LayoutToggleLink);

export class GlobalBar extends React.PureComponent {
    render() {
        return <div className="bar">
            <RootLink className="square" aria-label="Home"><Home className="icon" aria-hidden={true} /></RootLink>
            {this.props.children}
            <ConnectedLayoutToggleLink />
        </div>;
    }
}

if (__debug__) {
    LayoutToggleLink.propTypes = {
        layout: PropTypes.oneOf([LAYOUT_NARROW, LAYOUT_WIDE]).isRequired,
        onSetLayout: PropTypes.func.isRequired,
    };
}
