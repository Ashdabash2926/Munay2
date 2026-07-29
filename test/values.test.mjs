import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

/* These read the source template rather than _site/about.html on purpose.
   Everything asserted here is markup structure and i18n keys, which Eleventy
   passes through untouched, and test files run concurrently: a build started
   here would clobber the _site that build.test.mjs is reading. */

const LANGS = ["en", "es", "fa"];
const VALUES = Array.from({ length: 10 }, (_, i) => `v${i + 1}`);
const load = (lang) => JSON.parse(readFileSync(`content/i18n/${lang}.json`, "utf8"));
const about = () => readFileSync("about.html", "utf8");

test("all ten values still carry a name and a description in every language", () => {
  for (const lang of LANGS) {
    const dict = load(lang).about;
    for (const v of VALUES) {
      assert.ok(dict[v]?.name, `${lang}: about.${v}.name is missing`);
      assert.ok(dict[v]?.desc, `${lang}: about.${v}.desc is missing`);
    }
  }
});

test("the section renders ten branches, each wired to its own copy", () => {
  const html = about();
  assert.match(html, /id="valuesConstellation"/);

  const branches = html.match(/<details class="constellation__item">/g) ?? [];
  assert.equal(branches.length, 10, "expected exactly ten branches");

  for (const v of VALUES) {
    assert.ok(html.includes(`data-i18n="about.${v}.name"`), `about.${v}.name is not rendered`);
    assert.ok(html.includes(`data-i18n="about.${v}.desc"`), `about.${v}.desc is not rendered`);
  }
});

test("the branches are native disclosures, not a JS-only widget", () => {
  // The accessibility and no-JS story both rest on this: if these ever become
  // divs with hand-rolled ARIA, the section stops working without the script.
  const html = about();
  const summaries = html.match(/<summary class="constellation__node">/g) ?? [];
  assert.equal(summaries.length, 10, "expected each branch to open with a <summary>");
  assert.doesNotMatch(html, /constellation__node"[^>]*aria-expanded/);
});

test("the centre is decorative so its mirrored text is not read twice", () => {
  const html = about();
  assert.match(html, /<div class="constellation__detail" aria-hidden="true">/);
  // the statement itself sits outside the hidden part
  assert.match(html, /<h2 class="constellation__statement" data-i18n="about\.values\.title">/);
});

test("the script is loaded and the old card grid is gone", () => {
  const html = about();
  assert.match(html, /js\/values-constellation\.js/);
  assert.doesNotMatch(html, /grid sm:grid-cols-2 lg:grid-cols-3/);
});
