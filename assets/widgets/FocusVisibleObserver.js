import React from 'react';

const FOCUS_VISIBLE_CLASS = "focus-visible";

/**
 * A component that observes DOM events and updates the <body> element's class
 * with the focus-visible class when focus should be displayed (roughly,
 * whenever the last input came via keyboard).
 *
 */
export class FocusVisibleObserver extends React.Component {
    constructor(props) {
        super(props);
        this.state = {keys: false};
        this.keyEvent = () => {
            // TODO: Modifier-only key events shouldn't change this state
            // (e.g., Alt-Tab or Ctrl-Click).
            this.setState({keys: true});
        };
        this.nonKeyEvent = () => {
            this.setState({keys: false});
        };
    }
    applyClass() {
        const classes = document.body.classList;
        if (this.state.keys) {
            classes.add(FOCUS_VISIBLE_CLASS);
        } else {
            classes.remove(FOCUS_VISIBLE_CLASS);
        }
    }
    render() {
        this.applyClass();
        return <div
            onKeyDown={this.keyEvent}
            onClick={this.nonKeyEvent}
            children={this.props.children}
        />;
    }
    componentDidMount() {
        this.applyClass();
    }
    componentWillUnmount() {
    }
}
