import React from 'react';

import Add from '../art/add.svg';
export { Add as Add };

export function Remove(props) {
    return <Add {...props} style={{transform: 'rotate(45deg)'}} />;
}

import Arrow from '../art/arrow.svg';
export { Arrow as ArrowLeft };
export function ArrowRight(props) {
    return <Arrow {...props} style={{transform: 'rotate(180deg)'}} />;
}

import Home from '../art/home.svg';
export { Home as Home };

export function Logo(props) {
    return <img src={window.__webpack_public_path__ + require('../art/icon.svg')} width="32" height="32" {...props} />;
}

import Check from '../art/check.svg';
export { Check as Check };

import CheckEmpty from '../art/check-empty.svg';
export { CheckEmpty as CheckEmpty };

import Heart from '../art/heart.svg';
export { Heart as Heart };

import HeartEmpty from '../art/heart-empty.svg';
export { HeartEmpty as HeartEmpty };

import Outbound from '../art/outbound.svg';
export { Outbound as Outbound };

import Narrow from '../art/narrow.svg';
export { Narrow as Narrow };

import Wide from '../art/wide.svg';
export { Wide as Wide };
