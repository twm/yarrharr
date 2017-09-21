import React from 'react';
import PropTypes from 'prop-types';
import { LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { Logo } from 'widgets/icons.js';
import { Narrow, Wide } from 'widgets/icons.js';
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
        return <a role="button" tabIndex="0" href="#" onClick={this.handleClick} title={actionText} ><Image width="40" height="40" alt={text} /></a>;
    }
}

export class GlobalBar extends React.PureComponent {
    render() {
        return <div className="bar">
            <RootLink><Logo width="40" height="40" alt="Home" /></RootLink>
            <LayoutToggleLink layout={this.props.layout} onSetLayout={this.props.onSetLayout} />
        </div>;
    }
}

if (__debug__) {
    LayoutToggleLink.propTypes = GlobalBar.propTypes = {
        layout: PropTypes.oneOf([LAYOUT_NARROW, LAYOUT_WIDE]).isRequired,
        onSetLayout: PropTypes.func.isRequired,
    };
}
