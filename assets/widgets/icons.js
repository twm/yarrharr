import React from 'react';
import './icons.less';

import Add from '../icons/add.svg';
export { Add as Add };

export function Remove(props) {
    return <Add {...props} style={{transform: 'rotate(45deg)'}} />;
}

import Arrow from '../icons/arrow.svg';
export { Arrow as ArrowLeft };
export function ArrowRight(props) {
    return <Arrow {...props} style={{transform: 'rotate(180deg)'}} />;
}

import Home from '../icons/home.svg';
export { Home as Home };

export function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../art/icon.svg')} width="32" height="32" {...props} />;
}

import Check from '../icons/check.svg';
export { Check as Check };

import CheckEmpty from '../icons/check-empty.svg';
export { CheckEmpty as CheckEmpty };

import HeartSVG from '../icons/heart-empty.svg';
export function Heart({empty}) {
    return <HeartSVG className={"icon icon-heart " + (empty ? "icon-empty" : "")} />;
}

import Outbound from '../icons/outbound.svg';
export { Outbound as Outbound };

import Narrow from '../icons/narrow.svg';
export { Narrow as Narrow };

import Wide from '../icons/wide.svg';
export { Wide as Wide };
