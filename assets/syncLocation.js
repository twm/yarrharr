import { setPath } from './actions.js';

/**
 * @param {Store} store Redux store
 * @param {Window} window
 * @returns {function}
 *          A function which may be called to unsubscribe from the Redux store.
 */
export default function syncLocation(store, window) {
    function windowPath() {
        return window.location.pathname;
    }

    var popPath = windowPath();
    store.dispatch(setPath(popPath));

    window.onpopstate = function(event) {
        // console.log('onpopstate event', windowPath(), event);
        popPath = windowPath();
        store.dispatch(setPath(popPath));
    };

    return store.subscribe(function pushState() {
        const { route } = store.getState();
        // console.log('syncLocation callback called', route);
        if (popPath !== route.path) {
            // Ignore because we are waiting for the change made by popstate to
            // propagate to us.
            //
            // This dance is necessary because our callback may be called more
            // than once following setPath(), as the setPath() call may
            // dispatch multiple events.
            console.log(`ignoring path ${route.path} because popPath is ${popPath}`);
            return;
        }
        if (popPath === route.path) {
            // Ignore because we set this path from popstate. Now we can stop
            // ignoring updates.
            // console.log(`ignoring path change to ${popPath} because the update came from popstate`);
            popPath = null;
            return;
        }
        if (route.path !== windowPath()) {
            // console.log('pushState', windowPath(), '->', route.path);
            window.history.pushState(null, "", route.path);
        }
    });
}
