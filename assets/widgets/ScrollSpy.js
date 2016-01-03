import React from 'react';

/**
 * A component which watches the window scroll position and fires an event when
 * it nears the end.  While this monitors the global scroll position, it is
 * useful to install and remove the event listeners as part of the component
 * life cycle.
 *
 * This will fire events as long as there is less than a full viewport's worth
 * of content below the fold.
 */
const ScrollSpy = React.createClass({
    propTypes: {
        onNearBottom: React.PropTypes.func.isRequired,
    },
    componentDidMount() {
        window.addEventListener('scroll', this.handleChange, false);
        window.addEventListener('resize', this.handleChange, false);
        // Immediately schedule a check now that we have rendered.
        this.handleChange();
    },
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleChange, false);
        window.removeEventListener('scroll', this.handleChange, false);
    },
    /**
     * The view has resized or scrolled.  Schedule a check for whether we need
     * to load more items.
     */
    handleChange(event) {
        if (this._scrollTimeout) {
            clearTimeout(this._scrollTimeout);
        }
        this._scrollTimeout = setTimeout(this.checkBufferSize, 50);
    },
    /**
     * Schedule the load of more items once we get near the bottom of the
     * scrollable area.
     */
    checkBufferSize() {
        const viewportHeight = document.documentElement.clientHeight;
        // Only Firefox seems to support window.scrollMaxY, but this generally seems to be equivalent.
        const scrollMaxY = document.body.scrollHeight - viewportHeight;
        const buffer = scrollMaxY - window.scrollY;
        if (buffer < viewportHeight) {
            console.log('scroll near bottom: buffer=%d < viewportHeight=%d', buffer, viewportHeight);
            this.props.onNearBottom();
        }
    },
    render() {
        return <div>{this.props.children}</div>;
    }
});

module.exports = ScrollSpy;
