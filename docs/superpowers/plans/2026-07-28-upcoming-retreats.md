# Upcoming Retreats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parastoo publishes her own upcoming retreats from a Google Sheet she edits, and the retreats page stops naming any single retreat, so it never goes stale.

**Architecture:** A build-time data module reads her sheet as CSV, validates it, downloads and self-hosts each photo, and hands Eleventy an array of retreats. `retreats.html` renders them as cards through Nunjucks. Date ranges are formatted at build into all three languages and injected as generated i18n dictionary keys, so the existing language switcher swaps them with no new client code. A small script in the sheet validates her rows and pings a Cloudflare Pages deploy hook.

**Tech Stack:** Eleventy 3 (Nunjucks), vanilla JS, Sharp for image conversion, `node --test` for tests, Google Apps Script for the publish button.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-28-upcoming-retreats-design.md` is authoritative. Read it before Task 1.
- **No em dashes and no emojis** in any prose, comment, commit message or copy you write. Use commas, parentheses, colons or separate sentences.
- **No new runtime dependencies.** Sharp is a `devDependency`, used at build only. The CSV parser is written by hand.
- **Nunjucks autoescapes** in Eleventy. Never HTML-escape values inside `lib/retreats.mjs`; sanitising there means trimming, collapsing whitespace and length-capping only.
- **i18n key namespace:** all new keys live under `retreat.*` (singular), matching the existing block. Generated per-card date keys are `retreat.dates.1` through `retreat.dates.6`.
- **The build must fail loudly on a malformed sheet.** A thrown error means Cloudflare Pages keeps the previous deployment live. Never swallow a header or fetch error into an empty page.
- **A bad row must never fail the build.** Skip it, push a warning, carry on.
- **Dates are compared as ISO strings** (`"2026-12-23" < "2027-01-01"`). Never construct a `Date` for comparison.
- **Farsi dates use `fa-IR-u-ca-gregory`** (Gregorian calendar, Persian numerals), never the default `fa-IR`, which would render the Jalali calendar.
- The repo has no test framework yet. Task 1 adds `node --test`. Every later task's tests go in `test/`.

---

### Task 1: Test harness and CSV parser

**Files:**
- Create: `lib/retreats.mjs`
- Create: `test/retreats.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `COLUMNS: string[]` (the eight lowercase column names in order) and `parseCsv(text: string) => string[][]`, a RFC 4180 reader handling quoted fields, embedded commas, escaped quotes, embedded newlines and CRLF.

- [ ] **Step 1: Add the test script**

In `package.json`, add to `scripts`:

```json
"test": "node --test test/"
```

- [ ] **Step 2: Write the failing test**

Create `test/retreats.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, COLUMNS } from "../lib/retreats.mjs";

test("COLUMNS lists the eight sheet columns in order", () => {
  assert.deepEqual(COLUMNS, ["name", "start", "end", "location", "cost", "link", "image", "status"]);
});

test("parseCsv reads a plain row", () => {
  assert.deepEqual(parseCsv("a,b,c\n1,2,3"), [["a", "b", "c"], ["1", "2", "3"]]);
});

test("parseCsv keeps commas inside quoted fields", () => {
  assert.deepEqual(parseCsv('name,location\nThe Way Home,"Lake Atitlan, Guatemala"'),
    [["name", "location"], ["The Way Home", "Lake Atitlan, Guatemala"]]);
});

test("parseCsv unescapes doubled quotes", () => {
  assert.deepEqual(parseCsv('a\n"She said ""yes"""'), [["a"], ['She said "yes"']]);
});

test("parseCsv keeps newlines inside quoted fields", () => {
  assert.deepEqual(parseCsv('a,b\n"one\ntwo",three'), [["a", "b"], ["one\ntwo", "three"]]);
});

test("parseCsv handles CRLF and a trailing newline", () => {
  assert.deepEqual(parseCsv("a,b\r\n1,2\r\n"), [["a", "b"], ["1", "2"]]);
});

test("parseCsv keeps empty trailing fields", () => {
  assert.deepEqual(parseCsv("a,b,c\n1,,"), [["a", "b", "c"], ["1", "", ""]]);
});
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, cannot find module `../lib/retreats.mjs`.

- [ ] **Step 4: Write the parser**

Create `lib/retreats.mjs`:

```js
// Upcoming retreats, read from a Google Sheet at build time.
// Spec: docs/superpowers/specs/2026-07-28-upcoming-retreats-design.md
//
// Nothing here escapes HTML: Nunjucks autoescapes at render. Sanitising here
// means trimming, collapsing whitespace and capping length.

/** The eight columns the sheet must have, lowercased. */
export const COLUMNS = ["name", "start", "end", "location", "cost", "link", "image", "status"];

/**
 * Minimal RFC 4180 CSV reader. Google's CSV export quotes any field holding a
 * comma, a quote or a newline, so those three cases are the ones that matter.
 */
export function parseCsv(text) {
  const src = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c !== '"') { field += c; continue; }
      if (src[i + 1] === '"') { field += '"'; i++; continue; }
      quoted = false;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npm test`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json lib/retreats.mjs test/retreats.test.mjs
git commit -m "Retreats: CSV reader and a node --test harness"
```

---

### Task 2: Trilingual date range formatting

**Files:**
- Modify: `lib/retreats.mjs`
- Modify: `test/retreats.test.mjs`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `formatDateRange(startISO: string, endISO: string) => { en: string, es: string, fa: string }`. Both arguments are `YYYY-MM-DD`. A single-day retreat returns one formatted date rather than a range.

- [ ] **Step 1: Write the failing test**

Append to `test/retreats.test.mjs` (and add `formatDateRange` to the import at the top of the file):

```js
test("formatDateRange renders a same-month range in three languages", () => {
  assert.deepEqual(formatDateRange("2026-12-17", "2026-12-23"), {
    en: "December 17 – 23, 2026",
    es: "17–23 de diciembre de 2026",
    fa: "۱۷ تا ۲۳ دسامبر ۲۰۲۶",
  });
});

test("formatDateRange renders a range that crosses a month", () => {
  assert.deepEqual(formatDateRange("2027-03-28", "2027-04-03"), {
    en: "March 28 – April 3, 2027",
    es: "28 de marzo – 3 de abril de 2027",
    fa: "۲۸ مارس تا ۳ آوریل ۲۰۲۷",
  });
});

test("formatDateRange renders a single day without a range", () => {
  assert.deepEqual(formatDateRange("2026-12-17", "2026-12-17"), {
    en: "December 17, 2026",
    es: "17 de diciembre de 2026",
    fa: "۱۷ دسامبر ۲۰۲۶",
  });
});

test("formatDateRange uses the Gregorian calendar for Farsi, not Jalali", () => {
  // The Jalali rendering of this date would be ۲۶ آذر ۱۴۰۵, which would not
  // match the English booking page she links out to.
  assert.match(formatDateRange("2026-12-17", "2026-12-23").fa, /۲۰۲۶/);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, `formatDateRange` is not exported.

- [ ] **Step 3: Implement the formatter**

Append to `lib/retreats.mjs`:

```js
// Gregorian with Persian numerals for Farsi: the default fa-IR calendar is
// Jalali, which would disagree with the English booking page she links to.
const LOCALES = { en: "en-US", es: "es-ES", fa: "fa-IR-u-ca-gregory" };
const DATE_OPTS = { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" };

/** Format an ISO date range into every site language. */
export function formatDateRange(startISO, endISO) {
  const start = new Date(`${startISO}T00:00:00Z`);
  const end = new Date(`${endISO}T00:00:00Z`);
  const out = {};
  for (const [lang, locale] of Object.entries(LOCALES)) {
    const fmt = new Intl.DateTimeFormat(locale, DATE_OPTS);
    out[lang] = start.getTime() === end.getTime() ? fmt.format(start) : fmt.formatRange(start, end);
  }
  return out;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS, 11 tests.

If a string differs by a space or dash character, trust the runtime and correct the expected value in the test, then note the correction in the commit message. Do not hand-build the strings to force a match.

- [ ] **Step 5: Commit**

```bash
git add lib/retreats.mjs test/retreats.test.mjs
git commit -m "Retreats: format date ranges into EN, ES and FA at build time"
```

---

### Task 3: Row validation, sorting, expiry and the header guard

**Files:**
- Modify: `lib/retreats.mjs`
- Modify: `test/retreats.test.mjs`

**Interfaces:**
- Consumes: `COLUMNS`, `formatDateRange` from Tasks 1 and 2.
- Produces:
  - `MAX_CARDS = 6`
  - `buildRetreats(rows: string[][], { today: string }) => { retreats: Retreat[], warnings: string[] }` where `Retreat` is `{ name, start, end, location, cost, url, imageSource, statusKey, dates }`, `statusKey` is `"open" | "few" | "waitlist" | "full" | null`, and `dates` is the object from `formatDateRange`. Throws if the header row is missing a column.

- [ ] **Step 1: Write the failing test**

Append to `test/retreats.test.mjs` (add `buildRetreats` and `MAX_CARDS` to the import):

```js
const HEADER = ["Name", "Start", "End", "Location", "Cost", "Link", "Image", "Status"];
const row = (over = {}) => {
  const base = {
    name: "The Way Home", start: "2026-12-17", end: "2026-12-23",
    location: "Lake Atitlan, Guatemala", cost: "$2,200 USD",
    link: "https://example.com/way-home", image: "", status: "Open",
  };
  const merged = { ...base, ...over };
  return COLUMNS.map((c) => merged[c]);
};
const build = (rows, today = "2026-07-28") => buildRetreats([HEADER, ...rows], { today });

test("buildRetreats maps a good row onto a retreat", () => {
  const { retreats, warnings } = build([row()]);
  assert.equal(warnings.length, 0);
  assert.equal(retreats.length, 1);
  assert.deepEqual(retreats[0], {
    name: "The Way Home",
    start: "2026-12-17",
    end: "2026-12-23",
    location: "Lake Atitlan, Guatemala",
    cost: "$2,200 USD",
    url: "https://example.com/way-home",
    imageSource: "",
    statusKey: "open",
    dates: formatDateRange("2026-12-17", "2026-12-23"),
  });
});

test("buildRetreats throws when a column is missing", () => {
  assert.throws(() => buildRetreats([["Name", "Start", "End"]], { today: "2026-07-28" }),
    /missing the "location" column/);
});

test("buildRetreats throws on an empty sheet", () => {
  assert.throws(() => buildRetreats([], { today: "2026-07-28" }), /empty/);
});

test("buildRetreats accepts headers in any case or order", () => {
  const shuffled = ["STATUS", "link", "Image", "cost", "Location", "End", "Start", "NAME"];
  const cells = shuffled.map((h) => {
    const v = { name: "A", start: "2026-12-17", end: "2026-12-23", location: "Peru",
                cost: "", link: "https://example.com/a", image: "", status: "" };
    return v[h.toLowerCase()];
  });
  const { retreats } = buildRetreats([shuffled, cells], { today: "2026-07-28" });
  assert.equal(retreats[0].name, "A");
  assert.equal(retreats[0].location, "Peru");
});

test("buildRetreats sorts by start date, not sheet order", () => {
  const { retreats } = build([
    row({ name: "Later", start: "2027-03-28", end: "2027-04-03" }),
    row({ name: "Sooner" }),
  ]);
  assert.deepEqual(retreats.map((r) => r.name), ["Sooner", "Later"]);
});

test("buildRetreats drops retreats that have already finished", () => {
  const { retreats } = build([row({ name: "Gone", start: "2026-01-01", end: "2026-01-07" }), row()]);
  assert.deepEqual(retreats.map((r) => r.name), ["The Way Home"]);
});

test("buildRetreats keeps a retreat that is running today", () => {
  const { retreats } = build([row({ start: "2026-07-20", end: "2026-07-28" })], "2026-07-28");
  assert.equal(retreats.length, 1);
});

test("buildRetreats skips a blank row silently", () => {
  const { retreats, warnings } = build([COLUMNS.map(() => ""), row()]);
  assert.equal(retreats.length, 1);
  assert.equal(warnings.length, 0);
});

test("buildRetreats skips and reports a row with a bad date", () => {
  const { retreats, warnings } = build([row({ start: "17/12/2026" })]);
  assert.equal(retreats.length, 0);
  assert.match(warnings[0], /Row 2/);
  assert.match(warnings[0], /17\/12\/2026/);
});

test("buildRetreats skips a row whose link is not https", () => {
  const { retreats, warnings } = build([row({ link: "www.example.com" })]);
  assert.equal(retreats.length, 0);
  assert.match(warnings[0], /https/);
});

test("buildRetreats skips a row with an end before its start", () => {
  const { retreats, warnings } = build([row({ start: "2026-12-23", end: "2026-12-17" })]);
  assert.equal(retreats.length, 0);
  assert.match(warnings[0], /end is before start/);
});

test("buildRetreats skips a row with no name or no location", () => {
  assert.equal(build([row({ name: "" })]).retreats.length, 0);
  assert.equal(build([row({ location: "" })]).retreats.length, 0);
});

test("buildRetreats maps every status word to a key", () => {
  const statuses = ["Open", "A few spaces left", "waitlist", "FULL"];
  const keys = statuses.map((s) => build([row({ status: s })]).retreats[0].statusKey);
  assert.deepEqual(keys, ["open", "few", "waitlist", "full"]);
});

test("buildRetreats renders no badge for an unknown status but keeps the row", () => {
  const { retreats, warnings } = build([row({ status: "Nearly gone!" })]);
  assert.equal(retreats[0].statusKey, null);
  assert.match(warnings[0], /Nearly gone!/);
});

test("buildRetreats treats a blank status as no badge and no warning", () => {
  const { retreats, warnings } = build([row({ status: "" })]);
  assert.equal(retreats[0].statusKey, null);
  assert.equal(warnings.length, 0);
});

test("buildRetreats trims, collapses whitespace and caps length", () => {
  const { retreats } = build([row({ name: `  A${" ".repeat(4)}B  `, cost: "x".repeat(60) })]);
  assert.equal(retreats[0].name, "A B");
  assert.equal(retreats[0].cost.length, 40);
});

test("buildRetreats caps the number of cards and says so", () => {
  const many = Array.from({ length: 9 }, (_, i) =>
    row({ name: `R${i}`, start: `2026-1${i % 2}-01`, end: `2026-1${i % 2}-05` }));
  const { retreats, warnings } = build(many);
  assert.equal(retreats.length, MAX_CARDS);
  assert.match(warnings.at(-1), new RegExp(`only the first ${MAX_CARDS}`));
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, `buildRetreats` is not exported.

- [ ] **Step 3: Implement the builder**

Append to `lib/retreats.mjs`:

```js
/** Never render more than this, however many rows she pastes in. */
export const MAX_CARDS = 6;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// The dropdown vocabulary in the sheet, mapped to i18n key suffixes so the
// badge text stays translatable and she never types a word we cannot render.
const STATUS_KEYS = new Map([
  ["open", "open"],
  ["a few spaces left", "few"],
  ["waitlist", "waitlist"],
  ["full", "full"],
]);

const clean = (value, max) => String(value ?? "").trim().replace(/\s+/g, " ").slice(0, max);

/**
 * Turn parsed CSV rows into retreats, newest last.
 *
 * Throws when the sheet itself is wrong (empty, or a column missing), because a
 * damaged sheet should fail the build and leave the previous deploy live. A bad
 * single row is skipped with a warning instead: her other retreats still publish.
 *
 * @param {string[][]} rows  parsed CSV, header row first
 * @param {{today: string}} options  today as YYYY-MM-DD, for expiry
 */
export function buildRetreats(rows, { today }) {
  if (!rows.length) throw new Error("The retreats sheet is empty (no header row).");

  const header = rows[0].map((h) => clean(h, 40).toLowerCase());
  for (const column of COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`The retreats sheet is missing the "${column}" column.`);
    }
  }
  const at = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)]));

  const warnings = [];
  const retreats = [];

  rows.slice(1).forEach((cells, i) => {
    const line = i + 2; // 1-based, and the header is row 1
    const raw = Object.fromEntries(COLUMNS.map((c) => [c, clean(cells[at[c]], 500)]));
    if (!Object.values(raw).some(Boolean)) return; // blank row

    const problems = [];
    if (!raw.name) problems.push("the name is empty");
    if (!raw.location) problems.push("the location is empty");
    if (!ISO_DATE.test(raw.start)) problems.push(`the start date "${raw.start}" is not YYYY-MM-DD`);
    if (!ISO_DATE.test(raw.end)) problems.push(`the end date "${raw.end}" is not YYYY-MM-DD`);
    if (ISO_DATE.test(raw.start) && ISO_DATE.test(raw.end) && raw.end < raw.start) {
      problems.push("the end is before start");
    }
    if (!/^https:\/\//i.test(raw.link)) problems.push(`the link "${raw.link}" must start with https://`);
    if (problems.length) {
      warnings.push(`Row ${line}: ${problems.join(", ")}. Row skipped.`);
      return;
    }

    if (raw.end < today) return; // finished, drop it

    const statusKey = STATUS_KEYS.get(raw.status.toLowerCase()) ?? null;
    if (raw.status && !statusKey) {
      warnings.push(`Row ${line}: status "${raw.status}" is not one of ` +
        `${[...STATUS_KEYS.keys()].join(", ")}. No badge shown.`);
    }

    retreats.push({
      name: clean(raw.name, 80),
      start: raw.start,
      end: raw.end,
      location: clean(raw.location, 80),
      cost: clean(raw.cost, 40),
      url: raw.link,
      imageSource: raw.image,
      statusKey,
      dates: formatDateRange(raw.start, raw.end),
    });
  });

  retreats.sort((a, b) => a.start.localeCompare(b.start) || a.name.localeCompare(b.name));
  if (retreats.length > MAX_CARDS) {
    warnings.push(`${retreats.length} upcoming retreats in the sheet, only the first ${MAX_CARDS} are shown.`);
  }
  return { retreats: retreats.slice(0, MAX_CARDS), warnings };
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm test`
Expected: PASS, 27 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/retreats.mjs test/retreats.test.mjs
git commit -m "Retreats: validate, sort, expire and cap the sheet rows"
```

---

### Task 4: Images, self-hosted and unbreakable

**Files:**
- Modify: `lib/retreats.mjs`
- Modify: `test/retreats.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `FALLBACK_IMAGE = "assets/img/RI-1.webp"`
  - `normalizeImageUrl(url: string) => string` (a Google Drive share link becomes a direct download URL; a non-http value becomes `""`)
  - `slugify(name: string, index: number) => string`
  - `resolveImage(sourceUrl, slug, { outDir, fetchImpl?, warnings? }) => Promise<string>` returning a site-relative path, always. Never throws.

- [ ] **Step 1: Add Sharp**

Run: `npm install --save-dev sharp`

Sharp is a build-time dependency only, matching the house convention of pulling it in when image optimisation is needed.

- [ ] **Step 2: Write the failing test**

Append to `test/retreats.test.mjs` (add `normalizeImageUrl`, `slugify`, `resolveImage`, `FALLBACK_IMAGE` to the import, and these imports at the top of the file):

```js
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
```

```js
test("normalizeImageUrl rewrites a Google Drive share link", () => {
  assert.equal(
    normalizeImageUrl("https://drive.google.com/file/d/1AbC-dEf_2/view?usp=sharing"),
    "https://drive.google.com/uc?export=download&id=1AbC-dEf_2");
  assert.equal(
    normalizeImageUrl("https://drive.google.com/open?id=1AbC-dEf_2"),
    "https://drive.google.com/uc?export=download&id=1AbC-dEf_2");
});

test("normalizeImageUrl passes a direct image URL through", () => {
  assert.equal(normalizeImageUrl("https://example.com/a.jpg"), "https://example.com/a.jpg");
});

test("normalizeImageUrl rejects anything that is not a URL", () => {
  assert.equal(normalizeImageUrl(""), "");
  assert.equal(normalizeImageUrl("my photo.jpg"), "");
});

test("slugify makes a filesystem-safe, collision-free name", () => {
  assert.equal(slugify("The Way Home", 1), "the-way-home-1");
  assert.equal(slugify("Atitlán / Guatemala!", 2), "atitlan-guatemala-2");
  assert.equal(slugify("سفر", 3), "retreat-3");
});

test("resolveImage downloads, converts to webp and returns a site path", async () => {
  const dir = await mkdtemp(join(tmpdir(), "retreats-"));
  const png = await sharp({ create: { width: 40, height: 40, channels: 3, background: "#bf5f3a" } })
    .png().toBuffer();
  const fetchImpl = async () => ({ ok: true, status: 200, arrayBuffer: async () => png });

  const path = await resolveImage("https://example.com/a.png", "way-home-1", { outDir: dir, fetchImpl });

  assert.equal(path, "assets/img/retreats/way-home-1.webp");
  const written = await readFile(join(dir, path));
  assert.equal((await sharp(written).metadata()).format, "webp");
  await rm(dir, { recursive: true, force: true });
});

test("resolveImage falls back and warns when the download fails", async () => {
  const warnings = [];
  const fetchImpl = async () => { throw new Error("boom"); };
  const path = await resolveImage("https://example.com/a.png", "way-home-1",
    { outDir: "/nonexistent", fetchImpl, warnings });
  assert.equal(path, FALLBACK_IMAGE);
  assert.match(warnings[0], /way-home-1/);
});

test("resolveImage falls back quietly when the cell is blank", async () => {
  const warnings = [];
  assert.equal(await resolveImage("", "a-1", { outDir: "/nonexistent", warnings }), FALLBACK_IMAGE);
  assert.equal(warnings.length, 0);
});

test("resolveImage refuses an oversized file", async () => {
  const warnings = [];
  const fetchImpl = async () => ({ ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(9e6) });
  const path = await resolveImage("https://example.com/big.jpg", "big-1",
    { outDir: "/nonexistent", fetchImpl, warnings });
  assert.equal(path, FALLBACK_IMAGE);
  assert.match(warnings[0], /8MB/);
});
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, `normalizeImageUrl` is not exported.

- [ ] **Step 4: Implement the image pipeline**

Add to the top of `lib/retreats.mjs`:

```js
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
```

and append:

```js
/** Used whenever her own image is missing, unreachable or unusable. */
export const FALLBACK_IMAGE = "assets/img/RI-1.webp";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 15000;

/**
 * Turn whatever she pasted into something we can download server-side.
 * Drive's hotlink restrictions do not apply here: this runs at build time and
 * the bytes end up hosted on her own site.
 */
export function normalizeImageUrl(url) {
  const value = String(url ?? "").trim();
  if (!value) return "";
  const drive = value.match(/drive\.google\.com\/(?:file\/d\/([\w-]+)|.*[?&]id=([\w-]+))/);
  if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1] || drive[2]}`;
  return /^https?:\/\//i.test(value) ? value : "";
}

/** A stable, unique filename per card. The index guarantees no collisions. */
export function slugify(name, index) {
  const base = String(name).toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "retreat"}-${index}`;
}

/**
 * Download her photo, convert it to a uniform WebP and serve it from our own
 * origin. Any failure returns the fallback photo: a broken image URL in the
 * sheet must never break the page or the build.
 */
export async function resolveImage(sourceUrl, slug, { outDir, fetchImpl = fetch, warnings = [] }) {
  const url = normalizeImageUrl(sourceUrl);
  if (!url) {
    if (String(sourceUrl ?? "").trim()) {
      warnings.push(`Image for "${slug}" is not a usable URL. Using the fallback photo.`);
    }
    return FALLBACK_IMAGE;
  }
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS), redirect: "follow" });
    if (!res.ok) throw new Error(`the host replied ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(`${(bytes.byteLength / 1e6).toFixed(1)}MB is over the 8MB limit`);
    }
    const rel = `assets/img/retreats/${slug}.webp`;
    const dest = join(outDir, rel);
    await mkdir(dirname(dest), { recursive: true });
    await sharp(bytes).resize(1200, 800, { fit: "cover", position: "attention" })
      .webp({ quality: 82 }).toFile(dest);
    return rel;
  } catch (err) {
    warnings.push(`Image for "${slug}" could not be used (${err.message}). Using the fallback photo.`);
    return FALLBACK_IMAGE;
  }
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npm test`
Expected: PASS, 34 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/retreats.mjs test/retreats.test.mjs
git commit -m "Retreats: download, convert and self-host each retreat photo"
```

---

### Task 5: Loading the sheet

**Files:**
- Modify: `lib/retreats.mjs`
- Modify: `test/retreats.test.mjs`
- Create: `docs/fixtures/retreats-sample.csv`
- Create: `docs/fixtures/retreats-empty.csv`
- Create: `scripts/check-retreats.mjs`

**Interfaces:**
- Consumes: `parseCsv`, `buildRetreats`, `resolveImage`, `slugify`.
- Produces:
  - `loadRetreats({ url?, outDir?, today? } = {}) => Promise<Retreat[]>` where each retreat gains `image` (a site-relative path) and `index` (1-based). Memoised for the life of the process.
  - `resetRetreatsCache()` for tests.
  - Reads `RETREATS_SHEET_URL` from the environment when no `url` is passed. A value that does not start with `http` is read from disk, which is how the fixtures drive local builds.

- [ ] **Step 1: Create the fixtures**

Create `docs/fixtures/retreats-sample.csv`. The Image column is deliberately blank so tests and offline builds never touch the network:

```csv
Name,Start,End,Location,Cost,Link,Image,Status
The Way Home,2026-12-17,2026-12-23,"Lake Atitlan, Guatemala",$2200 USD,https://dry-glade-1220.sahel-naserinasab.workers.dev/,,Open
Sacred Valley,2027-03-28,2027-04-03,"Sacred Valley, Peru",From $1800,https://example.com/sacred-valley,,Waitlist
Finished Retreat,2026-01-05,2026-01-11,"Somewhere, Nowhere",$1000,https://example.com/old,,Full
```

Create `docs/fixtures/retreats-empty.csv`:

```csv
Name,Start,End,Location,Cost,Link,Image,Status
```

- [ ] **Step 2: Write the failing test**

Append to `test/retreats.test.mjs` (add `loadRetreats` and `resetRetreatsCache` to the import):

```js
test("loadRetreats reads a local fixture and resolves images", async () => {
  resetRetreatsCache();
  const dir = await mkdtemp(join(tmpdir(), "retreats-build-"));
  const retreats = await loadRetreats({
    url: "docs/fixtures/retreats-sample.csv", outDir: dir, today: "2026-07-28",
  });
  assert.deepEqual(retreats.map((r) => r.name), ["The Way Home", "Sacred Valley"]);
  assert.deepEqual(retreats.map((r) => r.index), [1, 2]);
  assert.equal(retreats[0].image, FALLBACK_IMAGE);
  assert.equal(retreats[0].dates.en, "December 17 – 23, 2026");
  await rm(dir, { recursive: true, force: true });
});

test("loadRetreats returns nothing when the sheet has only a header", async () => {
  resetRetreatsCache();
  assert.deepEqual(await loadRetreats({ url: "docs/fixtures/retreats-empty.csv", today: "2026-07-28" }), []);
});

test("loadRetreats returns nothing when no sheet is configured", async () => {
  resetRetreatsCache();
  const previous = process.env.RETREATS_SHEET_URL;
  delete process.env.RETREATS_SHEET_URL;
  assert.deepEqual(await loadRetreats(), []);
  if (previous !== undefined) process.env.RETREATS_SHEET_URL = previous;
});

test("loadRetreats memoises so one build makes one request", async () => {
  resetRetreatsCache();
  const first = await loadRetreats({ url: "docs/fixtures/retreats-sample.csv", today: "2026-07-28" });
  const second = await loadRetreats({ url: "docs/fixtures/retreats-empty.csv", today: "2026-07-28" });
  assert.equal(second, first);
  resetRetreatsCache();
});
```

- [ ] **Step 3: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, `loadRetreats` is not exported.

- [ ] **Step 4: Implement the loader**

Add `readFile` to the `node:fs/promises` import at the top of `lib/retreats.mjs`, then append:

```js
const SHEET_TIMEOUT_MS = 15000;

let cached = null;

/** Test hook. The cache is per process, so a build fetches the sheet once. */
export function resetRetreatsCache() {
  cached = null;
}

async function fetchSheet(url, attempt = 1) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(SHEET_TIMEOUT_MS), redirect: "follow" });
    if (!res.ok) throw new Error(`the sheet replied ${res.status}`);
    return await res.text();
  } catch (err) {
    if (attempt < 2) return fetchSheet(url, attempt + 1);
    throw new Error(`Could not read the retreats sheet: ${err.message}`);
  }
}

/**
 * The whole pipeline: fetch, parse, validate, resolve images.
 *
 * A missing RETREATS_SHEET_URL renders the evergreen empty state, so a local
 * build or a fork still works. A sheet that is reachable but damaged throws,
 * which fails the build and leaves the previous deploy live.
 *
 * `url` may be a local path, which is how docs/fixtures/*.csv drive npm run dev.
 */
export async function loadRetreats({
  url = process.env.RETREATS_SHEET_URL,
  outDir = "_site",
  today = new Date().toISOString().slice(0, 10),
} = {}) {
  if (cached) return cached;
  cached = (async () => {
    if (!url) {
      console.warn("[retreats] RETREATS_SHEET_URL is not set, rendering the empty state.");
      return [];
    }
    const text = /^https?:/i.test(url) ? await fetchSheet(url) : await readFile(url, "utf8");
    const { retreats, warnings } = buildRetreats(parseCsv(text), { today });

    const resolved = [];
    for (const [i, retreat] of retreats.entries()) {
      const image = await resolveImage(retreat.imageSource, slugify(retreat.name, i + 1), { outDir, warnings });
      resolved.push({ ...retreat, image, index: i + 1 });
    }

    for (const warning of warnings) console.warn(`[retreats] ${warning}`);
    console.log(`[retreats] ${resolved.length} upcoming retreat(s).`);
    return resolved;
  })();
  return cached;
}
```

- [ ] **Step 5: Run the test and watch it pass**

Run: `npm test`
Expected: PASS, 38 tests.

- [ ] **Step 6: Add the debugging script**

Create `scripts/check-retreats.mjs`:

```js
// Print what the site would render from a retreats sheet, without a build.
//
//   node scripts/check-retreats.mjs                       (uses RETREATS_SHEET_URL)
//   node scripts/check-retreats.mjs docs/fixtures/retreats-sample.csv

import { loadRetreats } from "../lib/retreats.mjs";

const url = process.argv[2] || process.env.RETREATS_SHEET_URL;
if (!url) {
  console.error("No sheet. Pass a path or URL, or set RETREATS_SHEET_URL.");
  process.exit(1);
}

try {
  const retreats = await loadRetreats({ url, outDir: ".retreats-check" });
  if (!retreats.length) console.log("No upcoming retreats. The page would show the evergreen block.");
  for (const r of retreats) {
    console.log(`\n${r.index}. ${r.name}`);
    console.log(`   ${r.dates.en}`);
    console.log(`   ${r.dates.es}`);
    console.log(`   ${r.dates.fa}`);
    console.log(`   ${r.location}${r.cost ? ` · ${r.cost}` : ""}${r.statusKey ? ` · ${r.statusKey}` : ""}`);
    console.log(`   ${r.url}`);
    console.log(`   image: ${r.image}`);
  }
} catch (err) {
  console.error(`\nThe build would FAIL and the previous deploy would stay live:\n  ${err.message}`);
  process.exit(1);
}
```

- [ ] **Step 7: Verify the script**

Run: `node scripts/check-retreats.mjs docs/fixtures/retreats-sample.csv`
Expected: two retreats printed with dates in three languages, and no "Finished Retreat".

Then run: `rm -rf .retreats-check`

- [ ] **Step 8: Commit**

```bash
git add lib/retreats.mjs test/retreats.test.mjs docs/fixtures scripts/check-retreats.mjs
git commit -m "Retreats: load the sheet, with fixtures and a check script"
```

---

### Task 6: Wire the data into Eleventy and the dictionary

**Files:**
- Modify: `eleventy.config.mjs:9-12` (global data) and `:36-38` (the transform)
- Modify: `lib/i18n-dict.mjs`
- Modify: `i18n.11ty.js:42-49`
- Modify: `test/retreats.test.mjs`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `loadRetreats`, `resetRetreatsCache`.
- Produces: an Eleventy global `retreats` (the array from `loadRetreats`), and dictionary keys `retreat.dates.1` through `retreat.dates.N` in all three languages. `buildDict()` becomes **async** and both of its callers must await it.

- [ ] **Step 1: Write the failing test**

Append to `test/retreats.test.mjs` (add `import { buildDict } from "../lib/i18n-dict.mjs";` at the top):

```js
test("buildDict injects one date key per card in every language", async () => {
  resetRetreatsCache();
  const previous = process.env.RETREATS_SHEET_URL;
  process.env.RETREATS_SHEET_URL = "docs/fixtures/retreats-sample.csv";

  const dict = await buildDict();
  assert.equal(dict.en["retreat.dates.1"], "December 17 – 23, 2026");
  assert.equal(dict.es["retreat.dates.1"], "17–23 de diciembre de 2026");
  assert.equal(dict.fa["retreat.dates.1"], "۱۷ تا ۲۳ دسامبر ۲۰۲۶");
  assert.ok(dict.en["retreat.dates.2"]);
  assert.equal(dict.en["retreat.dates.3"], undefined);
  // the hand-written keys still load
  assert.ok(dict.en["nav.retreats"]);

  if (previous === undefined) delete process.env.RETREATS_SHEET_URL;
  else process.env.RETREATS_SHEET_URL = previous;
  resetRetreatsCache();
});
```

Note: this test uses today's real date, so it depends on the fixture's 2026 and 2027 retreats still being in the future. If the plan is executed after December 2026, bump the fixture dates and the expected strings together.

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, `dict.en["retreat.dates.1"]` is undefined (`buildDict` is still synchronous and knows nothing about retreats).

- [ ] **Step 3: Make the dictionary async and retreat-aware**

In `lib/i18n-dict.mjs`, add the import and replace the `buildDict` export:

```js
import { loadRetreats } from "./retreats.mjs";
```

```js
export async function buildDict() {
  const dict = {};
  for (const lang of ["en", "es", "fa"]) {
    const flat = flatten(JSON.parse(readFileSync(`content/i18n/${lang}.json`, "utf8")));
    for (const k of Object.keys(flat)) {
      if (k.endsWith(".word")) {
        flat[k.slice(0, -".word".length)] = flat[k];
        delete flat[k];
      }
    }
    dict[lang] = flat;
  }

  // One generated key per upcoming retreat card, so the existing language
  // switcher swaps its date range with no extra client-side code.
  const retreats = await loadRetreats();
  for (const lang of ["en", "es", "fa"]) {
    for (const retreat of retreats) {
      dict[lang][`retreat.dates.${retreat.index}`] = retreat.dates[lang];
    }
  }
  return dict;
}
```

Also update the file's top comment: the dictionary now carries generated retreat date keys as well as the hand-written ones.

- [ ] **Step 4: Update both callers**

In `i18n.11ty.js`, make `render` async:

```js
  async render() {
    const dict = await buildDict();
    return `/* Parastoo — trilingual dictionary (EN / ES / FA) + language switcher.
   GENERATED FILE — edit content/i18n/*.json instead. */

const I18N = ${JSON.stringify(dict, null, 2)};
` + RUNTIME;
  }
```

In `eleventy.config.mjs`, make the transform async and await the dictionary. Keep it a `function`, not an arrow, so `this.page` still works:

```js
  eleventyConfig.addTransform("i18n-prerender", async function (content) {
    if (!(this.page.outputPath || "").endsWith(".html")) return content;
    const en = (await buildDict()).en;
```

- [ ] **Step 5: Expose the retreats to templates**

In `eleventy.config.mjs`, add the import at the top:

```js
import { loadRetreats } from "./lib/retreats.mjs";
```

and register the global data next to the existing `site` global:

```js
  // Upcoming retreats, read from the client's Google Sheet at build time.
  // Unset RETREATS_SHEET_URL renders the evergreen empty state; a damaged
  // sheet throws, which fails the build and leaves the last deploy live.
  eleventyConfig.addGlobalData("retreats", () => loadRetreats());
```

- [ ] **Step 6: Ignore the check script's scratch directory**

Add to `.gitignore`:

```
.retreats-check/
```

- [ ] **Step 7: Run the tests and a real build**

Run: `npm test`
Expected: PASS, 39 tests.

Run: `RETREATS_SHEET_URL=docs/fixtures/retreats-sample.csv npm run build`
Expected: the build succeeds and logs `[retreats] 2 upcoming retreat(s).`

Run: `grep -c "retreat.dates.1" _site/js/i18n.js`
Expected: at least 1 (three, in fact: one per language).

- [ ] **Step 8: Commit**

```bash
git add eleventy.config.mjs lib/i18n-dict.mjs i18n.11ty.js test/retreats.test.mjs .gitignore
git commit -m "Retreats: expose the sheet data to Eleventy and the i18n dictionary"
```

---

### Task 7: Evergreen copy and the new strings

**Files:**
- Modify: `content/i18n/en.json`, `content/i18n/es.json`, `content/i18n/fa.json`
- Create: `test/copy.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: the keys `retreat.upcoming.title`, `retreat.upcoming.empty.title`, `retreat.upcoming.empty.body`, `retreat.label.dates`, `retreat.label.location`, `retreat.label.cost`, `retreat.label.cta`, `retreat.status.open`, `retreat.status.few`, `retreat.status.waitlist`, `retreat.status.full`, `retreat.hero.cue`. Removes `retreat.hero.dates` and `retreat.cta.button`. Task 8 consumes all of these.

- [ ] **Step 1: Write the failing test**

Create `test/copy.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const LANGS = ["en", "es", "fa"];
const load = (lang) => JSON.parse(readFileSync(`content/i18n/${lang}.json`, "utf8"));

const NEW_KEYS = [
  ["hero", "cue"],
  ["upcoming", "title"],
  ["label", "dates"], ["label", "location"], ["label", "cost"], ["label", "cta"],
  ["status", "open"], ["status", "few"], ["status", "waitlist"], ["status", "full"],
];

test("every language has the new retreat keys", () => {
  for (const lang of LANGS) {
    const retreat = load(lang).retreat;
    for (const [group, key] of NEW_KEYS) {
      assert.ok(retreat[group]?.[key], `${lang}: retreat.${group}.${key} is missing`);
    }
    assert.ok(retreat.upcoming.empty.title, `${lang}: empty.title is missing`);
    assert.ok(retreat.upcoming.empty.body, `${lang}: empty.body is missing`);
  }
});

test("the retired single-retreat keys are gone", () => {
  for (const lang of LANGS) {
    const retreat = load(lang).retreat;
    assert.equal(retreat.hero.dates, undefined, `${lang}: retreat.hero.dates still exists`);
    assert.equal(retreat.cta.button, undefined, `${lang}: retreat.cta.button still exists`);
  }
});

test("no retreat copy names a specific retreat, place or date", () => {
  // This is the whole point of the page rewrite: anything specific belongs in
  // the sheet, so the page cannot go stale and cost the developer a call.
  const banned = [/\b(19|20)\d{2}\b/, /atitl/i, /آتیتلان/, /guatemala/i, /گواتمالا/,
                  /the way home/i, /el camino a casa/i, /راه خانه/, /seven-day/i,
                  /siete días/i, /7 روزه/];
  for (const lang of LANGS) {
    const walk = (node, path) => {
      if (typeof node === "string") {
        for (const pattern of banned) {
          assert.ok(!pattern.test(node), `${lang}: ${path} still says "${node}"`);
        }
        return;
      }
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    };
    walk(load(lang).retreat, "retreat");
  }
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL on all three tests.

- [ ] **Step 3: Rewrite the English copy**

In `content/i18n/en.json`, inside the `retreat` object:

Replace `hero.title`, `hero.subtitle`, delete `hero.dates` and add `hero.cue`:

```json
"hero": {
  "kicker": "Retreats & immersions",
  "title": "Journeys home to yourself",
  "subtitle": "Immersive multi-day retreats, held in small groups, in places chosen for their stillness",
  "cue": "Upcoming dates below"
}
```

Replace `intro.intro1`, `intro.intro2` and `intro.intro4` (leave `intro3` and `intro5` exactly as they are):

```json
"intro1": "Each retreat is a sacred invitation to step away from the noise of everyday life and reconnect with the deepest truth of who you are.",
"intro2": "Held in places chosen for their beauty and stillness, these immersive journeys are designed for those who feel called to live with greater authenticity, purpose, freedom, and alignment.",
"intro4": "These retreats are rooted in the belief that many of us are not lacking purpose; rather, we have become disconnected from it beneath layers of conditioning, fear, societal expectations, and survival patterns."
```

Replace `cta.sub` and delete `cta.button`:

```json
"cta": {
  "title": "The journey home is calling.",
  "sub": "Spaces are held small and intentional. Reach out to learn more, ask questions, or reserve your place."
}
```

Add two new blocks inside `retreat`:

```json
"upcoming": {
  "title": "Upcoming retreats",
  "empty": {
    "title": "New dates are being held",
    "body": "The next journey is being prepared. Reach out to hear about dates before they are announced."
  }
},
"label": {
  "dates": "Dates",
  "location": "Where",
  "cost": "Investment",
  "cta": "Details & booking"
},
"status": {
  "open": "Open",
  "few": "A few spaces left",
  "waitlist": "Waitlist",
  "full": "Full"
}
```

`retreat.quote`, `retreat.support.*` and `retreat.cta.title` are already general and stay exactly as they are.

- [ ] **Step 4: Rewrite the Spanish copy**

Same structure in `content/i18n/es.json`:

```json
"hero": {
  "kicker": "Retiros e inmersiones",
  "title": "Viajes de regreso a ti",
  "subtitle": "Retiros inmersivos de varios días, en grupos pequeños, en lugares elegidos por su quietud",
  "cue": "Próximas fechas abajo"
}
```

```json
"intro1": "Cada retiro es una invitación sagrada a alejarte del ruido de la vida cotidiana y reconectarte con la verdad más profunda de quién eres.",
"intro2": "Celebrados en lugares elegidos por su belleza y quietud, estos viajes inmersivos están diseñados para quienes se sienten llamadas a vivir con mayor autenticidad, propósito, libertad y alineación.",
"intro4": "Estos retiros están enraizados en la creencia de que muchas de nosotras no carecemos de propósito; más bien, nos hemos desconectado de él bajo capas de condicionamiento, miedo, expectativas sociales y patrones de supervivencia."
```

```json
"cta": {
  "title": "El viaje a casa te está llamando.",
  "sub": "Los espacios se mantienen pequeños e intencionales. Contáctame para saber más, hacer preguntas o reservar tu lugar."
},
"upcoming": {
  "title": "Próximos retiros",
  "empty": {
    "title": "Se están preparando nuevas fechas",
    "body": "El próximo viaje se está gestando. Escríbeme para conocer las fechas antes de que se anuncien."
  }
},
"label": {
  "dates": "Fechas",
  "location": "Dónde",
  "cost": "Inversión",
  "cta": "Detalles y reservas"
},
"status": {
  "open": "Abierto",
  "few": "Quedan pocos lugares",
  "waitlist": "Lista de espera",
  "full": "Completo"
}
```

- [ ] **Step 5: Rewrite the Farsi copy**

Same structure in `content/i18n/fa.json`:

```json
"hero": {
  "kicker": "ریتریت‌ها و غوطه‌وری‌ها",
  "title": "سفرهایی به سوی خانهٔ درون",
  "subtitle": "ریتریت‌های چندروزهٔ غوطه‌ورکننده، در گروه‌های کوچک، در مکان‌هایی برگزیده به خاطر سکوتشان",
  "cue": "تاریخ‌های پیش‌رو در ادامه"
}
```

```json
"intro1": "هر ریتریت دعوتی مقدس است برای دور شدن از سروصدای زندگی روزمره و اتصال مجدد با عمیق‌ترین حقیقت کسی که هستی.",
"intro2": "این سفرهای غوطه‌ورکننده که در مکان‌هایی برگزیده به خاطر زیبایی و سکوتشان برگزار می‌شوند، برای کسانی طراحی شده‌اند که احساس می‌کنند به زیستن با اصالت، هدف، آزادی و همسویی بیشتر فراخوانده می‌شوند.",
"intro4": "این ریتریت‌ها بر این باور ریشه دارند که بسیاری از ما فاقد هدف نیستیم؛ بلکه زیر لایه‌های شرطی‌سازی، ترس، انتظارات اجتماعی و الگوهای بقا از آن جدا شده‌ایم."
```

```json
"cta": {
  "title": "سفر خانه صدایت می‌کند.",
  "sub": "ظرفیت‌ها کوچک و آگاهانه نگه داشته می‌شوند. برای کسب اطلاعات بیشتر، پرسیدن سؤال یا رزرو جایت تماس بگیر."
},
"upcoming": {
  "title": "ریتریت‌های پیش‌رو",
  "empty": {
    "title": "تاریخ‌های تازه در راه است",
    "body": "سفر بعدی در حال آماده‌سازی است. تماس بگیر تا پیش از اعلام عمومی از تاریخ‌ها باخبر شوی."
  }
},
"label": {
  "dates": "تاریخ",
  "location": "مکان",
  "cost": "هزینه",
  "cta": "جزئیات و رزرو"
},
"status": {
  "open": "باز",
  "few": "چند جای باقی‌مانده",
  "waitlist": "لیست انتظار",
  "full": "تکمیل"
}
```

The Spanish and Farsi here are AI-written, consistent with the rest of the site, and carry the same caveat already recorded in `README.md`: no fluent speaker has reviewed them.

- [ ] **Step 6: Run the tests and the parity check**

Run: `npm test`
Expected: PASS, 42 tests.

Run: `node scripts/check-i18n-parity.mjs`
Expected: no missing or extra keys across the three languages.

- [ ] **Step 7: Commit**

```bash
git add content/i18n test/copy.test.mjs
git commit -m "Retreats copy: evergreen page text, plus strings for the upcoming section"
```

---

### Task 8: Render the section

**Files:**
- Modify: `retreats.html` (head at `:6-11`, hero dates line at `:37-38`, new section after `:40`, closing CTA at `:119-125`)
- Modify: `content/site.json` (remove the `retreat` block)
- Modify: `README.md:40`
- Create: `test/build.test.mjs`

**Interfaces:**
- Consumes: the `retreats` global from Task 6 (`name`, `location`, `cost`, `url`, `image`, `end`, `statusKey`, `index`) and the i18n keys from Task 7.
- Produces: `#retreatGrid` containing one `<article data-retreat-end="YYYY-MM-DD">` per retreat, and `#retreatEmpty`, which carries the `hidden` attribute when at least one card exists. Task 9 consumes both IDs.

- [ ] **Step 1: Write the failing test**

Create `test/build.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const build = (fixture) => {
  execFileSync("npx", ["@11ty/eleventy"], {
    env: { ...process.env, RETREATS_SHEET_URL: fixture },
    stdio: "pipe",
  });
  return readFileSync("_site/retreats.html", "utf8");
};

test("a sheet with retreats renders cards and hides the empty block", () => {
  const html = build("docs/fixtures/retreats-sample.csv");
  assert.match(html, /id="retreatGrid"/);
  assert.match(html, /The Way Home/);
  assert.match(html, /Sacred Valley/);
  assert.doesNotMatch(html, /Finished Retreat/);
  assert.match(html, /data-retreat-end="2026-12-23"/);
  // the English prerender filled the generated date key
  assert.match(html, /December 17 – 23, 2026/);
  // the status badge resolved to translated copy, not the sheet's wording
  assert.match(html, /A few spaces left|Waitlist/);
  assert.match(html, /id="retreatEmpty"[^>]*hidden/);
});

test("an empty sheet shows the evergreen block and no cards", () => {
  const html = build("docs/fixtures/retreats-empty.csv");
  assert.doesNotMatch(html, /data-retreat-end/);
  assert.match(html, /New dates are being held/);
  assert.doesNotMatch(html, /id="retreatEmpty"[^>]*hidden/);
});

test("the page no longer names one retreat", () => {
  const html = build("docs/fixtures/retreats-empty.csv");
  const head = html.slice(0, html.indexOf("</head>"));
  assert.doesNotMatch(head, /Atitl|December 17|The Way Home/);
});
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `npm test`
Expected: FAIL, no `#retreatGrid` in the output.

- [ ] **Step 3: Make the head evergreen**

In `retreats.html`, replace lines 6 to 11:

```html
  <title>Retreats · Held by Paras</title>
  <meta name="description" content="Immersive multi-day retreats in small groups: embodiment, ceremony, nature and conscious community. See the upcoming dates." />
  <meta property="og:title" content="Retreats · Held by Paras" />
  <meta property="og:description" content="Immersive multi-day retreats in small groups: embodiment, ceremony, nature and conscious community." />
  <meta property="og:image" content="assets/og.jpg" />
  <meta property="og:type" content="website" />
```

- [ ] **Step 4: Turn the hero date line into a scroll cue**

Replace lines 37 and 38 (the `retreat.hero.dates` paragraph) with a link into the new section:

```html
        <a href="#upcoming"
           class="fade-up link-line mt-4 inline-block text-[.95rem] tracking-[.12em] font-medium uppercase text-[var(--gold)]"
           style="--d:.55s" data-i18n="retreat.hero.cue"></a>
```

- [ ] **Step 5: Add the section**

Insert immediately after the hero `</section>` (line 40) and before the intro section:

```html
    <!-- ============ UPCOMING RETREATS (from the client's sheet) ============ -->
    <section id="upcoming" class="bg-[var(--cream)] border-b border-[var(--border)]">
      <div class="max-w-6xl mx-auto px-5 py-20 md:py-28">
        <h2 class="reveal font-display text-center text-[clamp(1.9rem,4vw,3rem)]"
            data-i18n="retreat.upcoming.title"></h2>

        <div id="retreatGrid" class="mt-12 grid gap-6 md:gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {% for r in retreats %}
          <article class="card reveal flex flex-col" data-retreat-end="{{ r.end }}"
                   style="--d:{{ loop.index0 * 0.08 }}s">
            <div class="card__media aspect-[3/2]">
              <img class="object-cover w-full h-full" loading="lazy"
                   src="{{ r.image | imgsrc }}" alt="{{ r.name }}, {{ r.location }}" />
            </div>
            <div class="p-6 pt-7 flex flex-col grow">
              {% if r.statusKey %}
              <p class="text-[.68rem] font-semibold tracking-[.18em] uppercase text-[var(--clay)]"
                 data-i18n="retreat.status.{{ r.statusKey }}"></p>
              {% endif %}
              <h3 class="font-display text-[1.35rem] leading-snug mt-2">{{ r.name }}</h3>
              <dl class="mt-4 space-y-2.5 text-[.92rem] text-[var(--muted)]">
                <div>
                  <dt class="text-[.66rem] font-semibold tracking-[.16em] uppercase opacity-70"
                      data-i18n="retreat.label.dates"></dt>
                  <dd class="mt-0.5 text-[var(--text)]" data-i18n="retreat.dates.{{ r.index }}"></dd>
                </div>
                <div>
                  <dt class="text-[.66rem] font-semibold tracking-[.16em] uppercase opacity-70"
                      data-i18n="retreat.label.location"></dt>
                  <dd class="mt-0.5 text-[var(--text)]">{{ r.location }}</dd>
                </div>
                {% if r.cost %}
                <div>
                  <dt class="text-[.66rem] font-semibold tracking-[.16em] uppercase opacity-70"
                      data-i18n="retreat.label.cost"></dt>
                  <dd class="mt-0.5 text-[var(--text)]">{{ r.cost }}</dd>
                </div>
                {% endif %}
              </dl>
              <a href="{{ r.url }}" target="_blank" rel="noopener noreferrer"
                 class="btn btn-primary mt-auto pt-3 self-start !px-6 !py-3 text-[.7rem]"
                 data-i18n="retreat.label.cta"></a>
            </div>
          </article>
          {% endfor %}
        </div>

        <div id="retreatEmpty" class="max-w-xl mx-auto text-center"{% if retreats.length %} hidden{% endif %}>
          <h3 class="font-display text-[clamp(1.4rem,3vw,2rem)]" data-i18n="retreat.upcoming.empty.title"></h3>
          <p class="lead mt-4" data-i18n="retreat.upcoming.empty.body"></p>
          <a href="contact.html" class="btn btn-primary mt-8" data-i18n="cta.book"></a>
        </div>
      </div>
    </section>
```

Two things worth knowing here. Nunjucks autoescapes `{{ r.name }}` and friends, which is why `lib/retreats.mjs` does not escape anything. And the `data-i18n` elements are deliberately empty: the Eleventy prerender transform fills them with English at build, and `js/i18n.js` swaps them on a language change.

- [ ] **Step 6: Retire the single-retreat CTA**

In the closing CTA (around line 119), delete the whole `<a href="{{ site.retreat.bookingUrl }}">` element, keeping the contact button:

```html
        <div class="reveal mt-10 flex flex-wrap justify-center gap-4" style="--d:.36s">
          <a href="contact.html" class="btn btn-primary" data-i18n="cta.book"></a>
        </div>
```

Note the remaining button changes from `btn-ghost btn-ghost--inv` to `btn-primary`, because it is now the only call to action in that section.

Remove the `retreat` block from `content/site.json`:

```json
{
  "contact": {
    "whatsapp": "14168371650",
    "email": "Parastoovii@gmail.com",
    "instagram": "heldbyparas"
  },
  "hero": {
    "slide1": "assets/img/hero-coaching.webp",
    "slide2": "assets/img/hero-wellness.webp",
    "slide3": "assets/img/hero-yoga.webp",
    "slide4": "assets/img/header-treatments.webp",
    "slide5": "assets/img/hero-retreats.webp"
  },
  "escape": {
    "image": "assets/img/mission-portrait.webp"
  }
}
```

And delete the now-obsolete line 40 of `README.md`:

```
- [ ] **Retreat booking URL** — `content/site.json` → `retreat.bookingUrl`, currently `#`
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: PASS, 45 tests. The build tests take a few seconds each.

Run: `grep -rn "bookingUrl" --exclude-dir=node_modules --exclude-dir=_site --exclude-dir=.git --exclude-dir=docs .`
Expected: no matches.

- [ ] **Step 8: Look at it**

Run: `RETREATS_SHEET_URL=docs/fixtures/retreats-sample.csv npm run dev`

Open `http://localhost:8080/retreats.html` and check: two cards side by side, dates reading "December 17 – 23, 2026" and "March 28 – April 3, 2027", the hero cue scrolling to the section, and the Spanish and Farsi toggles swapping the dates, labels and status badges. In Farsi, confirm the grid mirrors and the numerals are Persian.

Then open `docs/fixtures/retreats-empty.csv` behaviour by restarting with `RETREATS_SHEET_URL=docs/fixtures/retreats-empty.csv npm run dev` and confirm the evergreen block shows instead. (`loadRetreats` memoises per process, so a restart is required, not just a save.)

- [ ] **Step 9: Commit**

```bash
git add retreats.html content/site.json README.md test/build.test.mjs
git commit -m "Retreats page: evergreen hero and an upcoming retreats section from the sheet"
```

---

### Task 9: Expire finished retreats in the browser

**Files:**
- Modify: `js/site.js` (insert before `window.ParastooI18N.initLang();` at line 207)

**Interfaces:**
- Consumes: `#retreatGrid`, `#retreatEmpty` and `data-retreat-end` from Task 8.
- Produces: nothing other tasks depend on.

- [ ] **Step 1: Add the expiry pass**

Insert into `js/site.js`, immediately before the final `window.ParastooI18N.initLang();`:

```js
  /* ---------- upcoming retreats: drop anything that has finished ---------- */
  /* The client publishes by hand, so nothing removes a past retreat on its own.
     The build filters what it can see; this covers a retreat that ends after the
     last build. Crawlers still index the published list. */
  const retreatGrid = document.getElementById("retreatGrid");
  if (retreatGrid) {
    const today = new Date().toISOString().slice(0, 10);
    retreatGrid.querySelectorAll("[data-retreat-end]").forEach(card => {
      if (card.dataset.retreatEnd < today) card.remove();
    });
    if (!retreatGrid.children.length) {
      /* inline style, not the hidden attribute: Tailwind's .grid would win */
      retreatGrid.style.display = "none";
      const empty = document.getElementById("retreatEmpty");
      if (empty) empty.hidden = false;
    }
  }
```

- [ ] **Step 2: Verify a card that expires after the build**

Run: `RETREATS_SHEET_URL=docs/fixtures/retreats-sample.csv npm run build`

Then edit `_site/retreats.html` by hand and change the first card's `data-retreat-end="2026-12-23"` to `data-retreat-end="2020-01-01"`.

Serve it: `npx http-server _site -p 8081` (or any static server) and open `http://localhost:8081/retreats.html`.

Expected: the first card is gone, the second remains, and the evergreen block stays hidden.

- [ ] **Step 3: Verify the all-expired case**

Edit both cards' `data-retreat-end` to `2020-01-01` and reload.

Expected: no cards, and the evergreen "New dates are being held" block is now visible, with the contact button.

Then run: `rm -rf _site && RETREATS_SHEET_URL=docs/fixtures/retreats-sample.csv npm run build`

- [ ] **Step 4: Commit**

```bash
git add js/site.js
git commit -m "Retreats: hide a retreat once its end date has passed"
```

---

### Task 10: The publish button, the hosting wiring and her guide

**Files:**
- Create: `docs/retreats-sheet-guide.md`
- Create: `docs/retreats-publish.gs`
- Modify: `README.md`

**Interfaces:**
- Consumes: the sheet contract from Tasks 3 and 5.
- Produces: no code the site imports. This task ends with a working end-to-end publish.

- [ ] **Step 1: Build the sheet**

Create a new Google Sheet in **your own** Google account, named `Munay retreats`, and set it up:

1. Rename the first tab to exactly `Retreats`.
2. Row 1, columns A to H: `Name`, `Start`, `End`, `Location`, `Cost`, `Link`, `Image`, `Status`.
3. Select columns B and C, then Format, Number, Custom date and time, and build the pattern `yyyy-mm-dd`. This is what makes the CSV export unambiguous, and the validator checks it.
4. Select column H, then Data, Data validation, Dropdown, with the four values `Open`, `A few spaces left`, `Waitlist`, `Full`.
5. Freeze row 1 (View, Freeze, 1 row).
6. Share, General access, Anyone with the link, Viewer. The build reads it without credentials, and it holds nothing that is not already published on the site.
7. Add one real row: her Guatemala retreat, linking to `https://dry-glade-1220.sahel-naserinasab.workers.dev/`.

- [ ] **Step 2: Point the build at it**

The build reads the gviz CSV endpoint, which returns live data rather than the several-minute cache that "Publish to web" applies:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=Retreats
```

Check it locally before wiring it anywhere:

```bash
node scripts/check-retreats.mjs "https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=Retreats"
```

Expected: the retreat you added, with dates in three languages.

Then set it as an environment variable named `RETREATS_SHEET_URL` in both places:

- Cloudflare Pages, project `munay-site`, Settings, Environment variables, for Production and Preview. Set `NODE_VERSION` to `22` in the same place so the build matches CI.
- GitHub, repository `Ashdabash2926/Munay2` (the `public-old` remote that currently serves the live GitHub Pages site), Settings, Secrets and variables, Actions, New repository secret. Then add it to the build step in `.github/workflows/deploy.yml`:

```yaml
      - run: npm run build
        env:
          RETREATS_SHEET_URL: ${{ secrets.RETREATS_SHEET_URL }}
```

The URL is never committed: the GitHub Pages repo is public.

- [ ] **Step 3: Create the deploy hook**

In Cloudflare Pages, project `munay-site`, Settings, Builds and deployments, Deploy hooks, Add deploy hook. Name it `Sheet publish`, branch `main`. Copy the URL it gives you.

Confirm it works before going near the spreadsheet:

```bash
curl -X POST "<DEPLOY_HOOK_URL>"
```

Expected: a JSON response with a job id, and a new build appearing in the Cloudflare dashboard.

- [ ] **Step 4: Write the Apps Script**

In the sheet: Extensions, Apps Script. Replace the contents of `Code.gs` with the following, and save a copy in the repo at `docs/retreats-publish.gs` so it is not lost:

```js
/**
 * Munay retreats: validate the sheet and publish it to the website.
 * Paste this into Extensions > Apps Script on the "Munay retreats" sheet.
 * The deploy hook lives in Project Settings > Script properties, under the
 * key DEPLOY_HOOK_URL, so it is never written down in this file.
 */

var SHEET_NAME = 'Retreats';
var COLUMNS = ['Name', 'Start', 'End', 'Location', 'Cost', 'Link', 'Image', 'Status'];
var STATUSES = ['Open', 'A few spaces left', 'Waitlist', 'Full'];
var HOOK_PROPERTY = 'DEPLOY_HOOK_URL';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Munay')
    .addItem('Publish to website', 'publishToWebsite')
    .addToUi();
}

function publishToWebsite() {
  var ui = SpreadsheetApp.getUi();

  var problems = findProblems_();
  if (problems.length) {
    ui.alert('Not published',
      'Please fix these first, then publish again:\n\n' + problems.join('\n'),
      ui.ButtonSet.OK);
    return;
  }

  var hook = PropertiesService.getScriptProperties().getProperty(HOOK_PROPERTY);
  if (!hook) {
    ui.alert('Not published',
      'The publish link is missing from this sheet. Please contact your developer.',
      ui.ButtonSet.OK);
    return;
  }

  try {
    var res = UrlFetchApp.fetch(hook, { method: 'post', payload: '', muteHttpExceptions: true });
    if (res.getResponseCode() >= 300) {
      throw new Error('the website replied ' + res.getResponseCode());
    }
    ui.alert('Published',
      'Your changes will be live on the website in about a minute.',
      ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Not published',
      'Something went wrong: ' + err.message + '\n\nPlease contact your developer.',
      ui.ButtonSet.OK);
  }
}

/** Everything the website checks, checked here first, where she can see it. */
function findProblems_() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME);
  if (!sheet) return ['The tab must be named "' + SHEET_NAME + '".'];

  var values = sheet.getDataRange().getDisplayValues();
  if (!values.length) return ['The sheet is empty.'];

  var header = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var missing = COLUMNS.filter(function (c) { return header.indexOf(c.toLowerCase()) === -1; });
  if (missing.length) {
    return ['The heading row is missing: ' + missing.join(', ') + '.'];
  }

  var at = {};
  COLUMNS.forEach(function (c) { at[c] = header.indexOf(c.toLowerCase()); });

  var problems = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var get = function (c) { return String(row[at[c]] || '').trim(); };
    var filled = COLUMNS.some(function (c) { return get(c) !== ''; });
    if (!filled) continue;

    var label = 'Row ' + (i + 1) + ' (' + (get('Name') || 'no name') + '): ';
    if (!get('Name')) problems.push(label + 'the name is empty.');
    if (!get('Location')) problems.push(label + 'the location is empty.');

    ['Start', 'End'].forEach(function (c) {
      var v = get(c);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        problems.push(label + 'the ' + c.toLowerCase() + ' date reads "' + v +
          '". Pick a date from the calendar, and if it still looks wrong, set the ' +
          'column format to Format, Number, Custom date and time, yyyy-mm-dd.');
      }
    });
    if (get('Start') && get('End') && get('End') < get('Start')) {
      problems.push(label + 'the end date is before the start date.');
    }

    var link = get('Link');
    if (link.indexOf('https://') !== 0) {
      problems.push(label + 'the link must start with https:// (it reads "' + link + '").');
    }

    var status = get('Status');
    if (status && STATUSES.indexOf(status) === -1) {
      problems.push(label + '"' + status + '" is not one of: ' + STATUSES.join(', ') + '.');
    }
  }
  return problems;
}
```

Then Project Settings, Script properties, Add script property: name `DEPLOY_HOOK_URL`, value the hook URL from Step 3.

- [ ] **Step 5: Authorise and test end to end**

Reload the spreadsheet. A `Munay` menu appears. Click Publish to website. Google will ask for authorisation on the first run: choose your account, then Advanced, then Go to project. This is the prompt to walk Parastoo through in person at handover.

Test all three paths:

1. Break a row on purpose (type `17/12/2026` into Start). Publish. Expected: a dialog naming the row, and no build starts.
2. Fix it. Publish. Expected: "Published", a build appears in Cloudflare, and about a minute later `munay-site.pages.dev/retreats.html` shows the retreat.
3. Delete every row. Publish. Expected: the page shows the evergreen "New dates are being held" block.

- [ ] **Step 6: Write her guide**

Create `docs/retreats-sheet-guide.md`, written for her rather than for a developer:

```markdown
# Adding a retreat to your website

Your retreats page updates itself from one spreadsheet. Add a row, click
Publish, and the website updates about a minute later.

## The spreadsheet

Each retreat is one row. The columns are:

| Column | What to put in it |
|---|---|
| Name | The name of the retreat, for example The Way Home |
| Start | The first day. Click the cell and pick the date from the calendar |
| End | The last day, picked the same way |
| Location | Where it is, for example Lake Atitlan, Guatemala |
| Cost | Anything you like: $2,200 USD, or From $1,800. Leave it blank to show no price |
| Link | The web address of the retreat's own page. It must start with https:// |
| Image | A photo for the card. Paste a Google Drive share link or a direct image link. Leave it blank and we will use one of your existing photos |
| Status | Pick from the dropdown: Open, A few spaces left, Waitlist, or Full |

You do not need to write anything in Spanish or Farsi. The dates translate
themselves, and the rest of the card is the same in every language.

## Publishing

1. Add or edit your rows.
2. In the menu bar, click **Munay**, then **Publish to website**.
3. If anything is wrong, a message tells you which row and what to fix. Nothing
   is published until it is right.
4. When it says Published, wait about a minute and refresh your website.

## Things worth knowing

- **Retreats disappear on their own.** Once the End date has passed, the retreat
  stops showing on the website. You do not have to delete it, though you can.
- **No retreats is fine.** If you have none coming up, the page shows a short
  message inviting people to get in touch, so it never looks empty or abandoned.
- **Order does not matter.** Retreats always show soonest first, whatever order
  the rows are in.
- **Up to six show at once.** If you list more, only the six soonest appear.
- **Deleting a row removes the retreat** from the website at the next publish.

## If something goes wrong

- The publish message says the date is wrong: click the cell, delete what is
  there, and pick the date from the little calendar instead of typing it.
- The publish message mentions the link: web addresses have to start with
  `https://`.
- You published and nothing changed: wait two minutes and refresh. If it still
  has not changed, get in touch.
```

- [ ] **Step 7: Update the README**

In `README.md`, add a section after Build & Dev:

```markdown
## Upcoming retreats (client-editable)

`retreats.html` renders an Upcoming Retreats section from a Google Sheet the
client edits. Design: `docs/superpowers/specs/2026-07-28-upcoming-retreats-design.md`.
Her instructions: `docs/retreats-sheet-guide.md`. The publish script that lives
in the sheet is kept at `docs/retreats-publish.gs`.

- **Data source:** `RETREATS_SHEET_URL`, the sheet's gviz CSV endpoint. Set as a
  Cloudflare Pages environment variable and a GitHub Actions secret. Never
  committed: the GitHub Pages mirror repo is public.
- **Local dev:** `RETREATS_SHEET_URL=docs/fixtures/retreats-sample.csv npm run dev`.
  The loader memoises per process, so re-run rather than relying on watch.
- **Inspect a sheet without building:** `node scripts/check-retreats.mjs <url or path>`.
- **Publishing:** the client clicks Munay, Publish to website in the sheet, which
  validates her rows and hits a Cloudflare Pages deploy hook.
- **Failure behaviour:** a damaged sheet (missing column, unreachable) fails the
  build on purpose, so the previous deploy stays live. A single bad row is
  skipped with a warning in the build log.
- **Tests:** `npm test`.
```

Also update the Deploy section to record that Cloudflare Pages is now the publish target the client's button triggers.

- [ ] **Step 8: Commit**

```bash
git add docs/retreats-sheet-guide.md docs/retreats-publish.gs README.md .github/workflows/deploy.yml
git commit -m "Retreats: publish button, hosting wiring and the client's guide"
```

- [ ] **Step 9: Deploy**

```bash
npm test
git push origin main
git push public-old main
```

Then confirm on the live site that the section renders, the language toggle swaps the dates, and her retreat links out correctly.

---

## Self-Review

**Spec coverage.** Every section of the design has a task. Data flow: Tasks 5, 6, 10. Sheet contract: Tasks 3, 10. Build ingestion: Tasks 1, 3, 5. Images: Task 4. Rendering: Task 8. Three languages: Tasks 2, 6, 7. Failure modes: Tasks 3, 5, 10. Client-side expiry: Task 9. Evergreen copy: Tasks 7 and 8. Publish button: Task 10. Handover guide: Task 10. Out of scope items are untouched.

**Deviation from the spec, deliberate.** The spec named the new i18n keys `retreats.*`; this plan uses `retreat.*` to sit inside the existing block and to keep the generated `retreat.dates.N` keys from colliding with a `retreat.label.dates` label. The spec has been updated to match.

**Placeholders.** None. Every code step carries the code, every copy change carries the exact string in all three languages, and every dashboard step names the menu path.

**Type consistency.** `buildRetreats` returns `{ retreats, warnings }` and is consumed that way in Task 5. `resolveImage(sourceUrl, slug, opts)` is called with exactly that shape in `loadRetreats`. `imageSource` is set in Task 3 and read in Task 5. `index` is added in Task 5, used in Task 6 for `retreat.dates.${index}` and in Task 8 as `r.index`. `statusKey` is `"open" | "few" | "waitlist" | "full" | null` in Task 3 and maps onto `retreat.status.*` keys created in Task 7 and rendered in Task 8. `#retreatGrid`, `#retreatEmpty` and `data-retreat-end` are produced in Task 8 and consumed in Task 9.

**One time-dependent test.** The Task 6 dictionary test relies on the fixture's 2026 and 2027 dates being in the future, and the Task 8 build tests likewise. If this is executed after December 2026, move the fixture dates forward and update the expected date strings in the same commit.
