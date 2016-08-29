import { setView, setLayout, setOrder, setFilter } from './actions.js';
import { validView, validLayout, validOrder, validFilter } from './actions.js';

const __debug__ = process.env.NODE_ENV !== 'production';

/**
 * Persist portions of the store to localStorage so that page reloads don't
 * cause things to shift about.
 *
 * If multiple tabs are open the last one where a setting was changed wins.
 * All of the view options are written to local storage together, so settings
 * from multiple tabs won't get mixed.
 *
 * @param Store store Redux store
 * @param Storage storage Web storage API implementation
 * @returns function
 *          A function which may be called to unsubscribe from the Redux store.
 */
export default function syncViewOptions(store, storage) {
    var view = storage.getItem('view');
    var layout = storage.getItem('layout');
    var order = storage.getItem('order');
    var filter = storage.getItem('order');

    // If the key is not present in the Storage then we will get null, which
    // will fail the validity check.
    if (validView(view)) {
        store.dispatch(setView(view));
    }
    if (validLayout(layout)) {
        store.dispatch(setLayout(layout));
    }
    if (validOrder(order)) {
        store.dispatch(setOrder(order));
    }
    if (validFilter(filter)) {
        store.dispatch(setFilter(filter));
    }

    return store.subscribe(function saveToLocalStorage() {
        const state = store.getState();
        if (state.view !== view
                || state.layout !== layout
                || state.snapshot.order !== order
                || state.snapshot.filter !== filter
        ) {
            view = state.view;
            layout = state.layout;
            order = state.snapshot.order;
            filter = state.snapshot.filter;
            try {
                storage.setItem('view', view);
                storage.setItem('layout', layout);
                storage.setItem('order', order);
                storage.setItem('filter', filter);
            } catch(e) {
                // Safari in private browsing mode?  Oh well.
                if (__debug__) {
                    window.console.log('sync failed: ' + e);
                }
            }
        }
    });
}
