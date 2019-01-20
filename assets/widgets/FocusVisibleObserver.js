import React from 'react';

/**
 * A component that observes DOM events and updates the <body> element's class
 * with the focus-visible class when focus should be displayed (roughly,
 * whenever the last input came via keyboard).
 *
 */
export class FocusVisibleObserver extends React.PureComponent {
    render() {
        return this.props.children;
    }
    componentDidMount() {
    }
    componentWillUnmount() {
    }
}
