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
  // Also walks home.escape and pillar.5, which named the same retreat on the
  // home page.
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
    const data = load(lang);
    walk(data.retreat, "retreat");
    walk(data.home.escape, "home.escape");
    walk(data.pillar["5"], "pillar.5");
  }
});
