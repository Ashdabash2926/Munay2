// Shared i18n dictionary builder.
// Used by BOTH i18n.11ty.js (generates the client-side js/i18n.js) and
// eleventy.config.mjs (build-time prerender of default-language text into HTML),
// so the two can never drift.
//
//   - nested content/i18n/{en,es,fa}.json flattened back to dotted keys
//   - ".word" alias keys folded back (pillar.N, contact.form.*)
//   - one generated retreat.dates.N key per upcoming retreat, in every language

import { readFileSync } from "node:fs";
import { loadRetreats } from "./retreats.mjs";

const flatten = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

export async function buildDict() {
  const dict = {};
  for (const lang of ["en", "es", "fa"]) {
    const flat = flatten(JSON.parse(readFileSync(`content/i18n/${lang}.json`, "utf8")));
    for (const k of Object.keys(flat)) {
      if (k.endsWith(".word")) {
        flat[k.slice(0, -".word".length)] = flat[k];
        delete flat[k];
      }
    }
    dict[lang] = flat;
  }

  // One generated key per upcoming retreat card, so the existing language
  // switcher swaps its date range with no extra client-side code.
  const retreats = await loadRetreats();
  for (const lang of ["en", "es", "fa"]) {
    for (const retreat of retreats) {
      dict[lang][`retreat.dates.${retreat.index}`] = retreat.dates[lang];
    }
  }
  return dict;
}
