import React from 'react';
import { VIEW_LIST, VIEW_NARROW, VIEW_WIDE } from 'actions.js';
import { FILTER_NEW, FILTER_SAVED, FILTER_DONE, FILTER_ALL } from 'actions.js';
import { ORDER_DATE, ORDER_TAIL } from 'actions.js';

import DropButton from 'widgets/DropButton.js';
import { Eye, Star, Check, Heart, List, Narrow, Wide } from 'widgets/icons.js';
import './ViewControls.less';


function EyeButton({open}) {
    const className = (open ? "button-active " : "") + "button";
    return <button className={className}><Eye /></button>
}

function ViewButton(props) {
    const {onSetView, onSetFilter=null, onSetOrder=null} = props;
    return <DropButton className="button" trigger={EyeButton}>
        <ViewControls
            onSetView={onSetView}
            onSetFilter={onSetFilter}
            onSetOrder={onSetOrder} />
    </DropButton>;
}

function TextButton(props) {
    const {text, onClick, icon=null} = props;
    const Icon = icon;
    return <button className="invisible-button" onClick={onClick}>
        <div className="text-button">
            {icon ? <span className="button"><Icon alt="" /></span> : null}
            <span className="text">{text}</span>
        </div>
    </button>;
}

function ViewControls({onSetView, onSetFilter=null, onSetOrder=null}) {
    function callback(func, arg) {
        return (event) => {
            event.preventDefault();
            event.stopPropagation();
            func(arg);
        };
    }
    // TODO: Select/disable buttons representing the current selection.

    const children = [];
    if (onSetFilter) {
        children.push(<h2 key="filter-head">Show articles of status:</h2>);
        children.push(<div key="filter-group" className="group">
            <TextButton onClick={callback(onSetFilter, FILTER_NEW)} text="New" icon={Star} />
            <TextButton onClick={callback(onSetFilter, FILTER_SAVED)} text="Saved" icon={Heart} />
            <TextButton onClick={callback(onSetFilter, FILTER_DONE)} text="Done" icon={Check} />
            <TextButton onClick={callback(onSetFilter, FILTER_ALL)} text="All" />
        </div>);
    }
    if (onSetOrder) {
        children.push(<h2 key="sort-head">How to order articles?</h2>);
        children.push(<div key="sort-group" className="group">
            <TextButton onClick={callback(onSetOrder, ORDER_DATE)} text="Oldest first" />
            <TextButton onClick={callback(onSetOrder, ORDER_TAIL)} text="Latest first" />
        </div>);
    }

    return <div className="view-picker">
        <h2>How to display articles?</h2>
        <div className="group">
            <TextButton onClick={callback(onSetView, VIEW_LIST)} text="List" icon={List} />
            <TextButton onClick={callback(onSetView, VIEW_NARROW)} text="Narrow" icon={Narrow} />
            <TextButton onClick={callback(onSetView, VIEW_WIDE)} text="Wide" icon={Wide} />
        </div>
        {children}
    </div>;
}

module.exports = {
    ViewButton,
    ViewControls,
};
