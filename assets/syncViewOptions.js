import { setLayout, setOrder, setTheme } from './actions.js';
import { validLayout, validOrder, validTheme } from './actions.js';


/**
 * Persist portions of the store to localStorage so that page reloads don't
 * cause things to shift about.
 *
 * If multiple tabs are open the last one where a setting was changed wins.
 * All of the view options are written to local storage together, so settings
 * from multiple tabs won't get mixed.
 *
 * @param {Store} store Redux store
 * @param {Storage} storage Web storage API implementation
 * @returns {function}
 *          A function which may be called to unsubscribe from the Redux store.
 */
export default function syncViewOptions(store, window) {
    const storage = window.localStorage;

    var layout, order, theme;

    function readFromLocalStorage() {
        var storedLayout = storage.getItem('layout');
        var storedOrder = storage.getItem('order');
        var storedTheme = storage.getItem('theme');

        // If the key is not present in the Storage then we will get null, which
        // will fail the validity check.
        if (validLayout(storedLayout)) {
            store.dispatch(setLayout(storedLayout));
            layout = storedLayout;
        }
        if (validOrder(storedOrder)) {
            store.dispatch(setOrder(storedOrder));
            order = storedOrder;
        }
        if (validTheme(storedTheme)) {
            store.dispatch(setTheme(storedTheme));
            theme = storedTheme;
        }
    }

    readFromLocalStorage();
    window.onstorage = readFromLocalStorage;

    return store.subscribe(function saveToLocalStorage() {
        const state = store.getState();
        if (state.layout !== layout
                || state.snapshot.order !== order
                || state.theme !== theme
        ) {
            layout = state.layout;
            order = state.snapshot.order;
            theme = state.theme;
            if (__debug__) {
                console.log('Writing layout=%s, order=%s, and theme=%s to localStorage', layout, order, theme);
            }
            try {
                storage.setItem('layout', layout);
                storage.setItem('order', order);
                storage.setItem('theme', theme);
            } catch(e) {
                // Safari in private browsing mode?  Oh well.
                if (__debug__) {
                    window.console.log('sync failed: ' + e);
                }
            }
        }
    });
}
