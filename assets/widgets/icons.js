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
