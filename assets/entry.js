// This file is the Webpack entry point to the whole codebase.
//
// Two elements are assumed to exist on the page:
//
// * <div id=app /> into which the app is rendered.
// * <script id=props /> containing the initial props as JSON.
//
// If these are missing this file does nothing.
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
import syncThemeClass from './syncThemeClass.jsm';

import { ConnectedRouter } from './router.js'
import { ConnectedYarrharr } from './widgets/Yarrharr.js';
import { IconSprites } from 'widgets/icons.js';
import { FocusVisibleObserver } from 'widgets/FocusVisibleObserver.js';
import { HotWrapper } from 'widgets/HotWrapper.js';
import './art/icon.svg';
import './art/logotype.svg';
import './art/lettertype.svg';
import reducer from './reducer.js';


const middleware = [
    thunk,
];
if (__debug__) {
    // middleware.push(logger);
}

// Only render the app on pages that are run by JS (not, say, login pages).
const appElement = document.getElementById("app");
const propsElement = document.getElementById("props");
if (appElement && propsElement) {
    const preloadedState = window.JSON.parse(propsElement.textContent);
    const store = createStore(reducer, preloadedState, applyMiddleware.apply(null, middleware));

    syncViewOptions(store, window);
    syncThemeClass(store, document.documentElement);
    syncLocation(store, window);

    ReactDOM.render(
        <Provider store={store}>
            <HotWrapper>
                <IconSprites />
                <ConnectedYarrharr>
                    <FocusVisibleObserver>
                        <ConnectedRouter />
                    </FocusVisibleObserver>
                </ConnectedYarrharr>
            </HotWrapper>
        </Provider>,
        appElement
    );
}
