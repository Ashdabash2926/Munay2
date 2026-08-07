// Client reviews, read from a Google Sheet at build time.
// Spec: docs/superpowers/specs/2026-08-07-client-reviews-design.md
//
// A second tab in the same spreadsheet that feeds lib/retreats.mjs, so the CSV
// reader is shared rather than duplicated. Much smaller than retreats: no
// images, no dates, no expiry. A review does not go stale.
//
// Nothing here escapes HTML: Nunjucks autoescapes at render. Sanitising here
// means trimming, collapsing whitespace and validating length.

import { readFile } from "node:fs/promises";
import { parseCsv } from "./retreats.mjs";

/** The three columns the sheet must have, lowercased. */
export const COLUMNS = ["name", "review", "stars"];

/** Never render more than this, however many rows she pastes in. */
export const MAX_REVIEWS = 12;

/**
 * Longest review a card can hold without the row of cards growing absurd.
 * A row over this is rejected rather than truncated: silently cutting a
 * client's sentence in half is worse than asking her to shorten it, and the
 * publish button reports the character count so she knows by how much.
 */
export const MAX_REVIEW_CHARS = 400;
export const MAX_NAME_CHARS = 60;

const collapse = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

/**
 * Turn parsed CSV rows into reviews, in sheet order.
 *
 * Throws when the sheet itself is wrong (empty, or a column missing), because a
 * damaged sheet should fail the build and leave the previous deploy live. A bad
 * single row is skipped with a warning instead: her other reviews still publish.
 *
 * Zero surviving reviews is NOT an error, which is the one place this diverges
 * from buildRetreats. An empty Reviews tab is the normal starting state, and
 * reviews have no equivalent of the date-format break that makes a
 * fully-rejected retreats sheet a detectable systemic failure.
 *
 * @param {string[][]} rows  parsed CSV, header row first
 */
export function buildReviews(rows) {
  if (!rows.length) throw new Error("The reviews sheet is empty (no header row).");

  const header = rows[0].map((h) => collapse(h).toLowerCase());
  for (const column of COLUMNS) {
    if (!header.includes(column)) {
      throw new Error(`The reviews sheet is missing the "${column}" column.`);
    }
  }
  const at = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(c)]));

  const warnings = [];
  const reviews = [];

  rows.slice(1).forEach((cells, i) => {
    const line = i + 2; // 1-based, and the header is row 1
    const raw = Object.fromEntries(COLUMNS.map((c) => [c, collapse(cells[at[c]])]));
    if (!Object.values(raw).some(Boolean)) return; // blank row

    const problems = [];
    if (!raw.name) problems.push("the name is empty");
    if (raw.name.length > MAX_NAME_CHARS) {
      problems.push(`the name is ${raw.name.length} characters, over the ${MAX_NAME_CHARS} limit`);
    }
    if (!raw.review) problems.push("the review is empty");
    if (raw.review.length > MAX_REVIEW_CHARS) {
      problems.push(`the review is ${raw.review.length} characters, over the ${MAX_REVIEW_CHARS} limit`);
    }

    // Sheets exports a whole-number cell as "5", but a stray decimal or a
    // typed word must not become NaN stars, so this is an explicit integer
    // test rather than a Number() coercion.
    const stars = /^[1-5]$/.test(raw.stars) ? Number(raw.stars) : null;
    if (stars === null) {
      problems.push(`the stars value "${raw.stars}" must be a whole number from 1 to 5`);
    }

    if (problems.length) {
      warnings.push(`Row ${line}: ${problems.join(", ")}. Row skipped.`);
      return;
    }

    reviews.push({ name: raw.name, text: raw.review, stars, index: reviews.length + 1 });
  });

  if (reviews.length > MAX_REVIEWS) {
    warnings.push(`${reviews.length} reviews in the sheet, only the first ${MAX_REVIEWS} are shown.`);
  }

  return { reviews: reviews.slice(0, MAX_REVIEWS), warnings };
}

const SHEET_TIMEOUT_MS = 15000;

// Memoised per process so one build fetches the sheet once. A rejection is
// cached too, deliberately: a one-shot build should fail once, not retry
// mid-build. That means `npm run dev` needs a restart after fixing a bad
// sheet, not just a save; resetReviewsCache() below is the test-only hatch.
let cached = null;

/** Test hook. The cache is per process, so a build fetches the sheet once. */
export function resetReviewsCache() {
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
    throw new Error(`Could not read the reviews sheet: ${err.message}`);
  }
}

/**
 * The whole pipeline: fetch, parse, validate.
 *
 * A missing REVIEWS_SHEET_URL returns no reviews, which renders the evergreen
 * fallback quote on the home page, so a local build or a fork still works. A
 * sheet that is reachable but damaged throws, which fails the build and leaves
 * the previous deploy live.
 *
 * `url` may be a local path, which is how docs/fixtures/*.csv drive npm run dev.
 */
export async function loadReviews({
  url = process.env.REVIEWS_SHEET_URL,
  fetchImpl = fetch,
} = {}) {
  if (cached) return cached;
  cached = (async () => {
    if (!url) {
      console.warn("[reviews] REVIEWS_SHEET_URL is not set, rendering the fallback quote.");
      return [];
    }
    const text = /^https?:/i.test(url) ? await fetchSheet(url, fetchImpl) : await readFile(url, "utf8");
    const { reviews, warnings } = buildReviews(parseCsv(text));

    for (const warning of warnings) console.warn(`[reviews] ${warning}`);
    console.log(`[reviews] ${reviews.length} review(s).`);
    return reviews;
  })();
  return cached;
}
