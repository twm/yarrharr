import { setPath, ORIGIN_POPSTATE } from './actions.js';

/**
 * @param {Store} store Redux store
 * @param {Window} window
 * @returns {function}
 *          A function which may be called to unsubscribe from the Redux store.
 */
export default function syncLocation(store, window) {
    const history = window.history;

    // We use session storage to store the scroll position of each page, keyed
    // by a random identifier formed from a timestamp and a little randomness.
    // The key is set as the "state" on the history entry so that the scroll
    // position can be looked up onpopstate.
    //
    // Why can't we do history.replaceState() to directly save the scroll
    // position? It doesn't seem to work properly after the onpopstate event
    // fires, and if done onscroll it makes scrolling jank something awful.
    const storage = window.sessionStorage;

    // Weirdly, "auto" scroll restoration works fine in Chrome, but not at all
    // in Firefox, so we have to re-implement it. :'(
    history.scrollRestoration = "manual";

    function windowPath() {
        return window.location.pathname;
    }

    // Generate a random identifier for a history entry. This only needs to be
    // unique per-session, so of course this is extreme overkill.
    function makeKey() {
        // Base 36 is used to minimize the key size.
        return 'scroll' + (+Date.now() - 1505970670000).toString(36) + ((Math.random() * 999999) | 0).toString(36);
    }

    // Persist the current window scroll position to session storage.
    function saveScroll(key) {
        storage.setItem(key, JSON.stringify({x: window.scrollX, y: window.scrollY}));
    }

    function getScroll(key) {
        const item = storage.getItem(key);
        // console.log(`key ${key} -> item ${item}`);
        if (item === null) {
            return {};
        }
        try {
            return JSON.parse(item);
        } catch (e) {
            return {};
        }
    }

    var key = history.state || makeKey();
    var popPath = windowPath();
    // scrollX/Y must be null on initial load as the browser restores scroll position.
    const {x = 0, y = 0} = getScroll(key);
    store.dispatch(setPath(popPath, null, null));

    window.onpopstate = function(event) {
        saveScroll(key);
        key = event.state;
        const {x = 0, y = 0} = getScroll(key);
        // console.log(`onpopstate: ${windowPath()} ${key} -> x=${x}, y=${y}`, event);
        popPath = windowPath();
        store.dispatch(setPath(popPath, x, y));
    };

    // Save the scroll state when the page is navigated away from (e.g., an
    // external link is clicked). Use onpagehide instead of the better-known
    // onunload so that we don't force the page to unload, breaking fast
    // back/forward.
    window.onpagehide = function(event) {
        saveScroll(key);
    };

    return store.subscribe(function pushState() {
        const { route } = store.getState();
        // console.log('syncLocation callback called', route);
        if (popPath !== null && popPath !== route.path) {
            // Ignore because we are waiting for the change made by popstate to
            // propagate to us.
            //
            // This dance is necessary because our callback may be called more
            // than once following setPath(), as the setPath() call may
            // dispatch multiple events.
            // console.log(`Ignoring store update with path ${route.path} ${route.origin} because popPath is ${popPath} (waiting for popstate changes to propagate)`);
            return;
        }
        if (popPath === route.path) {
            // Ignore because we set this path from popstate. Now we can stop
            // ignoring updates.
            // console.log(`Not doing pushState for ${popPath} because the update came from popstate`);
            popPath = null;
            return;
        }
        if (route.path !== windowPath()) {
            saveScroll(key);
            key = makeKey();
            // console.log(`pushState(${key}, '', ${route.path})`);
            history.pushState(key, "", route.path);
        }
    });
}
