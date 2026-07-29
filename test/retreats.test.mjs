import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, COLUMNS, formatDateRange } from "../lib/retreats.mjs";

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
