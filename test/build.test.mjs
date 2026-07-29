import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { formatDateRange } from "../lib/retreats.mjs";

const build = (fixture) => {
  execFileSync("npx", ["@11ty/eleventy"], {
    env: { ...process.env, RETREATS_SHEET_URL: fixture, RETREATS_TODAY: "2026-07-28" },
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
  assert.ok(html.includes(formatDateRange("2026-12-17", "2026-12-23").en));
  // the status badge resolved to translated copy, not the sheet's wording
  assert.match(html, /A few spaces left|Waitlist/);
  assert.match(html, /id="retreatEmpty"[^>]*hidden/);
  // the hero alt text stays evergreen even once cards exist
  assert.doesNotMatch(html, /The Way Home retreat/);
  // each card's link carries the retreat's name in a visually hidden span,
  // so identically-worded CTAs still get distinct accessible names
  assert.match(html, /<span class="sr-only">The Way Home<\/span>/);
  assert.match(html, /<span class="sr-only">Sacred Valley<\/span>/);
});

test("an empty sheet shows the evergreen block and no cards", () => {
  const html = build("docs/fixtures/retreats-empty.csv");
  assert.doesNotMatch(html, /data-retreat-end/);
  assert.match(html, /New dates are being held/);
  assert.doesNotMatch(html, /id="retreatEmpty"[^>]*hidden/);
});

test("a sheet with only an archived, broken-link retreat still builds and shows the empty state", () => {
  // Keeping a finished retreat around is explicitly supported. Its link being
  // dead should never surface, and it should never turn "nothing upcoming"
  // into a build failure: this is the actual state a caller gets for that
  // sheet, not just an assertion that buildRetreats didn't throw.
  const html = build("docs/fixtures/retreats-archived-only.csv");
  assert.doesNotMatch(html, /data-retreat-end/);
  assert.match(html, /New dates are being held/);
  assert.doesNotMatch(html, /id="retreatEmpty"[^>]*hidden/);
  assert.doesNotMatch(html, /Archived Retreat/);
});

test("the page no longer names one retreat", () => {
  // Checks the whole document, not just <head>: two <img alt> attributes
  // further down the page (the hero photo and the parallax band) used to
  // name Lake Atitlán directly, which a head-only check never caught.
  const html = build("docs/fixtures/retreats-empty.csv");
  assert.doesNotMatch(html, /Atitl|December 17|The Way Home/);
});
