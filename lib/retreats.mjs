// Upcoming retreats, read from a Google Sheet at build time.
// Spec: docs/superpowers/specs/2026-07-28-upcoming-retreats-design.md
//
// Nothing here escapes HTML: Nunjucks autoescapes at render. Sanitising here
// means trimming, collapsing whitespace and capping length.

/** The eight columns the sheet must have, lowercased. */
export const COLUMNS = ["name", "start", "end", "location", "cost", "link", "image", "status"];

/**
 * Minimal RFC 4180 CSV reader. Google's CSV export quotes any field holding a
 * comma, a quote or a newline, so those three cases are the ones that matter.
 */
export function parseCsv(text) {
  const src = String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c !== '"') { field += c; continue; }
      if (src[i + 1] === '"') { field += '"'; i++; continue; }
      quoted = false;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows;
}
