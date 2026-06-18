// Generates js/i18n.js from the CMS-edited content files.
// The runtime (applyLang etc.) is identical to the original hand-written file;
// only the dictionary is now assembled at build time (see lib/i18n-dict.mjs).

import { buildDict } from "./lib/i18n-dict.mjs";

const RUNTIME = `
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
  try { localStorage.setItem("parastoo-lang", lang); } catch (e) {}
}

function initLang() {
  let saved = "en";
  try { saved = localStorage.getItem("parastoo-lang") || "en"; } catch (e) {}
  applyLang(saved);
}

window.ParastooI18N = { applyLang, initLang, I18N };
`;

export default class {
  data() {
    return { permalink: "js/i18n.js", eleventyExcludeFromCollections: true };
  }

  render() {
    const dict = buildDict();
    return `/* Parastoo — trilingual dictionary (EN / ES / FA) + language switcher.
   GENERATED FILE — edit content/i18n/*.json instead. */

const I18N = ${JSON.stringify(dict, null, 2)};
` + RUNTIME;
  }
}
