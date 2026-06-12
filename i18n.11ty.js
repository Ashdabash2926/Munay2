// Generates js/i18n.js from the CMS-edited content files.
// The runtime (applyLang etc.) is identical to the original hand-written file;
// only the dictionary is now assembled at build time:
//   - nested content/i18n/{en,es,fa}.json flattened back to dotted keys
//   - ".word" alias keys folded back (pillar.N, contact.form.*)
//   - treat.tN.meta composed as "<duration> · S/ <price>" (price shared per
//     treatment across languages, from content/site.json)
//   - home.tN.{name,meta} mirrored from the featured treatments (site.featured)

import { readFileSync } from "node:fs";

const flatten = (obj, prefix = "", out = {}) => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
};

export default class {
  data() {
    return { permalink: "js/i18n.js", eleventyExcludeFromCollections: true };
  }

  render() {
    const site = JSON.parse(readFileSync("content/site.json", "utf8"));
    const dict = {};
    for (const lang of ["en", "es", "fa"]) {
      const flat = flatten(JSON.parse(readFileSync(`content/i18n/${lang}.json`, "utf8")));
      // fold ".word" aliases back to their original colliding keys
      for (const k of Object.keys(flat)) {
        if (k.endsWith(".word")) {
          flat[k.slice(0, -".word".length)] = flat[k];
          delete flat[k];
        }
      }
      // compose treatment meta lines; duration is per-language, price shared
      for (const n of [1, 2, 3, 4, 5]) {
        flat[`treat.t${n}.meta`] = `${flat[`treat.t${n}.duration`]} · S/ ${site.prices[`t${n}`]}`;
        delete flat[`treat.t${n}.duration`];
      }
      // homepage featured cards mirror their treatment's name + meta
      site.featured.forEach((t, i) => {
        flat[`home.t${i + 1}.name`] = flat[`treat.t${t}.name`];
        flat[`home.t${i + 1}.meta`] = flat[`treat.t${t}.meta`];
      });
      dict[lang] = flat;
    }

    return `/* Munay — trilingual dictionary (EN / ES / FA) + language switcher.
   GENERATED FILE — edit content/i18n/*.json and content/site.json instead.
   Elements opt in via data-i18n (textContent) and data-i18n-ph (placeholder).
   Farsi triggers a true RTL flip via <html dir="rtl">. */

const I18N = ${JSON.stringify(dict, null, 2)};

const RTL = new Set(["fa"]);

function applyLang(lang) {
  if (!I18N[lang]) lang = "en";
  const html = document.documentElement;
  html.lang = lang;
  html.dir = RTL.has(lang) ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (I18N[lang][k] != null) el.textContent = I18N[lang][k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const k = el.getAttribute("data-i18n-ph");
    if (I18N[lang][k] != null) el.placeholder = I18N[lang][k];
  });
  document.querySelectorAll(".lang-btn").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  try { localStorage.setItem("munay-lang", lang); } catch (e) {}
}

function initLang() {
  let saved = "en";
  try { saved = localStorage.getItem("munay-lang") || "en"; } catch (e) {}
  applyLang(saved);
}

window.MunayI18N = { applyLang, initLang, I18N };
`;
  }
}
