import React from 'react';
import { VIEW_LIST, VIEW_TEXT } from './actions.js';
import { FILTER_NEW, FILTER_SAVED, FILTER_DONE, FILTER_ALL } from './actions.js';
import { ORDER_DATE, ORDER_TAIL } from './actions.js';
import './view-picker.less';


function TextButton(props) {
    return <button className="toolbar-button toolbar-button-text" {...props} />;
}

function ViewControls({snapshot, onSetView, onSetFilter, onSetOrder}) {
    function callback(func, ...args) {
        return (event) => {
            event.preventDefault();
            func(...args);
        };
    }
    // TODO: Select/disable buttons representing the current selection.
    return <span className="view-picker">
        <h2>View</h2>
        <div className="group">
            <TextButton onClick={callback(onSetView, VIEW_LIST)}>List</TextButton>
            <TextButton onClick={callback(onSetView, VIEW_TEXT)}>Full Text</TextButton>
        </div>
        <h2>Filter</h2>
        <div className="group">
            <TextButton onClick={callback(onSetFilter, FILTER_NEW)}>New</TextButton>
            <TextButton onClick={callback(onSetFilter, FILTER_SAVED)}>Saved</TextButton>
            <TextButton onClick={callback(onSetFilter, FILTER_DONE)}>Done</TextButton>
            <TextButton onClick={callback(onSetFilter, FILTER_ALL)}>All</TextButton>
        </div>
        <h2>Sort</h2>
        <div className="group">
            <TextButton onClick={callback(onSetOrder, ORDER_DATE)}>Oldest first</TextButton>
            <TextButton onClick={callback(onSetOrder, ORDER_TAIL)}>Latest first</TextButton>
        </div>
    </span>;
}

module.exports = ViewControls;
