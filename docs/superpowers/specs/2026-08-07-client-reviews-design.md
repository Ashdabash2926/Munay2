# Client Reviews: a carousel fed by a second sheet tab

**Date:** 2026-08-07
**Page:** `index.html`
**Goal:** Parastoo publishes real client reviews to the home page herself, from the spreadsheet she already uses for retreats, without touching code and without translating anything.

---

## 1. Problem

The home page has a testimonial slot (`index.html:207-220`) holding a placeholder: a quote by Parastoo herself, attributed `— PARASTOO · CLIENT WORDS COMING SOON`, plus a "Read reviews on Google" link pointing at `#`. It is the only social proof on the site, and it currently proves nothing.

She already edits a Google Sheet to publish retreats (see `2026-07-28-upcoming-retreats-design.md`). Reviews should ride the same rails: a second tab in the same spreadsheet, the same Publish button, the same build-time render.

## 2. Solution in one line

The testimonial slot becomes a **sliding carousel of review cards**, generated at build time from a `Reviews` tab in the existing spreadsheet, falling back to the current quote when there are no reviews.

```
Google Sheet "Munay retreats"
   ├── tab: Retreats   → retreats.html      (existing)
   └── tab: Reviews    → index.html carousel (this spec)
        │  she edits rows, then clicks  Munay ▸ Publish to website
        ▼
Apps Script bound to the sheet
   │  validates BOTH tabs; refuses to publish and names the bad row
   │  POSTs the Cloudflare Pages deploy hook
   ▼
Cloudflare Pages build
   │  Eleventy fetches the Reviews tab as CSV, validates, caps at 12
   ▼
Real HTML cards, live in ~1 minute
```

As with retreats, nothing is fetched in the visitor's browser. The reviews are in the HTML source, indexable, and readable by anyone who cannot reach `docs.google.com`.

## 3. Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Where it renders | Replaces the existing testimonial block, in place | Ash's call. Two testimonial-ish sections on one page would compete. |
| Translation | Reviews show **as written**, in all three languages | They are a real person's words. Never put approximate Farsi in a client's mouth. Only the chrome (heading, aria-labels) translates. |
| Layout | Three cards sliding, 1 / 2 / 3 per view | More social proof at a glance than a single rotating quote. |
| Empty state | Falls back to the current static quote | The page never has a hole, and this ships before she adds a single row. |
| Google link | Removed | It pointed at `#`. A dead link is worse than none, and real reviews reduce the need for it. |
| Ordering | Sheet order, top row first | Reviews have no natural sort key. She reorders by dragging rows. |
| Expiry | None | Unlike retreats, a review does not go stale. |
| Review length | Hard cap 400 chars, **rejected** not truncated | Silently cutting a client's sentence in half is worse than asking her to shorten it. The publish button reports the character count. |
| Carousel library | None, vanilla + CSS scroll-snap | House convention (`js/moments-wall.js`, `js/values-constellation.js`). Native scrolling gives mobile swipe for free. |

## 4. The sheet contract

One tab named exactly `Reviews`, one header row, three columns. Header matching is case-insensitive; extra columns are ignored.

| Column | Required | Rule |
|---|---|---|
| **Name** | yes | The reviewer's name, e.g. `Sarah M.` Trimmed, max 60 chars. |
| **Review** | yes | Their words. Trimmed, whitespace collapsed, **max 400 characters** or the row is rejected. |
| **Stars** | yes | An integer 1–5. A data-validation dropdown in the sheet. |

`MAX_REVIEWS = 12`. Extra rows are dropped with a build warning.

Nothing here escapes HTML: Nunjucks autoescapes at render, so `lib/reviews.mjs` only trims, collapses whitespace and validates length.

## 5. Failure behaviour

Deliberately identical to `lib/retreats.mjs`, so both pipelines fail the same way:

| Situation | Behaviour |
|---|---|
| `REVIEWS_SHEET_URL` unset | Returns `[]`, logs a warning, page renders the fallback quote. Local builds and forks work. |
| Sheet unreachable / non-2xx | Retries once, then throws. Build fails, previous deploy stays live. |
| Sheet returns HTML, not CSV (sharing changed) | Sniffed and thrown with that exact cause, before parsing. |
| A required column is missing | Throws. A damaged sheet must not quietly publish an empty section. |
| One bad row | Skipped with a build warning. Her other reviews still publish. |
| Every row bad, or zero rows | Returns `[]` → fallback quote. Not an error: an empty Reviews tab is a legitimate state, unlike a retreats sheet whose date column has lost its format. |

That last row is the one intentional divergence from retreats. Retreats throws on total rejection because a systemic date-format break is detectable and catastrophic. Reviews has no equivalent systemic failure that survives the column check, and an empty tab is the normal starting state.

## 6. Rendering

`index.html`, in the slot the testimonial occupied:

```njk
{% if reviews.length %}   → kicker + heading + carousel
{% else %}                → the existing chakana + static quote, unchanged
{% endif %}
```

Card anatomy, using the existing `.card` style so it sits in the page's design language:

```
┌────────────────────┐
│ ★★★★★              │   5 SVG stars, gold; filled = rating
│                    │   + visually-hidden "5 out of 5 stars"
│ "Their words,      │   font-display, the quote
│  up to 400 chars"  │
│                    │
│ SARAH M.           │   uppercase, tracked, muted
└────────────────────┘
```

Cards in a row are equal height (`flex flex-col`), with the name pinned to the bottom via `mt-auto`.

## 7. Carousel mechanics

`js/reviews-carousel.js`, vanilla, no dependencies.

- **Track**: `overflow-x: auto` with `scroll-snap-type: x mandatory`. Cards are `flex: 0 0 100%` (mobile), `50%` (≥640px), `33.333%` (≥1024px). Mobile swipe is native scrolling, no drag handling.
- **Arrows**: real `<button>`s with translated `aria-label`s. `scrollBy` one viewport width.
- **Dots**: one per *page*, where `perPage` is measured from the real card and track widths on load and on resize, rather than assumed from breakpoints. `aria-current` marks the active page.
- **Active page** is derived from `scrollLeft`, so it stays correct after a swipe as well as after a click.
- **Autoplay**: advances every 7s, wrapping at the end. Pauses on hover and on `focus-within`. Stops permanently on any manual interaction (arrow, dot, swipe). Never starts when there is only one page, or under `prefers-reduced-motion`.
- **RTL**: `html.dir` flips to `rtl` on the Farsi switch **without a page reload**, so scroll direction is resolved at interaction time from `document.documentElement.dir`, never cached at init. Browsers report `scrollLeft` as negative-going in RTL; the code normalises to a positive `0..scrollWidth` progress value in both directions.
- **No JS**: all cards are in the DOM inside a horizontally scrollable track, so without JS the section degrades to a scrollable strip rather than showing only the first card. Arrows and dots are injected by the script and absent without it.

## 8. i18n

Review text and reviewer names render directly and are never keyed. Only chrome goes into `content/i18n/{en,es,fa}.json`:

| Key | English |
|---|---|
| `home.reviews.kicker` | In their words |
| `home.reviews.title` | What people say |
| `home.reviews.prev` | Previous reviews |
| `home.reviews.next` | More reviews |
| `home.reviews.page` | Reviews page |
| `home.reviews.stars.1` … `.5` | 1 out of 5 stars … 5 out of 5 stars |

Five separate star keys rather than one interpolated string, because the i18n runtime substitutes `textContent` wholesale and has no placeholder support. `scripts/check-i18n-parity.mjs` requires all three languages to carry every key.

`home.testimonial.quote` and `home.testimonial.name` stay, since the fallback quote still uses them. `home.testimonial.google` is deleted from all three languages along with the link it labelled.

## 9. Publish button

`docs/retreats-publish.gs` is renamed **`docs/publish.gs`** and validates both tabs, since it now covers more than retreats.

The `Reviews` tab is treated as **optional**: if `getSheetByName('Reviews')` returns null, review validation is skipped silently. This means the script can be pasted before the tab exists, which is the order handover will actually happen in.

Review validation mirrors `lib/reviews.mjs` exactly, in the same way retreats validation already mirrors `lib/retreats.mjs`. Both files carry a comment saying so.

Messages are plain English and name the row:

> Reviews row 4 (Sarah M.): the review is 512 characters. The card fits about 400 — please shorten it.

## 10. Env var and handover

New **`REVIEWS_SHEET_URL`**, a CSV export URL carrying the `Reviews` tab's own `gid`. Set in two places, like `RETREATS_SHEET_URL`:

- Cloudflare Pages → project → Settings → Environment variables
- GitHub repo → Settings → Secrets → Actions

Never committed. `docs/fixtures/reviews-sample.csv` drives `npm run dev` locally.

Manual steps Ash must do:

1. Create the `Reviews` tab with header row `Name | Review | Stars`, and a 1–5 dropdown on Stars.
2. Copy that tab's CSV export URL and set `REVIEWS_SHEET_URL` in both places above.
3. Re-paste `docs/publish.gs` into Extensions → Apps Script.

Until step 2 the site shows the fallback quote, which is a safe resting state.

## 11. Docs

`docs/reviews-sheet-guide.md`, in the same plain-English register as `docs/retreats-sheet-guide.md`: what each column means, how to publish, what happens when something is wrong.

## 12. Tests

`test/reviews.test.mjs`, mirroring `test/retreats.test.mjs`:

- header validation, including case-insensitivity and a missing column throwing
- blank rows skipped, whitespace collapsed
- name and review length limits, including the 400-char rejection
- stars: non-integer, out of range, blank, and `"5"` as a string all handled
- `MAX_REVIEWS` cap and its warning
- unset URL returning `[]`
- HTML-instead-of-CSV sniffing
- retry-once-then-throw on a failing fetch
- the per-process cache, and `resetReviewsCache()`
