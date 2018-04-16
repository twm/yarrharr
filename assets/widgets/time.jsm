import React from 'react';
import PropTypes from 'prop-types';

const __debug__ = process.env.NODE_ENV !== 'production';
const TimeContext = React.createContext('time');


/**
 * Produce a string which describes how long ago then was, relative to now.
 *
 * @param {Number} then Millisecond-since-epoch timestamp
 * @param {Number} now  Millisecond-since-epoch timestamp
 * @returns {String} Humanized relative time
 */
export function reltime(then, now) {
    const delta = (now - then) / 1000;
    if (delta < 2 * 60) { // < 2 minutes
        return "just now";
    } else if (delta < 60 * 60 * 2) { // < 2 hours
        return `${(delta / 60).toFixed(0)} minutes ago`;
    } else if (delta < 60 * 60 * 24 * 2) { // < 2 days
        return `${(delta / 3600).toFixed(0)} hours ago`;
    } else if (delta < 60 * 60 * 24 * 48) { // < 48 days
        return `${(delta / (60 * 60 * 24)).toFixed(0)} days ago`;
    } else if (delta < 60 * 60 * 24 * 365) { // < 1 year
        return `${(delta / (30 * 24 * 60 * 30)).toFixed(0)} months ago`;
    }
    return new Date(then).toLocaleDateString();
}

/**
 * Clock is a context provider that sets the time to which RelativeTime is
 * relative.
 */
export class Clock extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            now: Date.now(),
        };
    }
    render() {
        return <TimeContext.Provider value={this.state.now} children={this.props.children} />;
    }
    // TODO: Update timestamp
    // TODO: Only update timestamp when tab is visible.
}

/**
 * RelativeTime displays a timestamp in a low-precision humanized format like
 * "just now" or "2 days ago".
 */
export class RelativeTime extends React.Component {
    render() {
        return <TimeContext.Consumer>
            {now => reltime(this.props.then, now)}
        </TimeContext.Consumer>;
    }
}

if (__debug__) {
    RelativeTime.propTypes = {
        then: PropTypes.number.isRequired,
    };
}
