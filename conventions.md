# Conventions

This document describes conventions within the Yarrharr codebase.

## Browser Support

The primary target browser is Firefox (current release, not ESR).
Testing in Chrome and Edge is useful as tends to reveal bugs.
Internet Explorer is not supported.
I do not test in Safari or iOS as I lack the appropriate hardware.

## JavaScript Features

The project only targets [browsers which natively support ES2015 syntax and &lt;script type="module"&gt;](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/).
Specifically:

* Firefox ≥ 54
* Chrome ≥ 60
* Edge ≥ 15

This is ensured via Babel transformations as specified in [./.babelrc](.babelrc).

## CSS Features

The following are okay to use:

* Flexbox (`display: flex`, `flex-*` properties)
* Grid layout (`display: grid`, `grid-*` properties, `fr` unit, `display: content`)
* Variables a.k.a. custom properties (`--foo: 1rem`, `font-size: var(--foo)`)

Use of [CSS containment](https://www.w3.org/TR/css-contain-1/) may speed up layout in long lists, but be sure to test in Chrome as [it is the only browser with support at the time of this writing](https://caniuse.com/#feat=css-containment).

## Units

New CSS should use the rem unit for all things.
Old CSS is converted at a ratio of 16px to 1 rem.

## Page Layout

The page is a stack of full-width boxes:

    +-----------------------------------+
    |                                   |
    +-----------------------------------+
    |                                   |
    +-----------------------------------+
    |                                   |
    |                                   |
    |                                   |
    |                                   |
    +-----------------------------------+

There are two layouts: wide and narrow.
The wide layout flexes according to the width of the window.
The narrow layout assigns a max-width to each box, and flexes down when the window is narrower than that.

Each box in the stack has a max-width assigned individually, allowing each box to apply padding as necessary or appropriate.
The CSS variable `--layout-max-width` indicates the max-width to apply when a non-flexible is appropriate (e.g. forms and such).

For example:

    .box {
        margin: 0 auto;
        max-width: var(--layout-max-width);
        box-sizing: border-box;
        /* You might put padding here, or sub-components may provide it. */
    }

The narrow width may become user-configurable some day.

## Links

A regular link like this will display with an underline:

    <a href="#">...</a>

To disable the underline use the ``no-underline`` class.
The ``underline`` class can be used to re-add the underline in a specific location:

    <a class="no-underline">
        <svg class="icon" width="1em" height="1em" />
        <span class="underline">...</a>
    </a>

A link may be styled as a button using the ``text-button`` class:

    <a class="text-button text-button-primary">...</a>

## Icons

Icons have the form:

    <svg class="icon" width="1em" height="1em" />

Within the SVG, the ``currentColor`` keyword is used so that the icon color can be assigned from CSS like ``.icon { color: blue }``.
Parts of the icon may be assigned classes to allow individual targeting.

There are two icon definition styles:

1. A simple React component in `assets/widgets/icons.js`.
   Really simple, geometric icons are often easiest to write by hand, or generate programmatically.

2. A React component which references a symbol defined in the `IconSprites` (again in `icons.js`).

All icons are drawn on a 20×20 grid.
This is generally defined as`viewBox="0 0 20 20"` or `viewBox="-10 -10 20 20"`.
The latter form is useful for symmetrical icons, as 0,0 is the center of the icon.

The [live JSX editor](https://reactjs.org/) on reactjs.org can be useful when authoring icons.
When build in development mode by `make webpack`, Yarrharr includes a page which list all of the icons at `/debug/`.
