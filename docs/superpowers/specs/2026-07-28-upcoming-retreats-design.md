# Upcoming Retreats: client-updatable section

**Date:** 2026-07-28
**Page:** `retreats.html`
**Goal:** Parastoo publishes her own upcoming retreats after handover, without touching code, without translating anything, and without calling the developer.

---

## 1. Problem

`retreats.html` is currently a page about one specific retreat: the hero, the meta tags and every intro paragraph name "The Way Home", Lake Atitlán and December 17–23 2026. When that date passes the page is stale, and when she runs a second retreat the page contradicts itself. Both are unpaid support calls.

She already builds a standalone landing page per retreat elsewhere (her own Cloudflare Worker, e.g. `https://dry-glade-1220.sahel-naserinasab.workers.dev/`). The site does not need to host retreat detail pages. It needs to *advertise* upcoming retreats and link out.

## 2. Solution in one line

The retreats page becomes evergreen, and a new **Upcoming Retreats** section below the hero is generated at build time from a Google Sheet she edits, published by a button inside that sheet.

```
Google Sheet (owned by Ash, shared to Parastoo as editor)
   │  she edits rows, then clicks  Munay ▸ Publish to website
   ▼
Apps Script bound to the sheet
   │  validates every row; refuses to publish and names the bad row
   │  POSTs a Cloudflare Pages deploy hook
   ▼
Cloudflare Pages build
   │  Eleventy fetches the sheet as CSV, validates, sorts, downloads images
   ▼
Real HTML cards in EN / ES / FA, live in ~1 minute
```

Nothing is fetched in the visitor's browser: the cards exist in the HTML source, are indexable, and render for visitors who cannot reach `docs.google.com`.

## 3. Decisions taken

| Decision | Choice | Why |
|---|---|---|
| Where she edits | Google Sheet | Her request. Familiar, free, no login for her to lose. |
| When it publishes | Button in the sheet only | Her control. No scheduled job. |
| Where it renders | Build time, not browser | SEO, no dependency on Google being reachable from Iran, no empty flash. |
| Canonical host | **Cloudflare Pages** | A deploy hook is a URL that can only start a build. Triggering GitHub Pages would need a repo-write token living in her spreadsheet. |
| Farsi dates | Gregorian with Persian numerals (`fa-IR-u-ca-gregory`) | Matches the English booking page she links to. Jalali would show `۲۶ آذر ۱۴۰۵` for December 17 2026 and disagree with her own landing page. |
| Sheet ownership | Ash owns, shares to her as editor | Survives her deleting it; the one-time Google authorization prompt gets done during handover, not alone at midnight. |
| Expiry | Automatic, client-side | Button-only publishing means she must remember to *add*; it must not also require her to remember to *remove*. |

## 4. The sheet contract

One spreadsheet, one tab named exactly `Retreats`, one header row, eight columns:

| Name | Start | End | Location | Cost | Link | Image | Status |
|---|---|---|---|---|---|---|---|
| The Way Home | 2026-12-17 | 2026-12-23 | Lake Atitlán, Guatemala | $2,200 USD | `https://dry-glade-1220…` | (Drive link) | Open |
| Sacred Valley | 2027-03-28 | 2027-04-03 | Sacred Valley, Peru | From $1,800 | `https://…` | | Waitlist |

**Column rules**

- **Name**: required, ≤ 80 chars. Proper noun, passes through all languages unchanged.
- **Start / End**: required, true date cells with number format `yyyy-mm-dd`, set up in advance with a date-picker data validation rule. The CSV export follows the display format, so the build receives unambiguous ISO. Parser accepts `YYYY-MM-DD` only; anything else fails validation. End must be ≥ Start.
- **Location**: required, ≤ 80 chars, free text. Proper noun, untranslated.
- **Cost**: optional, ≤ 40 chars, free text (`$2,200 USD`, `From $1,800`, `2.200 €`). Rendered verbatim; omitted from the card when blank.
- **Link**: required, must start with `https://`. Opens in a new tab with `rel="noopener noreferrer"`.
- **Image**: optional. Either a direct image URL or a Google Drive share link. Blank falls back to a site image.
- **Status**: optional, dropdown restricted to `Open`, `A few spaces left`, `Waitlist`, `Full`. Rendered as a translated badge. Any value outside the vocabulary renders no badge rather than untranslated text.

**Row handling**

- Rows sort by Start ascending regardless of sheet order.
- Rows whose End is in the past are dropped at build, silently, and before the row is validated. Keeping finished retreats in the sheet is safe even if their other cells have gone stale.
- If no retreat survives and at least one row was rejected because a date cell was present but not `YYYY-MM-DD`, the build throws. That combination means the date column has lost its format, which would otherwise publish a page claiming she has no retreats while she has several. A blank date is treated as a half-typed draft and never fails the build.
- Blank rows are skipped. A row missing any required field is skipped and logged.
- Maximum six cards render; extra rows are ignored (a guard against a pasted block).
- Deleting a row removes the retreat. There is deliberately no "hide" column.

**Access**: the sheet is shared "Anyone with the link → Viewer" so the build can read it without credentials. It contains only marketing information that is published on the site anyway.

## 5. Build-time ingestion

New module **`lib/retreats.mjs`**, exporting `loadRetreats()`:

1. Read `RETREATS_SHEET_URL` from the environment. If unset, return `[]` (local builds and forks render the evergreen empty state rather than failing).
2. Fetch `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Retreats`. Timeout 15s, one retry.
3. Parse with a small RFC 4180 CSV reader (quoted fields, embedded commas and newlines) written inline. No new runtime dependency.
4. **Header assertion:** the header row must contain the eight expected column names, case-insensitively. If it does not, throw. A thrown error fails the build, and Cloudflare Pages keeps the previous successful deployment live. The site cannot degrade into a blank section.
5. Validate, normalize and sort rows per §4. Escape all text at render.
6. Resolve images (§6).
7. Return an array of `{ name, start, end, location, cost, url, image, status, dates: { en, es, fa } }`.

Wired into Eleventy as async global data:

```js
eleventyConfig.addGlobalData("retreats", loadRetreats);
```

**Environment variable**: `RETREATS_SHEET_URL` set as a Cloudflare Pages environment variable (production and preview) and as a GitHub Actions secret, so the GitHub Pages mirror at `ashdabash2926.github.io/Munay2` matches until the canonical domain moves. It is never committed: the mirror repo is public.

**Local development**: `RETREATS_SHEET_URL` may also be a local file path, so `docs/fixtures/retreats-sample.csv` drives `npm run dev` without network access. `node scripts/check-retreats.mjs` prints the parsed and normalized rows for debugging a live sheet from the terminal.

## 6. Images

Her hosting must not be able to break the page, and a 6MB phone photo must not be able to slow it down.

- A Google Drive share link (`drive.google.com/file/d/<ID>/view…` or `…/open?id=<ID>`) is rewritten to `https://drive.google.com/uc?export=download&id=<ID>`. This is a server-side download at build time, so Drive's hotlink restrictions are irrelevant.
- The image is downloaded (15s timeout, 8MB cap), converted with **Sharp** to WebP at a fixed 3:2 aspect, width 1200, quality 82, and written to `_site/assets/img/retreats/<slug>.webp` where `<slug>` derives from the retreat name. The page then serves an image from its own origin.
- Any failure (blank cell, bad URL, timeout, oversize, unsupported format) falls back to `assets/img/RI-1.webp` and logs a warning. It never fails the build and never renders a broken card.
- Sharp is added as a `devDependency`, matching the house convention of pulling it in only when image optimisation is needed.

## 7. Rendering

A new section in `retreats.html` between the hero and the intro:

- Section heading from static translated copy, not from the sheet.
- A responsive grid that reads well at one card (single wide feature) through six (wrapping grid), reusing the existing `.card` and `.reveal` patterns rather than introducing new visual language.
- Each card: image, name, formatted date range, location, cost, status badge, and a call-to-action button linking to her page.
- Field labels (Dates / Where / Investment) come from the i18n dictionary; card values come from the sheet.
- Every card carries `data-retreat-end="YYYY-MM-DD"`.
- The evergreen empty block is always rendered, carrying the `hidden` attribute when at least one card exists.

## 8. Three languages, zero translation work for her

Her four typed values (Name, Location, Cost, Link) are proper nouns, numbers and URLs that are identical in all three languages. The two things that do differ she never writes:

**Dates.** At build, each card's range is formatted three times with `Intl.DateTimeFormat.formatRange`:

| Locale | December 17–23 2026 | Cross-month: March 28 – April 3 2027 |
|---|---|---|
| `en-US` | December 17 – 23, 2026 | March 28 – April 3, 2027 |
| `es-ES` | 17–23 de diciembre de 2026 | 28 de marzo – 3 de abril de 2027 |
| `fa-IR-u-ca-gregory` | ۱۷ تا ۲۳ دسامبر ۲۰۲۶ | ۲۸ مارس تا ۳ آوریل ۲۰۲۷ |

(Output above verified locally on Node 25. `formatRange` and full ICU have shipped in Node since v14, so the GitHub Actions image, Node 22, and the Cloudflare Pages build image both cover it; the implementation should pin `NODE_VERSION` on Cloudflare Pages to match CI.)

The three strings are injected as generated dictionary keys `retreat.dates.<slug>` in `lib/i18n-dict.mjs`, so the existing language switcher swaps them with **no new client-side code** and the build-time English prerender works unchanged. They are keyed by the retreat's slug rather than by its position, so a visitor holding a cached `js/i18n.js` from an earlier build simply misses the key and keeps the prerendered English, instead of being shown a different retreat's dates.

**Status.** A closed four-word vocabulary translated once into `content/i18n/{en,es,fa}.json` as `retreat.status.{open,few,waitlist,full}`.

## 9. Failure modes

| What goes wrong | What the visitor sees | What she has to do |
|---|---|---|
| She types a bad date or a non-https link | Nothing; it never publishes | Fix the row named in the dialog |
| She has no upcoming retreats | Evergreen "new dates announced soon" block | Nothing |
| Every retreat has finished and she forgot | Evergreen block, cards removed client-side | Nothing |
| The sheet is unreachable at build | Previous deploy stays live | Nothing |
| Header row damaged or tab renamed | Previous deploy stays live | Call Ash |
| The date columns lose their `yyyy-mm-dd` format, so every row exports as `12/17/2026` | Previous deploy stays live | Reset the column format, or call Ash |
| Her image host dies | Fallback site image | Nothing |
| Apps Script broken or unauthorized | Publish does nothing | Email Ash to trigger a build |

The data path and the publish path are deliberately independent: the sheet is read as CSV, so if the script breaks, the data still flows on the next build.

## 10. Client-side expiry

A small addition to `js/site.js`: on load, remove any card whose `data-retreat-end` is before today. If no cards remain, unhide the evergreen block and hide the grid. Crawlers see the full published list; humans never see a finished retreat. This is what makes button-only publishing safe.

## 11. Evergreen page copy

Every retreat-specific string is rewritten so nothing on the page can expire. Specifics live only in the cards.

**Meta**: page `<title>`, `<meta name="description">`, `og:title` and `og:description` currently name The Way Home, Lake Atitlán and the December dates. All become general.

**`content/i18n/*.json` keys**

| Key | Now | Becomes |
|---|---|---|
| `retreat.hero.title` | The Way Home | Journeys home to yourself |
| `retreat.hero.subtitle` | A 7-Day Transformational Retreat in Lake Atitlán, Guatemala | Immersive multi-day retreats, held in small groups, in places chosen for their stillness |
| `retreat.hero.dates` | December 17–23, 2026 | *replaced by* `retreat.hero.cue` → Upcoming dates below |
| `retreat.intro.intro1` | "The Way Home is a sacred invitation…" | "Each retreat is a sacred invitation…" |
| `retreat.intro.intro2` | "Nestled in the breathtaking landscapes of Lake Atitlán, Guatemala, this immersive seven-day journey…" | "Held in places chosen for their beauty and stillness, these immersive journeys…" |
| `retreat.intro.intro4` | "This retreat is rooted in the belief…" | "These retreats are rooted in the belief…" |
| `retreat.cta.sub` | "There are limited spaces for this immersion…" | "Spaces are held small and intentional. Reach out to learn more, ask questions, or reserve your place." |
| `retreat.cta.button` | Retreat details & booking | *removed*, see below |

`retreat.hero.kicker`, `retreat.quote`, `retreat.support.*` and `retreat.cta.title` are already general and stay verbatim. Her voice and vocabulary are preserved throughout; only the specifics are lifted out.

**New keys**: `retreat.upcoming.title`, `retreat.upcoming.empty.title`, `retreat.upcoming.empty.body`, `retreat.label.{dates,location,cost,cta}`, `retreat.status.{open,few,waitlist,full}`, plus the generated `retreat.dates.<n>`. They sit inside the existing `retreat` block; the label keys and the generated date keys are kept in separate groups so `retreat.label.dates` and `retreat.dates.1` cannot collide.

**Closing CTA**: the hero and closing CTA no longer point at a single retreat. `site.retreat.bookingUrl` is retired from `content/site.json`, and the closing section keeps only the contact call-to-action. Booking lives on each card, where it belongs.

Spanish and Farsi are updated alongside English, and `node scripts/check-i18n-parity.mjs` must pass.

## 12. The publish button

An Apps Script bound to the sheet, adding a `Munay` menu on open with one item, **Publish to website**:

1. Read every row and validate against §4.
2. If anything is wrong, show a dialog naming each bad row and what is wrong with it, and stop. Nothing is published.
3. If clean, `POST` the Cloudflare Pages deploy hook, read from Script Properties (never hardcoded in the script body).
4. Show "Published. Your changes will be live in about a minute."

Validating in the sheet, where she is looking, is the point: a build-log error she cannot see is a phone call.

Setup, done once by Ash: create the deploy hook in Cloudflare Pages (Settings → Builds & deployments → Deploy hooks, branch `main`), paste it into Script Properties, run the script once to authorize, and walk her through the one-time Google authorization prompt during handover.

## 13. Handover artefact

`docs/retreats-sheet-guide.md`, written for her, not for a developer: what each column means, how to add a retreat, what the dropdown values do, how to publish, and what to do if the dialog complains. One page.

## 14. Out of scope

- Editing retreat copy, prices or photos anywhere other than the sheet.
- Hosting retreat detail pages on this site; she keeps building those herself.
- A past-retreats archive.
- Any change to the existing `site-cms` editor or `cms.config.json`.
- Moving the canonical domain off `ashdabash2926.github.io/Munay2` (tracked separately; this design works on both hosts today).
