import React from 'react';
import './icons.less';

import Add from '../icons/add.svg';
export { Add as Add };

const STYLE_45 = {transform: 'rotate(45deg)'};

export function Remove(props) {
    return <Add {...props} style={STYLE_45} />;
}

const STYLE_180 = {transform: 'rotate(180deg)'};

export function ArrowLeft(props) {
    return <svg width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" className="icon" {...props}>
        <path d="M 1.5 10 L 19 10 M 9 2 L 1 10 L 9 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>;
}

export function ArrowRight(props) {
    return <ArrowLeft {...props} style={STYLE_180} />;
}

export function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../art/icon.svg')} width="32" height="32" {...props} />;
}


export function Outbound(props) {
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



/*
ReactDOM.render(
    [
        <div><ArrowLeft /></div>,
        <div><ArrowLeft width="250" height="250" /></div>
    ],
    mountNode
)
*/
