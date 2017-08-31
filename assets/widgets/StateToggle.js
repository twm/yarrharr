import React from 'react';
import PropTypes from 'prop-types';
import { Star, Check, Heart } from 'widgets/icons.js';
import { STATE_NEW, STATE_SAVED, STATE_ARCHIVED } from 'actions.js';

const NEXT_STATE = {
    [STATE_NEW]: STATE_ARCHIVED,
    [STATE_ARCHIVED]: STATE_SAVED,
    [STATE_SAVED]: STATE_NEW,
};
const STATE_TEXT = {
    [STATE_NEW]: "New",
    [STATE_ARCHIVED]: "Archived",
    [STATE_SAVED]: "Saved",
};
const STATE_IMAGE = {
    [STATE_NEW]: Star,
    [STATE_ARCHIVED]: Check,
    [STATE_SAVED]: Heart,
};

const StateToggle = React.createClass({
    propTypes: {
        id: PropTypes.number.isRequired,
        state: PropTypes.oneOf([STATE_NEW, STATE_SAVED, STATE_ARCHIVED]).isRequired,
        // Non-null indicates that a mark operation is in-progress.
        marking: PropTypes.oneOf([null, STATE_NEW, STATE_SAVED, STATE_ARCHIVED]),
        onMark: PropTypes.func.isRequired,
    },
    getDefaultProps() {
        return {marking: null};
    },
    getInitialState() {
        return {pendingMark: null};
    },
    handleClick(event) {
        event.preventDefault();
        if (this.state.pendingMark) {
            window.clearTimeout(this._timeout);
        }
        const prevState = this.getDisplayState();
        const nextState = NEXT_STATE[prevState];
        this.setState({pendingMark: nextState});
        this._timeout = window.setTimeout(() => {
            this._timeout = null;
            this.setState({pendingMark: null});
            this.props.onMark(this.props.id, nextState);
        }, 300);
    },
    componentWillUnmount() {
        // We immediately flush any pending mark when unmounting.  Presumably
        // the user won't be clicking again, so the intended state can't change.
        if (this.state.pendingMark) {
            window.clearTimeout(this._timeout);
            this.props.onMark(this.props.id, this.state.pendingMark);
        }
    },
    getDisplayState() {
        return this.state.pendingMark || this.props.marking || this.props.state;
    },
    render() {
        const displayState = this.getDisplayState();
        const marking = this.state.pendingMark || this.props.marking;
        const className = "state-toggle state-" + displayState + (marking ? " marking " : "");
        const Image = STATE_IMAGE[displayState];
        const text = STATE_TEXT[displayState];
        return <button className={className} onClick={this.handleClick} {...this.props}>
            <Image alt={text} />
        </button>;
    },
});

export default StateToggle;
