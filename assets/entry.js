// This file is the Webpack entry point to the whole codebase.
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import { logger } from 'redux-logger';
import { Provider } from 'react-redux';
import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';

import './base.less';
import syncViewOptions from './syncViewOptions.js';
import syncLocation from './syncLocation.js';

import { ConnectedRouter } from './router.js'
import { ConnectedYarrharr } from './widgets/Yarrharr.js';
import './art/icon.svg';
import reducer from './reducer.js';

const __debug__ = process.env.NODE_ENV !== 'production';

const middleware = [
    thunk,
];
if (__debug__) {
    //middleware.push(logger);
}
const store = createStore(reducer, applyMiddleware.apply(null, middleware));

syncViewOptions(store, window);
syncLocation(store, window);

// Only render the app on pages that are run by JS (not, say, login pages).
const appElement = document.getElementById("app");
if (appElement) {
    ReactDOM.render(
        <Provider store={store}>
            <ConnectedYarrharr>
                <ConnectedRouter />
            </ConnectedYarrharr>
        </Provider>,
        appElement
    );
}
