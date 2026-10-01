import { test } from "node:test";
import assert from "node:assert/strict";
import {
  youtubeId, videoTabUrl, buildVideos, checkVideo, loadVideos, resetVideosCache, MAX_VIDEOS,
} from "../lib/videos.mjs";

test("youtubeId reads every link shape YouTube hands out", () => {
  const id = "dQw4w9WgXcQ";
  for (const link of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?feature=share&v=${id}&t=30s`,
    `https://youtu.be/${id}?si=Xyz123`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `  https://youtu.be/${id}  `,
  ]) assert.equal(youtubeId(link), id, link);
  assert.equal(youtubeId("https://www.youtube.com/@someone"), null);
  assert.equal(youtubeId("https://vimeo.com/12345"), null);
  assert.equal(youtubeId(""), null);
});

test("videoTabUrl points the reviews export at the Video review tab", () => {
  const reviews = "https://docs.google.com/spreadsheets/d/X/gviz/tq?tqx=out:csv&sheet=Testimonials";
  assert.equal(videoTabUrl(reviews), "https://docs.google.com/spreadsheets/d/X/gviz/tq?tqx=out:csv&sheet=Video%20review");
  assert.equal(videoTabUrl("docs/fixtures/reviews-sample.csv"), "");
  assert.equal(videoTabUrl(undefined), "");
});

test("buildVideos keeps good rows, skips bad links and blank rows, and never throws", () => {
  const { videos, warnings } = buildVideos([
    ["Name", "YouTube link"],
    ["Lara S.", "https://youtu.be/dQw4w9WgXcQ"],
    ["", ""],
    ["Bad", "https://example.com/video"],
    ["Short", "https://www.youtube.com/shorts/abcdefghijk"],
  ]);
  assert.deepEqual(videos, [
    { name: "Lara S.", id: "dQw4w9WgXcQ", vertical: false },
    { name: "Short", id: "abcdefghijk", vertical: true },
  ]);
  assert.match(warnings[0], /Video row 4/);
});

test("buildVideos accepts a plain Link heading in any case", () => {
  const { videos } = buildVideos([["NAME", "Link"], ["A", "https://youtu.be/dQw4w9WgXcQ"]]);
  assert.equal(videos.length, 1);
});

test("buildVideos treats the Retreats tab (Google's answer for a missing tab) as no video", () => {
  const { videos, warnings } = buildVideos([["Name", "Start", "End", "Location", "Cost", "Link", "Image", "Status"]]);
  assert.deepEqual(videos, []);
  assert.match(warnings[0], /No "Video review" tab/);
});

test("buildVideos caps the number of videos", () => {
  const rows = [["Name", "YouTube link"]];
  for (let i = 0; i < MAX_VIDEOS + 2; i++) rows.push([`P${i}`, "https://youtu.be/dQw4w9WgXcQ"]);
  assert.equal(buildVideos(rows).videos.length, MAX_VIDEOS);
});

test("checkVideo drops a private video, marks a tall one vertical, keeps one it cannot check", async () => {
  const v = { name: "Lara", id: "dQw4w9WgXcQ", vertical: false };
  const warnings = [];
  assert.equal(await checkVideo(v, { fetchImpl: async () => ({ ok: false, status: 401 }), warnings }), null);
  assert.match(warnings[0], /Unlisted or Public/);
  const tall = await checkVideo(v, { fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ width: 360, height: 640 }) }) });
  assert.equal(tall.vertical, true);
  const offline = await checkVideo(v, { fetchImpl: async () => { throw new Error("offline"); } });
  assert.deepEqual(offline, v);
});

test("loadVideos never fails: an unreadable tab is simply no video", async () => {
  resetVideosCache();
  const videos = await loadVideos({
    url: "https://docs.google.com/spreadsheets/d/X/gviz/tq?sheet=Video%20review",
    fetchImpl: async () => ({ ok: false, status: 500 }),
  });
  assert.deepEqual(videos, []);
  resetVideosCache();
});

test("loadVideos asks for one header row and checks each video", async () => {
  resetVideosCache();
  const seen = [];
  const fetchImpl = async (url) => {
    seen.push(url);
    if (url.includes("oembed")) return { ok: true, status: 200, json: async () => ({ width: 1280, height: 720 }) };
    return { ok: true, status: 200, text: async () => "Name,YouTube link\nLara,https://youtu.be/dQw4w9WgXcQ\n" };
  };
  const videos = await loadVideos({ url: "https://docs.google.com/spreadsheets/d/X/gviz/tq?sheet=Video%20review", fetchImpl });
  assert.deepEqual(videos, [{ name: "Lara", id: "dQw4w9WgXcQ", vertical: false }]);
  assert.match(seen[0], /headers=1/);
  assert.match(seen[1], /oembed/);
  resetVideosCache();
});
