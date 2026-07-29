# Values constellation, design

The about page's "What guides this work" section currently lists ten values as a
three-column grid of cards. This replaces that grid with a diagram: the section's
statement at the centre, the ten value names branching off it, each opening to
reveal its description in the centre.

## What stays

All ten names and descriptions are reused exactly as written, in English, Spanish
and Farsi. No copy is added, cut or retranslated. The kicker and the long intro
paragraph keep their place above the diagram.

## Structure

**One semantic structure, two visual presentations.**

Underneath, the section is a plain ten-item disclosure list. Each value is a
`<button>` carrying `aria-expanded` and `aria-controls`, followed by its own
description panel. That is what keyboards and screen readers get, and it is
literally what the phone layout renders. The constellation is a visual
arrangement of the same list, and the centre panel is decorative
(`aria-hidden="true"`): it mirrors whichever description is currently open.

The consequence worth having: if the JavaScript fails to load, the section
degrades to ten working expandable rows rather than to a broken diagram.

Every description lives in the DOM inside its own branch, carrying its
`data-i18n` key. Desktop reads that text into the centre. Mobile reveals it in
place. There is one source of truth per value.

## Desktop layout

Five values down the left, five down the right, each at its own vertical offset,
with SVG connector lines converging on the centre panel. Within each column the
nodes sit at slightly different horizontal positions so the group arcs, which
reads as a fan radiating from the middle.

**Why not a true ring.** A ring puts labels at the top and bottom, the narrowest
part of the layout, where "Trauma-Informed Care" and "Conscious Living" have to
fit. Label widths change in Spanish and Farsi, so a ring that fits in English can
collide in another language, and that only surfaces by checking all three at
every width. Two columns give every label the full horizontal gutter and cannot
overlap, in any language, at any size. The converging lines carry the radial
feeling.

Connector lines are drawn as SVG and redrawn by a `ResizeObserver`, so they track
the layout rather than assuming fixed positions.

`[dir="rtl"]` mirrors the whole stage for Farsi.

## Phone layout

Below the breakpoint the diagram becomes a vertical spine: the statement at the
top, a line descending from it, the ten names branching off one side. Tapping a
name opens its description directly beneath it, where the thumb already is.

This is not a second implementation. It is the same disclosure markup with
different CSS.

## Behaviour

**Hover previews, click locks.** Hovering a name fills the centre, and it empties
on leave. Clicking pins it until that name is clicked again or another is
chosen. Keyboard focus behaves like a click, so tabbing through the ten reads
properly rather than flickering.

Hover is gated behind `(hover: hover) and (pointer: fine)`, so touch devices
never inherit a stuck hover state.

`prefers-reduced-motion: reduce` gets the same layout with no transitions.

## Language switching

`applyLang` rewrites the `textContent` of every `[data-i18n]` element at runtime.
So when a value opens, its `data-i18n` keys are copied onto the centre panel's
elements. A subsequent language change then refills the open centre for free,
with no listener and no cache to invalidate.

## The statement

"You are not broken." moves out of the header position and into the centre of the
diagram, where it is the resting state. It stays an `<h2>`, so the document
outline is unchanged, but it renders smaller than the current 3.1rem to leave
room for a description in a centre panel of roughly 360px. The alternative,
keeping it above and repeating it in the centre, duplicates the line.

## Files

- `about.html` — replace the card grid with the constellation markup, load the script
- `css/styles.css` — constellation styles, both layouts, RTL, reduced motion
- `js/values-constellation.js` — new, vanilla, following the `moments-wall.js` pattern
- `test/values.test.mjs` — new

No changes to `content/i18n/*.json`.

## Tests

Against the built `_site/about.html`:

- ten buttons exist, each `aria-controls` resolving to a panel that exists
- each panel carries the `about.vN.desc` key and each button the `about.vN.name` key
- all twenty keys are present in all three dictionaries
- the old card grid markup is gone
- the centre panel is `aria-hidden`, so its mirrored text is not read twice
