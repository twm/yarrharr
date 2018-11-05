/**
 * Sync the <html> element class with the store. This is done manually instead
 * of with React because this element exists outside of the React-managed DOM
 * tree.
 */
export default function syncThemeClass(store, html) {
    var theme;

    function writeThemeClass() {
        const state = store.getState();
        if (state.theme === theme)
            return;

        if (theme) {
            html.classList.remove("theme-" + theme);
        }
        theme = state.theme;
        html.classList.add("theme-" + theme);
    }

    writeThemeClass();
    return store.subscribe(writeThemeClass);
}
