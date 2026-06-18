// Shared i18n dictionary builder.
// Used by BOTH i18n.11ty.js (generates the client-side js/i18n.js) and
// eleventy.config.mjs (build-time prerender of default-language text into HTML),
// so the two can never drift.
//
//   - nested content/i18n/{en,es,fa}.json flattened back to dotted keys
//   - ".word" alias keys folded back (pillar.N, contact.form.*)

import { readFileSync } from "node:fs";

const flatten = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

export function buildDict() {
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
  return dict;
}
