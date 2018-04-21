import React from 'react';
import PropTypes from 'prop-types';
import './icons.less';

const __debug__ = process.env.NODE_ENV !== 'production';

export function IconSprites(props) {
    const w = 20;
    const h = 20;
    const margin = 1;

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
    const roof = `M${margin} ${h - margin - eaveHeight} L${w / 2} ${margin} L${w - margin} ${h - margin - eaveHeight}`;
    const frame = `M${margin + eaveHang} ${eaveHeight - eaveHang} L${margin + eaveHang} ${h - 2} L${w - margin - eaveHang} ${h - 2} L${w - margin - eaveHang} ${eaveHeight - eaveHang}`;

    return <svg id="icon-sprites" aria-hidden={true}>
        <symbol id="icon-home" viewBox="0 0 20 20">
            <path d={frame} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="square" />
            <path d={roof} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </symbol>
        <symbol id="icon-arrow-right" viewBox="0 0 20 20">
            <path d={largeArrow} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </symbol>
        <symbol id="icon-arrow-left" viewBox="0 0 20 20">
            <path d={largeArrow} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" transform={`rotate(180, ${w / 2}, ${h / 2})`} />
        </symbol>
        <symbol id="icon-label" viewBox="0 0 20 20">
            <circle cx="5" cy="5" r="1" fill="currentColor" stroke="none" />
            <path d="M 2 2 h 6 l 10 10 l -6 6 l -10 -10 z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </symbol>
        <symbol id="icon-feed" viewBox="0 0 20 20">
            <circle cx="3" cy="17" r="2" fill="none" stroke="currentColor" strokeWidth="1" />
            <path d="M 4 11 A 6 6, 0, 0, 1, 9 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M 4 6 A 11 11, 0, 0, 1, 14 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M 4 1.5 A 14 14, 0, 0, 1, 18.5 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
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
    </svg>;
};


function makeSpriteIcon(id) {
    return function(props) {
        return <svg width="1em" height="1em" className="icon" {...props}>
            <use xlinkHref={id} />
        </svg>;
    }
}

export const HomeIcon = makeSpriteIcon("#icon-home");
export const ArrowRightIcon = makeSpriteIcon("#icon-arrow-right");
export const ArrowLeftIcon = makeSpriteIcon("#icon-arrow-left");
export const FeedIcon = makeSpriteIcon("#icon-feed");
export const LabelIcon = makeSpriteIcon("#icon-label");
export const OutboundIcon = makeSpriteIcon("#icon-outbound");
export const EditIcon = makeSpriteIcon("#icon-edit");

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
