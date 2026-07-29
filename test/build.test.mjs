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
