# About page photo gallery

Date: 2026-07-26
Status: implemented 2026-07-28, then amended to use all ten photos — see
"Amendment" at the foot of this document, which supersedes the six photo
selection below.

## Problem

The client supplied a set of photographs in `Images/Pix for Ash/` and wants more of them
used on the site. Ten files were supplied, but they resolve to roughly five distinct
moments: three near-identical frames of a seated group huddle, two near-identical frames
of Paras with her arms open, and one photo (`Paras5.jpeg`) that is already live on the
about page as `assets/img/paras5.webp`.

They are a single cohesive shoot: mountain valley, dry gold grass, cream and fur
textures, overcast sky. All ten are portrait at a uniform 4:5 (4672x5840 or 4094x5117).
The palette sits naturally against the site's cream and clay.

## Decision

Add a staggered photo grid to `about.html` as a new section between the values grid and
the closing CTA. The "Come home to yourself" CTA section stays exactly where it is.

Rejected: replacing the CTA with the gallery. That section is the about page's only
conversion point, carrying the "Book a free call" button immediately before the footer.
Removing it would end a very long story page with no call to action.

Noted but not acted on: the photographs depict a group retreat in the mountains, which
arguably serves the retreats page more directly than the about page. Placement on about
was chosen deliberately.

## Photo selection

Six photos, sequenced wide -> group -> intimate -> solo so the grid reads as a
progression rather than a pile.

| Slot | Source file | Subject |
|---|---|---|
| 1 | `1-image00004.jpeg` | Wide valley, three figures, one standing |
| 2 | `2-image00002.jpeg` | Arms raised, movement, mountain backdrop |
| 3 | `3-image00006.jpeg` | Group of three standing together |
| 4 | `4-image00009.jpeg` | Seated group huddle, tender |
| 5 | `Paras.jpeg` | Paras alone, arms open, full body |
| 6 | `Paras4.jpeg` | Paras alone, mid-shot, quieter |

Excluded: `5-image00019.jpeg` and `6-image00010.jpeg` (duplicate huddle frames),
`Paras1.jpeg` (duplicate arms-open frame), `Paras5.jpeg` (already on the page).

## Image processing

Sharp, resized to 1000x1250, WebP quality 80, written to
`assets/img/about-gallery-01.webp` through `about-gallery-06.webp`.

1000px wide covers a 2x retina display at the ~360px render width of a three column
`max-w-6xl` grid. Expect roughly 120KB per file. Source files stay in `Images/`, which is
gitignored; only the compressed WebP files are committed.

## Markup

New section in `about.html` between the values section and the CTA section, following the
existing house pattern:

- `<section>` with `bg-[var(--cream-2)]` and `border-y border-[var(--border)]`
- inner `<div class="max-w-6xl mx-auto px-5 py-16 md:py-24">`
- no header. No kicker, no heading, no intro paragraph. The photographs carry the
  section on their own and the CTA heading follows immediately below.
- grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6` on a
  `.gallery-grid` class
- each photo is a `<figure class="reveal">` containing an `<img>` with
  `class="w-full aspect-[4/5] object-cover"`, `loading="lazy"`, and explicit
  `width="1000" height="1250"` to prevent layout shift
- after the grid, still inside the inner div:
  `<div class="scroll-cue scroll-cue--inline" aria-hidden="true"><span></span></div>`

## The stagger

One rule added to `css/styles.css`:

```css
@media (min-width: 1024px) {
  .gallery-grid > figure:nth-child(3n+2) { margin-top: 3rem; }
}
```

`margin-top`, not `transform`. The `.reveal` animation sets `transform: translateY(34px)`
and `.is-visible` resets it to `transform: none`, so any transform-based offset on a
`.reveal` element would be wiped the moment the element scrolls into view.

Scoped to 1024px and up because `nth-child(3n+2)` only lands in the middle column while
the grid is three columns wide. Below that it collapses to an even two column or single
column grid with no offset.

The middle column sits 3rem lower in each row, including the last, so the section ends
with the middle column hanging below its neighbours. That asymmetry is intentional.

## Scroll cue

An animated hairline sits below the grid, leading the eye down to the CTA. It reuses the
home hero's `.scroll-cue` idiom rather than introducing a new one.

The existing rule is built for the dark hero: absolutely positioned at `bottom: 2.2rem`,
with a gradient in cream (`rgba(247, 241, 232, .8)`) that would be invisible against the
gallery's cream background. Two things change, via a modifier class so the hero is
untouched:

```css
.scroll-cue--inline { position: static; transform: none; margin: 3.5rem auto 0; width: 1px; }
.scroll-cue--inline span { background: linear-gradient(to bottom, transparent, rgba(44, 30, 21, .45)); }
```

`position: static` puts it in normal flow below the grid instead of pinning it to a
positioned ancestor. The ink gradient makes it visible on cream.

Decorative only: `aria-hidden="true"`, no click behaviour, no JavaScript. The existing
reduced-motion block already disables `.scroll-cue span` animation, and the modifier
inherits that.

## Copy

None. The section has no heading text, so no new i18n keys are added and no Spanish or
Farsi translation work is required.

Alt text is written per photo in English, derived from the Subject column of the photo
selection table, matching how the rest of the site writes alt attributes. Alt text is not
translated, consistent with existing pages.

## Out of scope

No lightbox. The site has no lightbox anywhere, and adding one means new JavaScript,
focus trapping and keyboard handling for what is a six photo strip. Straightforward to
add later if the client asks.

No hover effect on the photographs. They are not links and nothing happens on click, so a
hover state would imply an interaction that does not exist.

The four unused photographs are not processed or committed.

Other pages are not touched.

## Verification

1. `npm run build` completes without error
2. `node scripts/check-i18n-parity.mjs` still passes (no keys were added, so this is a
   regression check rather than a new requirement)
3. Browser pass on the built `_site/about.html` at desktop width: the gallery renders
   between the values grid and the CTA, the middle column is offset, the scroll cue is
   visible against the cream background, and the CTA with its "Book a free call" button
   is still present
4. Browser pass at mobile width: grid collapses to a single column with no offset
5. Deploy to both `origin` and `public-old`, then confirm the live GitHub Pages page
   serves the new section

## Amendment — 2026-07-28: all ten photos

Ash asked for the four excluded photographs to be added. On looking at them again,
two of the three exclusions made on "near-duplicate" grounds do not hold:

- `5-image00019.jpeg` is a tighter frame of the huddle shot direct to camera, not a
  duplicate. It is arguably the strongest of the three huddle frames.
- `Paras1.jpeg` has Paras with her arms open wide and her face lifted, against
  `Paras.jpeg` where she is walking with her head lowered. A different gesture.
- `6-image00010.jpeg` genuinely is a near-duplicate of `4-image00009.jpeg`, the same
  pose with eyes open rather than closed. Included at Ash's request. The two sit
  adjacently so they read as a sequence rather than a repeat.
- `Paras5.jpeg` was excluded because it already appears on this page as the
  story-section background. It still does. It is included at Ash's request as the
  closing photograph.

Ten photographs, resequenced so the grid still reads as one progression:
wide -> group -> huddle (three frames) -> solo (four frames), closing on the tightest
portrait.

| Slot | Source file | Note |
|---|---|---|
| 1 | `1-image00004.jpeg` | |
| 2 | `2-image00002.jpeg` | |
| 3 | `3-image00006.jpeg` | |
| 4 | `4-image00009.jpeg` | |
| 5 | `6-image00010.jpeg` | added |
| 6 | `5-image00019.jpeg` | added |
| 7 | `Paras.jpeg` | |
| 8 | `Paras1.jpeg` | added |
| 9 | `Paras4.jpeg` | |
| 10 | `Paras5.jpeg` | added; reuses `assets/img/paras5.webp` |

Slot 10 points at the existing `assets/img/paras5.webp` rather than a new
`about-gallery-10.webp`. That file is already fetched eagerly higher up the page as
the story background, so showing it again costs nothing. It is 1800x2250, the same
4:5 ratio, so `width`/`height` are set to match and the aspect box is unchanged.

### Orphan row

Ten items in a three column grid strand the tenth in the left column of a fourth row.
One rule handles it:

```css
.gallery-grid > figure:last-child:nth-child(3n+1) { grid-column: 2; margin-top: 3rem; }
```

The `:last-child:nth-child(3n+1)` pair only matches when the final figure starts a row,
so the rule is inert at nine or twelve photographs and needs no maintenance if the count
changes again. The `margin-top` keeps it on the middle column's offset.

At two columns ten items fill five rows exactly, so no orphan handling is needed there.

### Also changed from the spec above

`border-b` rather than `border-y` on the section. The values section directly above
already ends in a `border-b`, and two adjacent 1px rules render as a single 2px line.
