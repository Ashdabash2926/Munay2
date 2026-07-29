// Print what the site would render from a retreats sheet, without a build.
//
//   node scripts/check-retreats.mjs                       (uses RETREATS_SHEET_URL)
//   node scripts/check-retreats.mjs docs/fixtures/retreats-sample.csv

import { loadRetreats } from "../lib/retreats.mjs";

const url = process.argv[2] || process.env.RETREATS_SHEET_URL;
if (!url) {
  console.error("No sheet. Pass a path or URL, or set RETREATS_SHEET_URL.");
  process.exit(1);
}

try {
  const retreats = await loadRetreats({ url, outDir: ".retreats-check" });
  if (!retreats.length) console.log("No upcoming retreats. The page would show the evergreen block.");
  for (const r of retreats) {
    console.log(`\n${r.index}. ${r.name}`);
    console.log(`   ${r.dates.en}`);
    console.log(`   ${r.dates.es}`);
    console.log(`   ${r.dates.fa}`);
    console.log(`   ${r.location}${r.cost ? ` · ${r.cost}` : ""}${r.statusKey ? ` · ${r.statusKey}` : ""}`);
    console.log(`   ${r.url}`);
    console.log(`   image: ${r.image}`);
  }
} catch (err) {
  console.error(`\nThe build would FAIL and the previous deploy would stay live:\n  ${err.message}`);
  process.exit(1);
}
