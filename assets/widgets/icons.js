import React from 'react';
import PropTypes from 'prop-types';
import './icons.less';



export const HEART_PATH = "M1 8.5 a1.5 1.5 0 0 1 -2 0 l-6.5 -6.5 a3.75 3.75 0 0 1 7.5 -7.5 a3.75 3.75 0 0 1 7.5 7.5 z";

export function IconSprites(props) {
    const w = 20;
    const h = 20;

    /**
     * Draw a right-pointing arrow.
     *
     * @param {number} x Horizontal position of the tip of the arrow.
     * @param {number} y Vertical position of the tip of the arrow.
     * @param {number} bar Length of the arrow's shaft.
     * @param {number} a The arrowhead strokes are the hypotenuse of a right isosceles triangle. a is the length of the other two sides.
     */
    const arrow = (x, y, bar, a) =>
        `M ${x} ${y} L ${x - bar} ${y} M ${x - a} ${y - a} L ${x} ${y} L ${x - a} ${y + a}`;

    const largeArrow = arrow(w - 2, h / 2, w - 4, 8);

    const eaveHeight = 10;
    const eaveHang = 2;
    const margin = 2;
    const roof = `M${margin} ${h - margin - eaveHeight} L${w / 2} ${margin} L${w - margin} ${h - margin - eaveHeight}`;
    const frame = `M${margin + eaveHang} ${eaveHeight - eaveHang} L${margin + eaveHang} ${h - 2} L${w - margin - eaveHang} ${h - 2} L${w - margin - eaveHang} ${eaveHeight - eaveHang}`;

    return <svg id="icon-sprites" aria-hidden={true}>
        <defs>
            {/*
            <symbol id="icon-home" viewBox="0 0 20 20">
                <path d={frame} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="square" />
                <path d={roof} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d={"M7.5 17.5 l0 -7 l5 0 l0 7"} fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
            </symbol>
            */}
            <symbol id="icon-prev" viewBox="0 0 20 20">
                <path d={largeArrow} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" transform={`rotate(-90, ${w / 2}, ${h / 2})`}  />
            </symbol>
            <symbol id="icon-next" viewBox="0 0 20 20">
                <path d={largeArrow} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" transform={`rotate(90, ${w / 2}, ${h / 2})`} />
            </symbol>
            <symbol id="icon-label" viewBox="0 0 20 20">
                <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
                <path d="M 2 2 h 6 l 10 10 l -6 6 l -10 -10 z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </symbol>
            <symbol id="icon-feed" viewBox="0 0 20 20">
                <circle cx="6" cy="15" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M 4 8.0 A 08 08, 0, 0, 1, 13 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M 4 3.0 A 13 13, 0, 0, 1, 18 17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </symbol>
            <symbol id="icon-outbound" viewBox="0 0 20 20">
                <path className="arrow" d="M 17.5 2.5 L 9 11 M 10 2 L 18 2 L 18 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path className="box" d="M 14 12 L 14 18 L 2 18 L 2 6 L 9 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </symbol>
            <symbol id="icon-edit" viewBox="0 0 20 20">
                <path d="M 15 1 A 2 2, 0, 0, 1, 18 4 L 17 5 L 14 2 Z" fill="currentColor" stroke="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M 13 3 L 16 6 L 6 16 L 2 17 L 3 13 Z" fill="currentColor" stroke="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M 1 19 L 17 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </symbol>
            <symbol id="icon-heart" viewBox="-10 -10 20 20">
                <path d={HEART_PATH} fill="currentColor" stroke="none" />
            </symbol>
            <symbol id="icon-follow" viewBox="-10 -10 20 20">
                <path d="M -3 -7 l 7 7 l -7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </symbol>
            <symbol id="icon-return" viewBox="-10 -10 20 20">
                <path d="M 3 -7 l -7 7 l 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </symbol>
            <symbol id="icon-sun" viewBox="-10 -10 20 20">
                <circle cx="0" cy="0" r="3" fill="currentColor" stroke="none" />
                <g id="icon-sun-rays">
                    <path d="M 0 6 l 0 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                    <path d="M 0 6 l 0 2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" transform="rotate(45)" />
                </g>
                <use xlinkHref="#icon-sun-rays" transform="rotate(90)" />
                <use xlinkHref="#icon-sun-rays" transform="rotate(180)" />
                <use xlinkHref="#icon-sun-rays" transform="rotate(270)" />
            </symbol>
            <symbol id="icon-moon" viewBox="-10 -10 20 20">
                <path d="M 5 -5 A 6 6 0 1 0 5 5 A 4.25 4.25 0 1 1 5 -5 z" fill="currentColor" stroke="none" transform="rotate(-30)" />
            </symbol>
        </defs>
    </svg>;
};

function makeSpriteIcon(id, className = "icon") {
    const component = function(props) {
        return <svg width="1em" height="1em" {...props}>
            <use xlinkHref={id} />
        </svg>;
    }
    if (__debug__) {
        component.displayName = id;
    }
    component.defaultProps = {className, "aria-hidden": false};
    return component;
}

// export const HomeIcon = makeSpriteIcon("#icon-home");
export const FeedIcon = makeSpriteIcon("#icon-feed");
export const LabelIcon = makeSpriteIcon("#icon-label");
export const OutboundIcon = makeSpriteIcon("#icon-outbound");
export const EditIcon = makeSpriteIcon("#icon-edit");
export const HeartIcon = makeSpriteIcon("#icon-heart", "icon icon-heart");
export const FollowIcon = makeSpriteIcon("#icon-follow");
export const ReturnIcon = makeSpriteIcon("#icon-return");
export const PrevIcon = makeSpriteIcon("#icon-prev");
export const NextIcon = makeSpriteIcon("#icon-next");
export const SunIcon = makeSpriteIcon("#icon-sun");
export const MoonIcon = makeSpriteIcon("#icon-moon");

function fsIcon(props, fullscreen) {
    const s = 20;
    const inset = 3;
    const a = 4;
    // TODO: Could animate this icon by tweening tipInset between these two values.
    const tipInset = fullscreen ? inset : a + inset;
    const path = `
    M ${inset} ${inset + a} L ${tipInset} ${tipInset} L ${inset + a} ${inset}
    M ${s - inset - a} ${s - inset} L ${s - tipInset} ${s - tipInset} L ${s - inset} ${s - inset -a}
    M ${inset} ${s - inset - a} L ${tipInset} ${s - tipInset} L ${inset + a} ${s - inset}
    M ${s - inset - a} ${inset} L ${s - tipInset} ${tipInset} L ${s - inset} ${inset + a}
    `;
    return <svg width="1em" height="1em" viewBox={`0 0 ${s} ${s}`} className="icon" {...props}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

export function GoFullscreenIcon(props) {
    return fsIcon(props, true);
}

export function ExitFullscreenIcon(props) {
    return fsIcon(props, false);
}

/**
 * WideIcon looks like a double-headed arrow, e.g. <->.
 */
export function WideIcon(props) {
    const w = 20;
    const h = 20;
    // Padding around the icon so that it doesn't hit the edge of the viewBox, causing ugly clipping.
    const margin = 2;
    // The arrowhead strokes are the hypotenuse of right isosceles triangles. a is the length of the other two sides.
    const a = 5;
    var path = '';
    // Left arrowhead:
    path += `M ${margin + a} ${(h / 2) - a} L ${margin} ${h / 2} L ${margin + a} ${(h / 2) + a}`;
    // Center bar:
    path += `M ${margin} ${h / 2} L ${w - margin} ${h / 2}`;
    // Right arrowhead:
    path += `M ${w - margin - a} ${(h / 2) - a} L ${w - margin} ${h / 2} L ${w - margin - a} ${(h / 2) + a}`;
    return <svg width="1em" height="1em" viewBox={`0 0 ${w} ${h}`} className="icon" {...props}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

/**
 * NarrowIcon looks like two arrows pointed at one another, e.g.. →←
 */
export function NarrowIcon(props) {
    const w = 20;
    const h = 20;
    // The arrowhead strokes are the hypotenuse of right isosceles triangles. a is the length of the other two sides.
    const a = 5;
    // Length of the arrow bar.
    const bar = 7;

    const arrow = (x, y, xmul) =>
        `M ${x} ${y} L ${x - xmul * bar} ${y} M ${x - a * xmul} ${y - a} L ${x} ${y} L ${x - a * xmul} ${y + a}`;

    var path = arrow(w / 2 - 1.5, h / 2, 1) + arrow(w / 2 + 1.5, h / 2, -1);

    return <svg width="1em" height="1em" viewBox={`0 0 ${w} ${h}`} className="icon" {...props}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

/**
 * AscDescIcon looks like a series of horizontal bars ordered by length. The
 * smallest is at the top for "ascending", and the largest at the top for
 * "descending".
 */
export class AscDescIcon extends React.Component {
    constructor(props) {
        super(props);
        this.raf = null;
        this.start = null;
        this.animationFrame = null;
        this.state = {pos: this.props.ascending ? 0 : 1};
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.ascending === this.props.ascending) {
            return;
        }
        if (this.raf) {
            // Cancel any pending frame.
            window.cancelAnimationFrame(this.raf);
        }
        const start = window.performance.now();
        const duration = 250; // ms

        // console.log('componentWillReceiveProps(%o) this.start=%o start=%o duration=%o', nextProps, this.start, start, duration);
        this.animationFrame = now => {
            var progress = (now - start) / duration;
            if (progress >= 1.0) {
                // console.log('%2s Animation complete start=%o now=%o progress=%o', start, now, progress);
                progress = 1.0;
                this.animationFrame = null;
            }
            const pos = this.props.ascending ? 1.0 - progress : progress;
            // console.log('%2s animationFrame(%.6f) progress=%.3f pos=%.3f', now, progress, pos);
            this.raf =  null;
            this.setState({pos: pos});
        };

        this.animationFrame(start);
        this.raf = window.requestAnimationFrame(this.animationFrame);
    }
    componentDidUpdate(prevProps, prevState) {
        // We have rendered a frame, now schedule another one.
        if (!this.raf && this.animationFrame) {
            this.raf = window.requestAnimationFrame(this.animationFrame);
        }
        // TODO Should have a setTimeout() too in case raf is never called?
    }
    componentWillUnmount() {
        if (this.raf) {
            window.cancelAnimationFrame(this.raf);
        }
    }
    render() {
        const w = 20;
        const h = 20;
        return <svg width="1em" height="1em" viewBox={`0 0 ${w} ${h}`} className={this.props.className || "icon"} >
             <path d={this.buildPath(w, h, this.state.pos)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>;
    }
    buildPath(w, h, pos) {
        const step = 4;
        const halfPi = Math.PI / 2;
        const length = (y) => {
          const progress = y / h;
          const partial = Math.sin(halfPi * progress + halfPi * pos);
          return 4 + (partial * partial * partial * 10);
        };
        var path = '';
        for (let i = 0; i < ((h - 2) / step); i++) {
            let y = 2 + i * step;
            path += `M 2 ${y} l ${length(y)} 0`;
        }
        return path;
    }
}

if (__debug__) {
    AscDescIcon.propTypes = {
        ascending: PropTypes.bool.isRequired,
    };
}

export class GlobeIcon extends React.PureComponent {
    render() {
        // viewBox chosen so that the center of the globe is at (0, 0)
        return <svg width="1em" height="1em" viewBox="-10 -10 20 20" className="icon" {...this.props}>
            <g transform="rotate(30)">
                {/* The globe outline: */}
                <ellipse cx="0" cy="0" rx="7" ry="7" fill="none" stroke="currentColor" strokeWidth="2" />
                {/* Lines on the globe: */}
                <path d="M0,-6.5 A1,2 0 0 0 0,6.5 A1,2 0 0 0 0,-6.5 L0,6.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M-6.5,0 A2,1 0 0 0 6.5,0" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M-6.0,-2 A3,1 0 0 0 6.0,-2" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
                <path d="M-5.0,-4.5 A4,1 0 0 0 5.0,-4.5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </g>
            {/* The globe base:
            <path d="M-4 9 l8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            */}
        </svg>;
    }
}

/* Copy this into https://reactjs.org/


const Icon = AscDescIcon;
ReactDOM.render(
    [
        <div><Icon ascending={true} /><Icon ascending={false} /></div>,
        <div><Icon ascending={true} width="120" height="120" /></div>,
        <div><Icon ascending={false} width="120" height="120" /></div>
    ],
    mountNode
)
*/
