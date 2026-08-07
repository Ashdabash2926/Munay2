import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
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

// Reviews are a separate sheet on the home page, so they get their own helper:
// both env vars are set explicitly, never inherited, or a REVIEWS_SHEET_URL
// left in the developer's shell would quietly decide which branch is tested.
const buildHome = (reviewsFixture) => {
  execFileSync("npx", ["@11ty/eleventy"], {
    env: {
      ...process.env,
      RETREATS_SHEET_URL: "docs/fixtures/retreats-empty.csv",
      RETREATS_TODAY: "2026-07-28",
      ...(reviewsFixture
        ? { REVIEWS_SHEET_URL: reviewsFixture }
        : { REVIEWS_SHEET_URL: "" }),
    },
    stdio: "pipe",
  });
  return readFileSync("_site/index.html", "utf8");
};

test("a sheet with reviews renders the carousel instead of the holding quote", () => {
  const html = buildHome("docs/fixtures/reviews-sample.csv");
  assert.match(html, /data-reviews-track/);
  assert.match(html, /Parastoo held the space so gently/);
  assert.match(html, /SARAH M\.|Sarah M\./);
  // the carousel's behaviour is only shipped on the branch that needs it
  assert.match(html, /js\/reviews-carousel\.js/);
  // the holding quote and its dead Google link are both gone
  assert.doesNotMatch(html, /Healing is not something that happens to you/);
  assert.doesNotMatch(html, /home\.testimonial\.google/);
  // section chrome is translatable, the reviews themselves are not
  assert.match(html, /data-i18n="home\.reviews\.title">What people say</);
  assert.doesNotMatch(html, /data-i18n="[^"]*"[^>]*>Parastoo held the space/);
});

test("star ratings render as filled icons and a screen-reader label", () => {
  const html = buildHome("docs/fixtures/reviews-sample.csv");
  const cards = html.split('<li class="reviews__item">').slice(1);
  assert.equal(cards.length, 6);
  const filled = (card) => (card.match(/class="is-filled"/g) || []).length;
  // the fixture's fifth review is the only four-star one
  assert.equal(filled(cards[0]), 5);
  assert.equal(filled(cards[4]), 4);
  assert.match(cards[4], /data-i18n="home\.reviews\.stars\.4">4 out of 5 stars</);
  // five icons are always drawn, the empty ones included
  for (const card of cards) {
    assert.equal((card.match(/<svg viewBox="0 0 24 24"/g) || []).length, 5);
  }
});

test("no reviews falls back to the holding quote and ships no carousel", () => {
  const html = buildHome(null);
  assert.doesNotMatch(html, /data-reviews-track/);
  assert.doesNotMatch(html, /js\/reviews-carousel\.js/);
  assert.match(html, /Healing is not something that happens to you/);
});

test("every script the pages load is actually copied into the build", () => {
  // Passthrough copy is per-file here, so adding a <script> without adding a
  // matching addPassthroughCopy ships a page that 404s its own behaviour.
  build("docs/fixtures/retreats-empty.csv");
  const pages = ["about.html", "index.html", "contact.html", "offerings.html", "faq.html", "retreats.html"];
  for (const page of pages) {
    const html = readFileSync(page, "utf8");
    for (const [, src] of html.matchAll(/<script src="((?!https?:)[^"]+)"/g)) {
      assert.ok(existsSync(`_site/${src}`), `${page} loads ${src}, which is not in _site`);
    }
  }
});
