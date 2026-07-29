import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, COLUMNS } from "../lib/retreats.mjs";

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
