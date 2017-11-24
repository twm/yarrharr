import React from 'react';
import './icons.less';

import Add from '../icons/add.svg';
export { Add as Add };

const STYLE_45 = {transform: 'rotate(45deg)'};

export function Remove(props) {
    return <Add {...props} style={STYLE_45} />;
}

const STYLE_180 = {transform: 'rotate(180deg)'};

import Arrow from '../icons/arrow.svg';
export { Arrow as ArrowLeft };
export function ArrowRight(props) {
    return <Arrow {...props} style={STYLE_180} />;
}

export function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../art/icon.svg')} width="32" height="32" {...props} />;
}

import Outbound from '../icons/outbound.svg';
export { Outbound as Outbound };

import LabelIcon from '../icons/label.svg';
export { LabelIcon as LabelIcon };

export function FeedIcon(props) {
    return <svg x="0" y="0" width="1em" height="1em" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
        <circle cx="3.5" cy="16.5" r="2.5" fill="none" stroke="lightgray" stroke-width="2" />
        <path d="M 1 8 A 11 11, 0, 0, 1, 12 19" fill="none" stroke="lightgray" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <path d="M 1 2 A 17 17, 0, 0, 1, 18 19" fill="none" stroke="lightgray" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
    </svg>;
}
