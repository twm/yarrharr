import React from 'react';
import { LAYOUT_NARROW, LAYOUT_WIDE } from 'actions.js';
import { ORDER_DATE, ORDER_TAIL } from 'actions.js';

import { Ascending, Descending, Narrow, Wide } from 'widgets/icons.js';
import './ViewControls.less';


export function ViewButton(props) {
    return <ViewControls {...props} />
}

function Toggle(props) {
    const {text, value, callback, current, icon=null} = props;
    const Icon = icon;
    const isSelected = current === value;
    const onClick = isSelected ? null : (event) => {
        event.preventDefault();
        callback(value);
    }
    return <button className="invisible-button" onClick={onClick}>
        <div className="text-button">
            {icon ? <span className={"button" + (isSelected ? " button-active" : "")}><Icon alt="" /></span> : null}
            <span className="text">{text}</span>
        </div>
    </button>;
}

export function ViewControls(props) {
    const {layout=null, onSetLayout=null,
           order=null, onSetOrder=null} = props;
    const children = [];

    if (layout !== null && onSetLayout) {
        children.push(<h2 key="layout-head">Article layout:</h2>);
        children.push(<div key="layout-group" className="group">
            <Toggle callback={onSetLayout} current={layout} value={LAYOUT_NARROW} text="Narrow" icon={Narrow} />
            <Toggle callback={onSetLayout} current={layout} value={LAYOUT_WIDE} text="Wide" icon={Wide} />
        </div>);
    }
    if (order !== null && onSetOrder) {
        children.push(<h2 key="sort-head">How to order articles?</h2>);
        children.push(<div key="sort-group" className="group">
            <Toggle callback={onSetOrder} current={order} value={ORDER_DATE} text="Oldest first" icon={Ascending} />
            <Toggle callback={onSetOrder} current={order} value={ORDER_TAIL} text="Latest first" icon={Descending} />
        </div>);
    }

    return <div className="view-picker" onClick={(event) => {
        event.stopPropagation(); // Don't close the dropdown when buttons are pressed.
    }}>
        {children}
    </div>;
}
