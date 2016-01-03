import React from 'react';
import './drop-button.less';

const DropButton = React.createClass({
    propTypes: {
        // XXX: How to express that it must be an element class?
        trigger: React.PropTypes.any.isRequired,
        children: React.PropTypes.element.isRequired,
    },
    getInitialState() {
        return {open: false};
    },
    handleClick() {
        this.setState({open: !this.state.open});
    },
    render() {
        const Trigger = this.props.trigger;
        const drop = this.state.open ? <div className="dropdown">{this.props.children}</div> : null;
        return <div className="drop-button" onClick={this.handleClick}>
            <Trigger open={this.state.open} />
            {drop}
        </div>;
    }
});

module.exports = DropButton;
