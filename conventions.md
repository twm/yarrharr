# Conventions

This document describes conventions within the Yarrharr codebase.

## Browser Support

The primary target browser is Firefox (current release, not ESR).
Testing in Chrome and Edge is useful as tends to reveal

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
The CSS variable `--layout-max-width` indicates the max-width to apply: ``none`` when the layout is wide, otherwise some value.

For example:

    .box {
        margin: 0 auto;
        max-width: var(--layout-max-width);
        box-sizing: border-box;
        /* You might put padding here, or sub-components may provide it. *
    }

The narrow width may become user-configurable some day.

## Icons

Icons have the form:

    <svg class="icon" width="1em" height="1em" />

Within the SVG, the ``currentColor`` keyword is used so that the icon color can be assigned from CSS like ``.icon { color: blue }``.
Parts of the icon may be assigned classes to allow individual targeting.

There are two icon definition styles:

1. Write a React component in `assets/widgets/icons.js`.
   Really simple, geometric icons are often easiest to write by hand, or generate programatically.
   The [live JSX editor](https://reactjs.org/) on reactjs.org is handy for this.

2. Author the icon in Inkscape.
   It is converted to a React component by [svgr](https://github.com/smooth-code/svgr).
   You'll need to manually add  `viewPort` and `class="icon"` attributes to the SVG source.

Newer icons have `viewBox="0 0 20 20"` while older ones have `viewBox="0 0 48 48"`.
Neither of these seem to work that well: the 20×20 icons tend to look too simplistic, while the 48×48 ones have overly fine features.