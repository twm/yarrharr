import React from 'react';
import PropTypes from 'prop-types';

const __debug__ = process.env.NODE_ENV !== 'production';

/**
 * A component which watches what vertical portion of an element is visible in
 * the viewport. Following a scroll or window resize it calls the
 * onVisibleChange() prop with two ratios: the earliest and latest edges
 * visible in the viewport (proportionate to rendered height).
 *
 * The callback may be fired rapidly depending on user action.
 */
class ScrollSpy extends React.PureComponent {
    constructor(props) {
        super(props);
        this.wrapper = null;  // DOM element of the wrapper <div>
        this.checkBufferSize = this.checkBufferSize.bind(this);
        this.handleChange = this.handleChange.bind(this);
    }
    componentDidMount() {
        window.addEventListener('scroll', this.handleChange, false);
        window.addEventListener('resize', this.handleChange, false);
        // Immediately schedule a check now that we have rendered.
        // TODO this should really use window.requestIdleCallback to minimize latency.
        this.handleChange();
    }
    componentWillUnmount() {
        window.removeEventListener('resize', this.handleChange, false);
        window.removeEventListener('scroll', this.handleChange, false);
    }
    /**
     * The view has resized or scrolled.  Schedule a check for whether we need
     * to load more items.
     */
    handleChange(event) {
        if (this._scrollTimeout) {
            clearTimeout(this._scrollTimeout);
        }
        this._scrollTimeout = setTimeout(this.checkBufferSize, 50);
    }
    /**
     * Schedule the load of more items once we get near the bottom of the
     * scrollable area.
     */
    checkBufferSize() {
        if (!this.wrapper) {
            return;
        }
        const viewportHeight = document.documentElement.clientHeight;
        const { height, top } = this.wrapper.getBoundingClientRect();
        var start = (-top) / height;
        var end = -(top - viewportHeight) / height;
        if (start > 1) {
            start = 1.0;
        } else if (start < 0) {
            start = 0;
        }
        if (end > 1) {
            end = 1;
        } else if (end > 1) {
            end = 1;
        }
        // console.log('height', height, 'top', top, '->', 'start', start, 'end', end, 'ok?', end > start);
        this.props.onVisibleChange(start, end);
    }
    render() {
        return <div ref={el => {this.wrapper = el;}}>{this.props.children}</div>;
    }
}

if (__debug__) {
    ScrollSpy.propTypes = {
        onVisibleChange: PropTypes.func.isRequired,
    };
}

export default ScrollSpy;
