/**
 * @param Store store Redux store
 * @param Window window
 * @returns function
 *          A function which may be called to unsubscribe from the Redux store.
 */
export default function syncLocation(store, window) {
    window.onpopstate = function(event) {
        // TODO
        console.log('onpopstate event', event, document.location);
    };

    return store.subscribe(function pushState() {
        const state = store.getState();
        if (state.route.path !== window.location.pathname) {
            window.history.pushState(null, "", state.route.path);
        }
    });
}
