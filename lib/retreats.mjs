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
