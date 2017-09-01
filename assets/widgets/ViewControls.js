import React from 'react';
import { LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';

import { Narrow, Wide } from 'widgets/icons.js';
import './ViewControls.less';


function Toggle(props) {
    const {text, value, callback, current, icon=null} = props;
    const Icon = icon;
    const isSelected = current === value;
    const onClick = isSelected ? null : (event) => {
        event.preventDefault();
        callback(value);
    }
    return <a className="text-button" aria-role="button" href="#" aria-disabled={!isSelected} tabIndex={isSelected ? -1 : 0} onClick={onClick}>
        <span className={"button" + (isSelected ? " button-active" : "")}><Icon alt="" /></span>
        <span className="text">{text}</span>
    </a>;
}

export function ViewControls(props) {
    const {layout, onSetLayout} = props;
    const children = [];

    return <span className="view-controls">
        <Toggle callback={onSetLayout} current={layout} value={LAYOUT_NARROW} text="Narrow" icon={Narrow} />
        <Toggle callback={onSetLayout} current={layout} value={LAYOUT_WIDE} text="Wide" icon={Wide} />
    </span>;
}
