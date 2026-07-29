import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  parseCsv, COLUMNS, formatDateRange, buildRetreats, MAX_CARDS,
  normalizeImageUrl, slugify, resolveImage, FALLBACK_IMAGE,
} from "../lib/retreats.mjs";

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

test("formatDateRange renders a same-month range in three languages", () => {
  assert.deepEqual(formatDateRange("2026-12-17", "2026-12-23"), {
    en: "December 17 – 23, 2026",
    es: "17–23 de diciembre de 2026",
    fa: "۱۷ تا ۲۳ دسامبر ۲۰۲۶",
  });
});

test("formatDateRange renders a range that crosses a month", () => {
  assert.deepEqual(formatDateRange("2027-03-28", "2027-04-03"), {
    en: "March 28 – April 3, 2027",
    es: "28 de marzo – 3 de abril de 2027",
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

test("resolveImage falls back and warns when the source is non-blank but unusable", async () => {
  const warnings = [];
  const path = await resolveImage("my photo.jpg", "a-1", { outDir: "/nonexistent", warnings });
  assert.equal(path, FALLBACK_IMAGE);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /a-1/);
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
