// Video testimonials, read from the "Video review" tab of the client's sheet
// at build time and shown above the written reviews on the home page.
//
// The tab lives in the same spreadsheet as Retreats and Testimonials, so its
// address is derived from REVIEWS_SHEET_URL by swapping the tab name: no new
// secret to set in Cloudflare or GitHub. VIDEOS_SHEET_URL overrides that, and
// is how docs/fixtures/videos-sample.csv drives npm run dev and the tests.
//
// Unlike retreats and reviews, nothing here ever fails the build. A video is
// an extra: a missing tab, a bad link or a private video is a warning in the
// build log and the section simply goes without it.

import { readFile } from "node:fs/promises";
import { parseCsv, pinHeaderRow } from "./retreats.mjs";

export const TAB_NAME = "Video review";

/** Two columns, lowercased. "Link" and "YouTube link" both count as the link. */
const LINK_HEADINGS = ["youtube link", "link", "youtube", "video", "url"];

/** One video is the design; a second or third still lays out sensibly. */
export const MAX_VIDEOS = 3;

const collapse = (value) => String(value ?? "").trim().replace(/\s+/g, " ");

/**
 * The 11-character video id from any of the shapes YouTube hands out:
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/, with or without extra
 * parameters such as &t=30s or ?si=.
 */
export function youtubeId(link) {
  const value = collapse(link);
  const match = value.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([\w-]{11})(?![\w-])/i,
  );
  return match ? match[1] : null;
}

/** The same spreadsheet's gviz export, pointed at the Video review tab. */
export function videoTabUrl(reviewsUrl) {
  const value = String(reviewsUrl ?? "");
  if (!/\/gviz\//.test(value) || !/[?&]sheet=/.test(value)) return "";
  return value.replace(/([?&]sheet=)[^&]*/, `$1${encodeURIComponent(TAB_NAME)}`);
}

/**
 * Turn parsed CSV rows into videos, in sheet order. Never throws.
 *
 * @param {string[][]} rows  parsed CSV, header row first
 */
export function buildVideos(rows) {
  const warnings = [];
  if (!rows.length) return { videos: [], warnings };

  const header = rows[0].map((h) => collapse(h).toLowerCase());
  // Google answers a request for a tab that does not exist with the first
  // tab, Retreats. That just means the Video review tab is not there yet.
  if (header.includes("start") && header.includes("status")) {
    warnings.push(`No "${TAB_NAME}" tab in the sheet, so no video is shown.`);
    return { videos: [], warnings };
  }
  const nameAt = header.indexOf("name");
  const linkAt = header.findIndex((h) => LINK_HEADINGS.includes(h));
  if (nameAt === -1 || linkAt === -1) {
    warnings.push(`The "${TAB_NAME}" tab needs a Name and a YouTube link column. ` +
      `Its heading row reads: ${header.map((h) => `"${h}"`).join(", ")}.`);
    return { videos: [], warnings };
  }

  const videos = [];
  rows.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const name = collapse(cells[nameAt]).slice(0, 80);
    const link = collapse(cells[linkAt]);
    if (!name && !link) return; // blank row
    const id = youtubeId(link);
    if (!id) {
      warnings.push(`Video row ${line}: "${link}" is not a YouTube video link. Row skipped.`);
      return;
    }
    videos.push({ name, id, vertical: /\/shorts\//i.test(link) });
  });

  if (videos.length > MAX_VIDEOS) {
    warnings.push(`${videos.length} videos in the sheet, only the first ${MAX_VIDEOS} are shown.`);
  }
  return { videos: videos.slice(0, MAX_VIDEOS), warnings };
}

const TIMEOUT_MS = 15000;

/**
 * Ask YouTube about the video: whether it can be embedded at all (a private
 * or deleted video answers 401/404), and its shape, so a phone-recorded
 * vertical video gets a tall frame instead of black bars. A network failure
 * keeps the video with a 16:9 frame rather than dropping it.
 */
export async function checkVideo(video, { fetchImpl = fetch, warnings = [] } = {}) {
  const watch = `https://www.youtube.com/watch?v=${video.id}`;
  try {
    const res = await fetchImpl(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
      { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      warnings.push(`Video "${video.name || video.id}" is private, deleted or does not allow embedding ` +
        `(YouTube replied ${res.status}). Set it to Unlisted or Public. Skipped.`);
      return null;
    }
    if (!res.ok) throw new Error(`YouTube replied ${res.status}`);
    const info = await res.json();
    const vertical = video.vertical || (info.height > info.width);
    return { ...video, vertical };
  } catch (err) {
    warnings.push(`Could not check video "${video.name || video.id}" (${err.message}). Showing it anyway.`);
    return video;
  }
}

async function fetchTab(url, fetchImpl) {
  const res = await fetchImpl(pinHeaderRow(url), { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: "follow" });
  if (!res.ok) throw new Error(`the sheet replied ${res.status}`);
  const text = await res.text();
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error("the sheet returned a web page, not CSV");
  return text;
}

let cached = null;

/** Test hook. The cache is per process, so a build fetches the tab once. */
export function resetVideosCache() {
  cached = null;
}

/**
 * The whole pipeline: fetch, parse, check each video with YouTube.
 * Resolves to [] on any problem, after saying why in the build log.
 */
export async function loadVideos({
  url = process.env.VIDEOS_SHEET_URL || videoTabUrl(process.env.REVIEWS_SHEET_URL),
  fetchImpl = fetch,
} = {}) {
  if (cached) return cached;
  cached = (async () => {
    if (!url) return [];
    const warnings = [];
    let videos = [];
    try {
      const text = /^https?:/i.test(url) ? await fetchTab(url, fetchImpl) : await readFile(url, "utf8");
      const built = buildVideos(parseCsv(text));
      warnings.push(...built.warnings);
      for (const video of built.videos) {
        const checked = /^https?:/i.test(url) ? await checkVideo(video, { fetchImpl, warnings }) : video;
        if (checked) videos.push(checked);
      }
    } catch (err) {
      warnings.push(`Could not read the "${TAB_NAME}" tab (${err.message}). No video is shown.`);
      videos = [];
    }
    for (const warning of warnings) console.warn(`[videos] ${warning}`);
    console.log(`[videos] ${videos.length} video(s).`);
    return videos;
  })();
  return cached;
}
