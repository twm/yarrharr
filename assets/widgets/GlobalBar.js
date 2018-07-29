import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { setLayout, LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { HomeIcon, GoFullscreenIcon, ExitFullscreenIcon, NarrowIcon, WideIcon } from 'widgets/icons.js';

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
        const Image = narrow ? WideIcon : NarrowIcon;
        const text = narrow ? "Wide" : "Narrow"
        const actionText = narrow ? "Switch to wide layout" : "Switch to narrow layout"
        return <button className="square" aria-label={text} onClick={this.handleClick} title={actionText} >
            <Image aria-hidden={true} />
        </button>;
    }
}

if (__debug__) {
    LayoutToggleLink.propTypes = {
        layout: PropTypes.oneOf([LAYOUT_NARROW, LAYOUT_WIDE]).isRequired,
        onSetLayout: PropTypes.func.isRequired,
    };
}

export const ConnectedLayoutToggleLink = connect(state => {
    return {layout: state.layout};
}, {
    onSetLayout: setLayout,
})(LayoutToggleLink);


var fsEnabled, fsElProp, fsChangeEvent, fsErrorEvent, fsExitProp, fsRequestProp;
if ('fullscreenElement' in document) {
    fsEnabled = document.fullscreenEnabled;
    fsElProp = 'fullscreenElement';
    fsChangeEvent = 'fullscreenchange';
    fsErrorEvent = 'fullscreenerror';
    fsExitProp = 'exitFullscreen';
    fsRequestProp = 'requestFullscreen';
} else if ('mozFullScreenElement' in document) { // Firefox.
    fsEnabled = document.mozFullScreenEnabled;
    fsElProp = 'mozFullScreenElement';
    fsChangeEvent = 'mozfullscreenchange';
    fsErrorEvent = 'mozfullscreenerror';
    fsExitProp = 'mozCancelFullScreen';
    fsRequestProp = 'mozRequestFullScreen';
} else if ('webkitFullscreenElement' in document) { // Chrome, WebKit, and Edge.
    fsEnabled = document.webkitFullscreenEnabled;
    fsElProp = 'webkitFullscreenElement';
    fsChangeEvent = 'webkitfullscreenchange';
    fsErrorEvent = 'webkitfullscreenerror';
    fsExitProp = 'webkitExitFullscreen';
    fsRequestProp = 'webkitRequestFullscreen';
} else {
    fsEnabled = false;
}

export class FullscreenToggle extends React.Component {
    constructor(props) {
        super(props);
        this.state = {fullscreen: this.isFullscreen()};
        this.handleChange = event => {
            this.setState({fullscreen: this.isFullscreen()});
        };
        this.handleClick = event => {
            if (this.state.fullscreen) {
                document[fsExitProp]();
            } else {
                document.documentElement[fsRequestProp]();
            }
        };
        this.handleError = event => {
            // TODO: Do this better? How often does this actually happen?
            alert("Failed to go fullscreen.");
        };
    }
    isFullscreen() {
        return document[fsElProp] != null;
    }
    componentDidMount() {
        document.addEventListener(fsChangeEvent, this.handleChange);
        document.addEventListener(fsErrorEvent, this.handleError);
    }
    componentWillUnmount() {
        document.removeEventListener(fsChangeEvent, this.handleChange);
    }
    render() {
        if (!fsEnabled) {
            // Do not display the button when it is unsupported by the browser or otherwise unavailable.
            return null;
        }
        return <button className="square" title="Fullscreen" aria-pressed={this.state.fullscreen} onClick={this.handleClick}>
            {this.state.fullscreen ? <ExitFullscreenIcon aria-hidden={true} /> : <GoFullscreenIcon aria-hidden={true} />}
        </button>;
    }
}


export function HomeIconLink(props) {
    return <RootLink aria-label="Home" title="Go home" className="square"><HomeIcon aria-hidden={true} /></RootLink>;
}


export class GlobalBar extends React.PureComponent {
    render() {
        return <div className="bar">
            {this.props.children}
            <ConnectedLayoutToggleLink />
            <FullscreenToggle />
        </div>;
    }
}


export class Header extends React.PureComponent {
    render() {
        return <React.Fragment>
            {this.props.icon || null}
            <div className="bar expand">
                {this.props.children}
            </div>
        </React.Fragment>;
    }
}

if (__debug__) {
    Header.propTypes = {
        icon: PropTypes.element,
    };
}
