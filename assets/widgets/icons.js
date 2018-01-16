import React from 'react';
import PropTypes from 'prop-types';
import './icons.less';

const __debug__ = process.env.NODE_ENV !== 'production';

const STYLE_180 = {transform: 'rotate(180deg)'};

export function ArrowLeftIcon(props) {
    return <svg width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="icon" {...props}>
        <path d="M 1.5 10 L 19 10 M 9 2 L 1 10 L 9 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

export function ArrowRightIcon(props) {
    return <ArrowLeftIcon {...props} style={STYLE_180} />;
}

// FIXME this isn't really an icon, so it shouldn't be in this file.
export function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../art/icon.svg')} width="32" height="32" {...props} />;
}

export function OutboundIcon(props) {
     return <svg width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="icon" {...props}>
        <path className="arrow" d="M 17.5 2.5 L 9 11 M 10 2 L 18 2 L 18 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path className="box" d="M 14.5 11 L 14.5 17.5 L 2.5 17.5 L 2.5 5.5 L 9 5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

import LabelIcon from '../icons/label.svg';
export { LabelIcon as LabelIcon };

export function FeedIcon(props) {
    return <svg width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="icon" {...props}>
        <circle cx="3.5" cy="16.5" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M 1 8 A 11 11, 0, 0, 1, 12 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M 1 2 A 17 17, 0, 0, 1, 18 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

export function EditIcon(props) {
    return <svg width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="icon" {...props}>
        <path d="M 15 1 A 2 2, 0, 0, 1, 18 4 L 17 5 L 14 2 Z" fill="currentColor" stroke="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M 13 3 L 16 6 L 6 16 L 2 17 L 3 13 Z" fill="currentColor" stroke="none" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M 1 19 L 19 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

/**
 * WideIcon looks like a double-headed arrow, e.g. <->.
 */
export function WideIcon(props) {
    const w = 20;
    const h = 20;
    // Padding around the icon so that it doesn't hit the edge of the viewBox, causing ugly clipping.
    const margin = 1;
    // The arrowhead strokes are the hypotenuse of right isosceles triangles. a is the length of the other two sides.
    const a = 5;
    var path = '';
    // Left arrowhead:
    path += `M ${margin + a} ${(h / 2) - a} L ${margin} ${h / 2} L ${margin + a} ${(h / 2) + a}`;
    // Center bar:
    path += `M ${margin} ${h / 2} L ${w - margin} ${h / 2}`;
    // Right arrowhead:
    path += `M ${w - margin - a} ${(h / 2) - a} L ${w - margin} ${h / 2} L ${w - margin - a} ${(h / 2) + a}`;
    return <svg width="1em" height="1em" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="icon" {...props}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
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
    const bar = 8;

    const arrow = (x, y, xmul) =>
        `M ${x} ${y} L ${x - xmul * bar} ${y} M ${x - a * xmul} ${y - a} L ${x} ${y} L ${x - a * xmul} ${y + a}`;

    var path = arrow(w / 2 - 1, h / 2, 1) + arrow(w / 2 + 1, h / 2, -1);

    return <svg width="1em" height="1em" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="icon" {...props}>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}


export class AscDescIcon extends React.PureComponent {
    render() {
        const w = 20;
        const h = 20;
        const step = 4;
        const halfPi = Math.PI / 2;
        const length = (y) => {
          const progress = y / h;
          const partial = Math.sin(halfPi * progress + (this.props.ascending ? 0 : halfPi));
          return 4 + (partial * partial * partial * 10);
        };
        var path = '';
        for (let i = 0; i < ((h - 2) / step); i++) {
            let y = 2 + i * step;
            path += `M 2 ${y} l ${length(y)} 0`;
        }
        return <svg width="1em" height="1em" viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" className="icon">
            <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>;
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
