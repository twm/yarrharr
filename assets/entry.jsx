// This file is the Webpack entry point to the whole codebase.
import { createStore, combineReducers } from 'redux';
import { Provider, connect } from 'react-redux';
import { Router, Route } from 'react-router';
import { createHistory } from 'history';
import { syncReduxAndRouter, routeReducer } from 'redux-simple-router';
import React from 'react';
import ReactDOM from 'react-dom';
import Yarrharr from "./Yarrharr.jsx";


const reducer = combineReducers({
    // FIXME: Replace this with routing and proper abstractions.
    yarrharrProps: (state = window.props, action) => state,
    routing: routeReducer,
});
const store = createStore(reducer);
const history = createHistory();

syncReduxAndRouter(history, store);

const YarrharrRedux = connect(state => state.yarrharrProps, null)(Yarrharr);

ReactDOM.render(
    <Provider store={store}>
        <Router history={history}>
            <Route path="/" component={YarrharrRedux} />
        </Router>
    </Provider>,
    document.getElementById("app")
);
