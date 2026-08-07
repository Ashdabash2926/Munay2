import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COLUMNS, MAX_REVIEWS, MAX_REVIEW_CHARS, MAX_NAME_CHARS,
  buildReviews, loadReviews, resetReviewsCache,
} from "../lib/reviews.mjs";
import { parseCsv } from "../lib/retreats.mjs";

const HEADER = ["Name", "Review", "Stars"];
const row = ({ name = "Sarah M.", review = "Held so gently.", stars = "5" } = {}) =>
  [name, review, stars];

const csv = (...rows) => [HEADER, ...rows].map((r) => r.join(",")).join("\n");
const build = (text) => buildReviews(parseCsv(text));

test("COLUMNS lists the three sheet columns in order", () => {
  assert.deepEqual(COLUMNS, ["name", "review", "stars"]);
});

test("buildReviews reads a plain sheet in row order", () => {
  const { reviews, warnings } = build(csv(
    row({ name: "Sarah M.", review: "Held so gently.", stars: "5" }),
    row({ name: "Tom R.", review: "It changed my year.", stars: "4" }),
  ));
  assert.deepEqual(reviews.map((r) => r.name), ["Sarah M.", "Tom R."]);
  assert.deepEqual(reviews.map((r) => r.text), ["Held so gently.", "It changed my year."]);
  assert.deepEqual(reviews.map((r) => r.stars), [5, 4]);
  assert.deepEqual(reviews.map((r) => r.index), [1, 2]);
  assert.deepEqual(warnings, []);
});

test("buildReviews returns stars as a number, not the sheet's string", () => {
  const { reviews } = build(csv(row({ stars: "3" })));
  assert.equal(reviews[0].stars, 3);
  assert.equal(typeof reviews[0].stars, "number");
});

test("buildReviews matches the header case-insensitively and ignores extra columns", () => {
  const text = "STARS,name,Review,Notes\n5,Sarah M.,Held so gently.,ignore me";
  const { reviews } = buildReviews(parseCsv(text));
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].name, "Sarah M.");
  assert.equal(reviews[0].stars, 5);
});

test("buildReviews throws on an empty sheet with no header row", () => {
  assert.throws(() => buildReviews([]), /no header row/);
});

test("buildReviews throws when a column is missing, so a damaged sheet fails the build", () => {
  assert.throws(() => build("Name,Review\nSarah M.,Held so gently."), /missing the "stars" column/);
});

test("buildReviews skips blank rows without warning", () => {
  const { reviews, warnings } = build(csv(row(), [" ", "", ""], row({ name: "Tom R." })));
  assert.equal(reviews.length, 2);
  assert.deepEqual(warnings, []);
});

test("buildReviews collapses whitespace inside a review", () => {
  const { reviews } = build('Name,Review,Stars\nSarah M.,"Held   so\n\ngently.",5');
  assert.equal(reviews[0].text, "Held so gently.");
});

test("buildReviews keeps a comma inside a quoted review", () => {
  const { reviews } = build('Name,Review,Stars\nSarah M.,"Gentle, patient, kind.",5');
  assert.equal(reviews[0].text, "Gentle, patient, kind.");
});

test("buildReviews rejects an empty name or review, naming the row", () => {
  const { reviews, warnings } = build(csv(
    row({ name: "" }),
    row({ review: "" }),
    row({ name: "Fine" }),
  ));
  assert.deepEqual(reviews.map((r) => r.name), ["Fine"]);
  assert.match(warnings[0], /^Row 2: the name is empty\. Row skipped\.$/);
  assert.match(warnings[1], /^Row 3: the review is empty\. Row skipped\.$/);
});

test("buildReviews rejects an over-length review rather than truncating a client's words", () => {
  const long = "a".repeat(MAX_REVIEW_CHARS + 1);
  const { reviews, warnings } = build(csv(row({ review: long })));
  assert.deepEqual(reviews, []);
  assert.match(warnings[0], new RegExp(`the review is ${MAX_REVIEW_CHARS + 1} characters`));
  assert.match(warnings[0], new RegExp(`over the ${MAX_REVIEW_CHARS} limit`));
});

test("buildReviews accepts a review of exactly the limit", () => {
  const { reviews, warnings } = build(csv(row({ review: "a".repeat(MAX_REVIEW_CHARS) })));
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].text.length, MAX_REVIEW_CHARS);
  assert.deepEqual(warnings, []);
});

test("buildReviews rejects an over-length name", () => {
  const { reviews, warnings } = build(csv(row({ name: "a".repeat(MAX_NAME_CHARS + 1) })));
  assert.deepEqual(reviews, []);
  assert.match(warnings[0], new RegExp(`the name is ${MAX_NAME_CHARS + 1} characters`));
});

test("buildReviews rejects stars outside 1-5, blank, or not a whole number", () => {
  for (const stars of ["", "0", "6", "4.5", "five", "-2", "05"]) {
    const { reviews, warnings } = build(csv(row({ stars })));
    assert.deepEqual(reviews, [], `stars ${JSON.stringify(stars)} should be rejected`);
    assert.match(warnings[0], /must be a whole number from 1 to 5/);
  }
});

test("buildReviews accepts every star value from 1 to 5", () => {
  for (const stars of ["1", "2", "3", "4", "5"]) {
    const { reviews } = build(csv(row({ stars })));
    assert.equal(reviews[0].stars, Number(stars));
  }
});

test("buildReviews reports every problem in one row together", () => {
  const { warnings } = build(csv(row({ name: "", review: "", stars: "9" })));
  assert.match(warnings[0], /the name is empty, the review is empty, .*1 to 5\. Row skipped\./);
});

test("buildReviews keeps a good row when a neighbour is bad", () => {
  const { reviews, warnings } = build(csv(
    row({ name: "Good One" }),
    row({ stars: "nope" }),
    row({ name: "Good Two" }),
  ));
  assert.deepEqual(reviews.map((r) => r.name), ["Good One", "Good Two"]);
  // index is the position among surviving reviews, so it stays contiguous
  assert.deepEqual(reviews.map((r) => r.index), [1, 2]);
  assert.equal(warnings.length, 1);
});

test("buildReviews caps the list at MAX_REVIEWS and says so", () => {
  const rows = Array.from({ length: MAX_REVIEWS + 3 }, (_, i) => row({ name: `Person ${i + 1}` }));
  const { reviews, warnings } = build(csv(...rows));
  assert.equal(reviews.length, MAX_REVIEWS);
  assert.equal(reviews.at(-1).name, `Person ${MAX_REVIEWS}`);
  assert.match(warnings[0], new RegExp(`${MAX_REVIEWS + 3} reviews in the sheet`));
});

test("a sheet with only a header is not an error: an empty Reviews tab is a normal state", () => {
  const { reviews, warnings } = buildReviews(parseCsv(HEADER.join(",")));
  assert.deepEqual(reviews, []);
  assert.deepEqual(warnings, []);
});

test("every row being rejected still returns empty rather than throwing", () => {
  // Unlike retreats, there is no systemic failure to detect here, and failing
  // the build over it would take the whole site down for a bad review row.
  const { reviews, warnings } = build(csv(row({ stars: "x" }), row({ name: "" })));
  assert.deepEqual(reviews, []);
  assert.equal(warnings.length, 2);
});

test("loadReviews with no URL returns no reviews, so the fallback quote renders", async () => {
  resetReviewsCache();
  const previous = process.env.REVIEWS_SHEET_URL;
  delete process.env.REVIEWS_SHEET_URL;
  try {
    assert.deepEqual(await loadReviews(), []);
  } finally {
    if (previous !== undefined) process.env.REVIEWS_SHEET_URL = previous;
    resetReviewsCache();
  }
});

test("loadReviews reads the local fixture", async () => {
  resetReviewsCache();
  try {
    const reviews = await loadReviews({ url: "docs/fixtures/reviews-sample.csv" });
    assert.equal(reviews.length, 6);
    assert.equal(reviews[0].name, "Sarah M.");
    assert.equal(reviews[4].stars, 4);
    assert.ok(reviews.every((r) => r.text.length <= MAX_REVIEW_CHARS));
    assert.ok(reviews.every((r) => Number.isInteger(r.stars) && r.stars >= 1 && r.stars <= 5));
  } finally {
    resetReviewsCache();
  }
});

test("loadReviews memoises, so one build fetches the sheet once", async () => {
  resetReviewsCache();
  const dir = await mkdtemp(join(tmpdir(), "reviews-cache-"));
  const path = join(dir, "sheet.csv");
  await writeFile(path, csv(row({ name: "First" })));
  try {
    const first = await loadReviews({ url: path });
    await writeFile(path, csv(row({ name: "Second" })));
    const second = await loadReviews({ url: path });
    assert.equal(second[0].name, "First");
    assert.equal(first, second);

    resetReviewsCache();
    const third = await loadReviews({ url: path });
    assert.equal(third[0].name, "Second");
  } finally {
    resetReviewsCache();
    await rm(dir, { recursive: true, force: true });
  }
});

test("loadReviews retries a failing fetch once, then throws", async () => {
  resetReviewsCache();
  let calls = 0;
  const fetchImpl = async () => { calls++; throw new Error("network down"); };
  try {
    await assert.rejects(
      () => loadReviews({ url: "https://example.com/reviews.csv", fetchImpl }),
      /Could not read the reviews sheet: network down/,
    );
    assert.equal(calls, 2);
  } finally {
    resetReviewsCache();
  }
});

test("loadReviews recovers when the first attempt fails and the second succeeds", async () => {
  resetReviewsCache();
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) throw new Error("flaky");
    return { ok: true, status: 200, text: async () => csv(row({ name: "Recovered" })) };
  };
  try {
    const reviews = await loadReviews({ url: "https://example.com/reviews.csv", fetchImpl });
    assert.equal(reviews[0].name, "Recovered");
    assert.equal(calls, 2);
  } finally {
    resetReviewsCache();
  }
});

test("loadReviews reports a non-2xx reply", async () => {
  resetReviewsCache();
  const fetchImpl = async () => ({ ok: false, status: 404, text: async () => "" });
  try {
    await assert.rejects(
      () => loadReviews({ url: "https://example.com/reviews.csv", fetchImpl }),
      /the sheet replied 404/,
    );
  } finally {
    resetReviewsCache();
  }
});

test("loadReviews names the real cause when sharing is off and Google returns a sign-in page", async () => {
  resetReviewsCache();
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () => "<!DOCTYPE html><html><body>Sign in to continue</body></html>",
  });
  try {
    await assert.rejects(
      () => loadReviews({ url: "https://example.com/reviews.csv", fetchImpl }),
      /HTML page, not CSV/,
    );
  } finally {
    resetReviewsCache();
  }
});
