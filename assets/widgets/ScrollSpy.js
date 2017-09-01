import React from 'react';
import PropTypes from 'prop-types';

/**
 * A component which watches the window scroll position and fires an event when
 * it nears the end.  While this monitors the global scroll position, it is
 * useful to install and remove the event listeners as part of the component
 * life cycle.
 *
 * This will fire events as long as there is less than a full viewport's worth
 * of content below the fold.
 */
class ScrollSpy extends React.PureComponent {
    componentDidMount() {
        window.addEventListener('scroll', this.handleChange.bind(this), false);
        window.addEventListener('resize', this.handleChange.bind(this), false);
        // Immediately schedule a check now that we have rendered.
        this.handleChange();
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleChange.bind(this), false);
        window.removeEventListener('scroll', this.handleChange.bind(this), false);
    }
    /**
     * The view has resized or scrolled.  Schedule a check for whether we need
     * to load more items.
     */
    handleChange(event) {
        if (this._scrollTimeout) {
            clearTimeout(this._scrollTimeout);
        }
        this._scrollTimeout = setTimeout(this.checkBufferSize.bind(this), 50);
    }
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
    }
    render() {
        return <div>{this.props.children}</div>;
    }
}

ScrollSpy.propTypes = {
    onNearBottom: PropTypes.func.isRequired,
};

export default ScrollSpy;
