import React from 'react';
import { setFilter, FILTER_NEW, FILTER_SAVED, FILTER_DONE, FILTER_ALL } from './actions.js';
import { setOrder, ORDER_DATE, ORDER_TAIL } from './actions.js';

function ViewToolbar({snapshot, dispatch}) {
    return <div>
        <button onClick={() => dispatch(setFilter(FILTER_NEW))}>New</button>
        <button onClick={() => dispatch(setFilter(FILTER_SAVED))}>Saved</button>
        <button onClick={() => dispatch(setFilter(FILTER_DONE))}>Done</button>
        <button onClick={() => dispatch(setFilter(FILTER_ALL))}>All</button>
    </div>;
}

module.exports = ViewToolbar;
