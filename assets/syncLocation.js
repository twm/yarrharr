import { setPath } from './actions.js';

/**
 * @param Store store Redux store
 * @param Window window
 * @returns function
 *          A function which may be called to unsubscribe from the Redux store.
 */
export default function syncLocation(store, window) {
    store.dispatch(setPath(window.location.pathname));

    window.onpopstate = function(event) {
        event.preventDefault();
        console.log('onpopstate event', event, window.location.pathname);
        store.dispatch(setPath(window.location.pathname));
    };

    return store.subscribe(function pushState() {
        const state = store.getState();
        if (state.route.path !== window.location.pathname) {
            window.history.pushState(null, "", state.route.path);
        }
    });
}
