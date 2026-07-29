// Upcoming retreats, read from a Google Sheet at build time.
// Spec: docs/superpowers/specs/2026-07-28-upcoming-retreats-design.md
//
// Nothing here escapes HTML: Nunjucks autoescapes at render. Sanitising here
// means trimming, collapsing whitespace and capping length.

import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";

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
  // True when a rejected row's Start or End is present but not ISO: the
  // signature of the sheet's date columns losing their yyyy-mm-dd number
  // format, as opposed to a blank cell (a half-typed draft row) or an
  // already-finished row (dropped below, before this can even be checked).
  let sawDateFormatBreak = false;

  rows.slice(1).forEach((cells, i) => {
    const line = i + 2; // 1-based, and the header is row 1
    const raw = Object.fromEntries(COLUMNS.map((c) => [c, clean(cells[at[c]], 500)]));
    if (!Object.values(raw).some(Boolean)) return; // blank row

    // Drop a finished retreat before validating anything else about the row,
    // so an archived row - keeping finished rows is explicitly supported -
    // never surfaces a rejection warning over some other problem (a dead
    // link, a blank cost) that nobody needs fixed. Guarded on both dates
    // parsing as real ISO dates first: a non-ISO value must never be
    // string-compared against today, since that comparison would be
    // meaningless.
    if (ISO_DATE.test(raw.start) && ISO_DATE.test(raw.end) && raw.end < today) return;

    const problems = [];
    if (!raw.name) problems.push("the name is empty");
    if (!raw.location) problems.push("the location is empty");
    const startBad = !ISO_DATE.test(raw.start);
    const endBad = !ISO_DATE.test(raw.end);
    if (startBad) problems.push(`the start date "${raw.start}" is not YYYY-MM-DD`);
    if (endBad) problems.push(`the end date "${raw.end}" is not YYYY-MM-DD`);
    if (!startBad && !endBad && raw.end < raw.start) {
      problems.push("the end is before start");
    }
    if (!/^https:\/\//i.test(raw.link)) problems.push(`the link "${raw.link}" must start with https://`);
    if (problems.length) {
      if ((raw.start && startBad) || (raw.end && endBad)) sawDateFormatBreak = true;
      warnings.push(`Row ${line}: ${problems.join(", ")}. Row skipped.`);
      return;
    }

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

  // Zero surviving retreats is only treated as a sheet-wide problem when at
  // least one rejected row had a date that was present but not ISO: that is
  // the signature of the Start/End columns losing their yyyy-mm-dd number
  // format (e.g. the sheet exporting "12/17/2026"), which invalidates every
  // row at once and is what this guard exists to catch. A blank date (a
  // half-typed draft row, which is normal while she is still planning) never
  // counts, and neither does an already-finished row, which is dropped above
  // before it can even reach this check, whatever else is wrong with it. So a
  // legitimately near-empty sheet - nothing upcoming, or a row still being
  // typed - never throws. The one accepted false positive: an archived row
  // with free-text dates like "May 2024" and nothing upcoming also throws,
  // because on the data alone it is indistinguishable from the systemic
  // break, and it is rare. Throwing here fails the build instead of quietly
  // shipping an empty page, so the previous deploy stays live.
  if (!retreats.length && sawDateFormatBreak) {
    throw new Error(`Every row in the retreats sheet was rejected: ${warnings.join(" ")}`);
  }

  return { retreats: retreats.slice(0, MAX_CARDS), warnings };
}

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

const SHEET_TIMEOUT_MS = 15000;

// Memoised per process so one build fetches the sheet once, however many
// times loadRetreats() is called (global data + the i18n dictionary both call
// it). A rejection is cached too, deliberately: a one-shot build should fail
// once, not retry mid-build. That means `npm run dev` needs a restart after
// fixing a bad sheet, not just a save; resetRetreatsCache() below is the
// test-only escape hatch.
let cached = null;

/** Test hook. The cache is per process, so a build fetches the sheet once. */
export function resetRetreatsCache() {
  cached = null;
}

async function fetchSheet(url, fetchImpl, attempt = 1) {
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(SHEET_TIMEOUT_MS), redirect: "follow" });
    if (!res.ok) throw new Error(`the sheet replied ${res.status}`);
    const text = await res.text();
    // A sharing change (no longer "Anyone with the link") makes Google reply
    // 200 with a sign-in HTML page instead of CSV. Sniffed here, not after
    // parseCsv, so the build reports the real cause instead of a confusing
    // "missing column" from parsing HTML as if it were CSV.
    if (/^\s*<(!doctype|html)/i.test(text)) {
      throw new Error("The sheet URL returned an HTML page, not CSV. Check that sharing is still Anyone with the link, Viewer.");
    }
    return text;
  } catch (err) {
    if (attempt < 2) return fetchSheet(url, fetchImpl, attempt + 1);
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
 *
 * `today` defaults to the RETREATS_TODAY environment variable when set, and
 * to the real clock otherwise. RETREATS_TODAY exists so tests can pin the
 * date without editing fixtures; an explicit `today` in `options` still wins.
 */
export async function loadRetreats({
  url = process.env.RETREATS_SHEET_URL,
  outDir = "_site",
  today = process.env.RETREATS_TODAY || new Date().toISOString().slice(0, 10),
  fetchImpl = fetch,
} = {}) {
  if (cached) return cached;
  cached = (async () => {
    if (!url) {
      console.warn("[retreats] RETREATS_SHEET_URL is not set, rendering the empty state.");
      return [];
    }
    const text = /^https?:/i.test(url) ? await fetchSheet(url, fetchImpl) : await readFile(url, "utf8");
    const { retreats, warnings } = buildRetreats(parseCsv(text), { today });

    const resolved = [];
    for (const [i, retreat] of retreats.entries()) {
      const slug = slugify(retreat.name, i + 1);
      const image = await resolveImage(retreat.imageSource, slug, { outDir, fetchImpl, warnings });
      // A blank/broken Image cell falls back to a photo of a specific place
      // (assets/img/RI-1.webp, Lake Atitlán) that is wrong for every other
      // retreat's location. Flagging that here lets the template render the
      // fallback as decorative (alt="") instead of asserting a location the
      // photo does not show.
      resolved.push({ ...retreat, image, index: i + 1, slug, usesFallbackImage: image === FALLBACK_IMAGE });
    }

    for (const warning of warnings) console.warn(`[retreats] ${warning}`);
    console.log(`[retreats] ${resolved.length} upcoming retreat(s).`);
    return resolved;
  })();
  return cached;
}
