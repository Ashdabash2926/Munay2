// scripts/check-i18n-parity.mjs — fails if es/fa miss any en key or have empty values
import { readFileSync } from "node:fs";
const flat = (o, p = "", out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    const key = p ? `${p}.${k}` : k;
    if (v && typeof v === "object") flat(v, key, out); else out[key] = v;
  }
  return out;
};
const en = flat(JSON.parse(readFileSync("content/i18n/en.json")));
let bad = 0;
for (const lang of ["es", "fa"]) {
  const t = flat(JSON.parse(readFileSync(`content/i18n/${lang}.json`)));
  const missing = Object.keys(en).filter(k => !(k in t));
  const empty = Object.keys(t).filter(k => !String(t[k]).trim());
  if (missing.length || empty.length) {
    bad++;
    console.error(`[${lang}] missing: ${missing.join(", ") || "none"}`);
    console.error(`[${lang}] empty: ${empty.join(", ") || "none"}`);
  } else console.log(`[${lang}] OK — ${Object.keys(t).length} keys`);
}
process.exit(bad ? 1 : 0);
