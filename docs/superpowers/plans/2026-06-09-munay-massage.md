# Munay Holistic Massage Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a warm, calming, trilingual (EN/ES/FA) four-page holistic-massage website for Písac, Sacred Valley, with parallax scrolling and scroll animations.

**Architecture:** Flat static site (no build). Four HTML pages share a nav/footer injected by JS, a trilingual i18n layer with true RTL flip for Farsi, and a CSS-variable design system. Parallax uses CSS scroll-driven animation with an IntersectionObserver fallback; scroll-reveals use IntersectionObserver.

**Tech Stack:** HTML5, Tailwind CDN, CSS custom properties, vanilla JS, Google Fonts (Cormorant/Fraunces + Barlow + Vazirmatn). Deploys to GitHub Pages.

**Verification note:** No test framework. Each task's verification = open the page in a browser (`open <file>`) and confirm the described behaviour. Commit after each task.

---

## File structure

- `index.html` — Home
- `about.html` — About (incl. oils/aromatherapy narrative)
- `treatments.html` — Treatments menu
- `contact.html` — Contact + form + map
- `css/styles.css` — design tokens, parallax/reveal styles, RTL overrides
- `js/i18n.js` — translation dictionary + language switcher (EN/ES/FA, RTL, localStorage)
- `js/site.js` — injects shared nav + footer; wires scroll-reveal + parallax
- `assets/` — images, logo, favicon
- `README.md` — project notes + placeholder checklist

---

## Task 1: Scaffold + design tokens

**Files:**
- Create: `css/styles.css`
- Create: `index.html` (shell only)
- Create: `README.md`

- [ ] **Step 1: Create `css/styles.css` with design tokens, base, reveal/parallax, RTL**

```css
:root {
  --clay: #c2683f;        /* terracotta accent */
  --clay-dark: #a4502c;
  --clay-light: #d98c63;
  --gold: #d8a657;        /* muted Andean gold */
  --cream: #f6efe7;       /* page background */
  --cream-2: #efe4d6;
  --cocoa: #2e211a;       /* deep feature sections */
  --cocoa-2: #3d2c22;
  --text: #2e211a;
  --text-inv: #f6efe7;
  --muted: #6f5d50;
  --border: #e0d2c2;
  --serif: 'Cormorant Garamond', Georgia, serif;
  --sans: 'Barlow', system-ui, sans-serif;
  --fa: 'Vazirmatn', 'Barlow', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background: var(--cream); color: var(--text); font-family: var(--sans);
  overflow-x: hidden; -webkit-font-smoothing: antialiased; line-height: 1.6; }
h1,h2,h3,h4 { font-family: var(--serif); font-weight: 600; line-height: 1.1; }
img { display: block; max-width: 100%; }
::selection { background: var(--clay); color: #fff; }
a { color: inherit; text-decoration: none; }

/* Farsi: switch font; RTL handled by [dir="rtl"] */
html[lang="fa"] body { font-family: var(--fa); }

/* Scroll-reveal */
.reveal { opacity: 0; transform: translateY(28px);
  transition: opacity .8s ease, transform .8s ease; }
.reveal.is-visible { opacity: 1; transform: none; }

/* Parallax band: CSS scroll-driven with fallback */
.parallax { position: relative; overflow: hidden; }
.parallax__img { position: absolute; inset: -12% 0; width: 100%; height: 124%;
  object-fit: cover; will-change: transform; }
@supports (animation-timeline: scroll()) {
  .parallax__img { animation: parallax-rise linear both;
    animation-timeline: view(); animation-range: cover 0% cover 100%; }
  @keyframes parallax-rise { from { transform: translateY(-8%); } to { transform: translateY(8%); } }
}

/* RTL overrides */
[dir="rtl"] .flip-x { transform: scaleX(-1); }

@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .reveal { opacity: 1 !important; transform: none !important; transition: none; }
  .parallax__img { animation: none !important; transform: none !important; }
}
```

- [ ] **Step 2: Create `index.html` shell**

```html
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Munay · Holistic Massage — Sacred Valley, Písac</title>
  <meta name="description" content="Holistic massage in Písac, Sacred Valley. Relax, restore and rebalance body, mind and spirit." />
  <meta property="og:title" content="Munay · Holistic Massage" />
  <meta property="og:description" content="Holistic massage in Písac, Sacred Valley, Cusco." />
  <meta property="og:image" content="assets/og.jpg" />
  <link rel="icon" href="assets/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600&family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Vazirmatn:wght@400;500;600&display=swap" rel="stylesheet" />
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="css/styles.css" />
</head>
<body>
  <div id="site-nav"></div>
  <main id="page-home"><!-- Task 4 fills this --></main>
  <div id="site-footer"></div>
  <script src="js/i18n.js"></script>
  <script src="js/site.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create `README.md`** documenting the placeholder checklist (brand name, prices, WhatsApp number, map coords, real photos).

- [ ] **Step 4: Verify** — `open index.html`; cream background renders, fonts load, no console errors (nav/footer empty for now).

- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: scaffold + design tokens"`

---

## Task 2: i18n layer (`js/i18n.js`)

**Files:** Create `js/i18n.js`

- [ ] **Step 1: Create the dictionary + switcher.** Keys cover nav, footer, and per-page content (filled as pages are built; start with nav/footer/common keys). Skeleton:

```js
const I18N = {
  en: {
    "nav.home":"Home","nav.about":"About","nav.treatments":"Treatments","nav.contact":"Contact",
    "cta.book":"Book Now","brand.tagline":"Holistic Massage · Sacred Valley",
    "footer.rights":"All rights reserved.","footer.location":"Písac, Sacred Valley, Cusco — Peru"
  },
  es: {
    "nav.home":"Inicio","nav.about":"Nosotros","nav.treatments":"Tratamientos","nav.contact":"Contacto",
    "cta.book":"Reservar","brand.tagline":"Masaje Holístico · Valle Sagrado",
    "footer.rights":"Todos los derechos reservados.","footer.location":"Písac, Valle Sagrado, Cusco — Perú"
  },
  fa: {
    "nav.home":"خانه","nav.about":"درباره","nav.treatments":"خدمات","nav.contact":"تماس",
    "cta.book":"رزرو","brand.tagline":"ماساژ هولیستیک · درهٔ مقدس",
    "footer.rights":"تمام حقوق محفوظ است.","footer.location":"پیساک، درهٔ مقدس، کوسکو — پرو"
  }
};
const RTL = new Set(["fa"]);
function applyLang(lang){
  if(!I18N[lang]) lang = "en";
  const html = document.documentElement;
  html.lang = lang; html.dir = RTL.has(lang) ? "rtl" : "ltr";
  document.querySelectorAll("[data-i18n]").forEach(el=>{
    const k = el.getAttribute("data-i18n"); if(I18N[lang][k]!=null) el.textContent = I18N[lang][k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el=>{
    const k = el.getAttribute("data-i18n-ph"); if(I18N[lang][k]!=null) el.placeholder = I18N[lang][k];
  });
  document.querySelectorAll(".lang-btn").forEach(b=>
    b.setAttribute("aria-pressed", String(b.dataset.lang===lang)));
  try{ localStorage.setItem("munay-lang", lang); }catch(e){}
}
function initLang(){
  let saved="en"; try{ saved = localStorage.getItem("munay-lang")||"en"; }catch(e){}
  applyLang(saved);
}
window.MunayI18N = { applyLang, initLang, I18N };
```

- [ ] **Step 2: Verify** — temporarily add `<span data-i18n="nav.home"></span>` to `index.html`, open it, run `MunayI18N.applyLang('es')` in console → text becomes "Inicio"; `applyLang('fa')` → `<html dir="rtl">` and Farsi text. Remove the temp span.

- [ ] **Step 3: Commit** — `git commit -am "feat: trilingual i18n with RTL + localStorage"`

---

## Task 3: Shared nav + footer + motion wiring (`js/site.js`)

**Files:** Create `js/site.js`

- [ ] **Step 1: Build nav + footer injection + language switcher + motion.**

```js
(function(){
  const page = document.body.dataset.page || "home";
  const links = [["home","index.html"],["about","about.html"],
                 ["treatments","treatments.html"],["contact","contact.html"]];
  const navLinks = links.map(([k,href])=>
    `<a href="${href}" data-i18n="nav.${k}" class="px-3 py-2 text-sm tracking-wide uppercase ${k===page?'text-[var(--clay)]':''}">${k}</a>`).join("");
  const langBtns = ["en","es","fa"].map(l=>
    `<button class="lang-btn px-2 text-xs uppercase" data-lang="${l}">${l==='fa'?'فا':l}</button>`).join("");

  document.getElementById("site-nav").innerHTML = `
    <nav id="navbar" class="fixed top-0 inset-x-0 z-50 transition-all">
      <div class="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
        <a href="index.html" class="font-[var(--serif)] text-2xl tracking-wide">Munay</a>
        <div class="hidden md:flex items-center gap-1">${navLinks}</div>
        <div class="flex items-center gap-3">
          <div class="flex gap-1 border border-[var(--border)] rounded-full px-1">${langBtns}</div>
          <a href="contact.html" data-i18n="cta.book" class="hidden sm:inline-block bg-[var(--clay)] text-white text-sm px-4 py-2 rounded-full">Book Now</a>
          <button id="navToggle" class="md:hidden text-2xl" aria-label="Menu">☰</button>
        </div>
      </div>
      <div id="mobileMenu" class="md:hidden hidden bg-[var(--cream)] border-t border-[var(--border)] px-5 py-3 flex-col gap-2">${navLinks}</div>
    </nav>`;

  document.getElementById("site-footer").innerHTML = `
    <footer class="bg-[var(--cocoa)] text-[var(--text-inv)] mt-0">
      <div class="max-w-6xl mx-auto px-5 py-12 grid sm:grid-cols-3 gap-8">
        <div><div class="text-2xl font-[var(--serif)]">Munay</div>
          <p class="text-sm opacity-70 mt-2" data-i18n="brand.tagline">Holistic Massage · Sacred Valley</p></div>
        <div class="text-sm opacity-80"><p data-i18n="footer.location">Písac, Sacred Valley, Cusco — Peru</p></div>
        <div class="text-sm"><a href="contact.html" data-i18n="cta.book" class="underline">Book Now</a></div>
      </div>
      <div class="text-center text-xs opacity-50 pb-6"><span data-i18n="footer.rights">All rights reserved.</span> · Munay</div>
    </footer>`;

  // language switcher
  document.querySelectorAll(".lang-btn").forEach(b=>
    b.addEventListener("click",()=>window.MunayI18N.applyLang(b.dataset.lang)));
  // mobile menu
  const t=document.getElementById("navToggle"), m=document.getElementById("mobileMenu");
  if(t) t.addEventListener("click",()=>{ m.classList.toggle("hidden"); m.classList.toggle("flex"); });
  // navbar scrolled state
  const nav=document.getElementById("navbar");
  const onScroll=()=> nav.classList.toggle("backdrop-blur", window.scrollY>20)||
    nav.style.setProperty("background", window.scrollY>20 ? "rgba(246,239,231,.9)" : "transparent");
  onScroll(); window.addEventListener("scroll",onScroll,{passive:true});

  // scroll-reveal
  const io=new IntersectionObserver((es)=>es.forEach(e=>{
    if(e.isIntersecting){ e.target.classList.add("is-visible"); io.unobserve(e.target);} }),
    {threshold:.15});
  document.querySelectorAll(".reveal").forEach(el=>io.observe(el));

  // IO parallax fallback (only when CSS scroll-timeline unsupported)
  if(!CSS.supports("animation-timeline: scroll()")){
    const imgs=[...document.querySelectorAll(".parallax__img")];
    const tick=()=>imgs.forEach(img=>{
      const r=img.parentElement.getBoundingClientRect();
      const p=(r.top+r.height/2 - innerHeight/2)/innerHeight;
      img.style.transform=`translateY(${(-p*16).toFixed(1)}%)`;
    });
    tick(); addEventListener("scroll",tick,{passive:true});
  }

  window.MunayI18N.initLang();
})();
```

- [ ] **Step 2: Add `data-page` to `<body>`** of `index.html`: `<body data-page="home">`.

- [ ] **Step 3: Verify** — `open index.html`; nav + footer appear, language buttons switch all three languages incl. RTL, mobile menu toggles at narrow width, navbar gains background on scroll.

- [ ] **Step 4: Commit** — `git commit -am "feat: shared nav/footer + i18n switcher + scroll motion"`

---

## Task 4: Home page content

**Files:** Modify `index.html` (`<main id="page-home">`), add keys to `js/i18n.js`

- [ ] **Step 1: Add Home i18n keys** (en/es/fa) for: `home.hero.kicker`, `home.hero.title`, `home.hero.sub`, `home.mission.title`, `home.mission.body`, `home.featured.title`, three treatment names/blurbs, `home.escape.title`, `home.testimonial.quote`, `home.testimonial.name`, `home.cta.title`. (Provide full translations for all three languages — no placeholders in code; business facts like prices stay as visible placeholder text.)

- [ ] **Step 2: Build the Home `<main>`**: hero (`.parallax` with `.parallax__img` + overlaid kicker/title/sub + Book CTA), mission teaser, 3 featured-treatment cards (each `.reveal`), full-width `.parallax` "your escape" band, one testimonial, closing CTA band. Use Tailwind utility classes + the CSS-variable palette. Use curated Unsplash spa/orchid image URLs as placeholders (note in README to replace).

- [ ] **Step 3: Verify** — `open index.html`; hero parallax moves on scroll, sections fade in, all three languages render correctly (incl. RTL mirroring), responsive at mobile width.

- [ ] **Step 4: Commit** — `git commit -am "feat: home page"`

---

## Task 5: About page (`about.html`)

**Files:** Create `about.html`, add About i18n keys

- [ ] **Step 1:** Copy the shell from `index.html`, set `<body data-page="about">`, `<title>`/meta for About, `<main id="page-about">`.

- [ ] **Step 2: Add About i18n keys** (en/es/fa): philosophy title/body, oils & aromatherapy ritual title/body, Sacred Valley setting title/body. Full translations.

- [ ] **Step 3: Build content** — intro hero (smaller `.parallax`), philosophy section, oils/aromatherapy narrative with imagery, Sacred Valley setting block. All sections `.reveal`.

- [ ] **Step 4: Verify** — `open about.html`; nav highlights About, content + motion + 3 languages work.

- [ ] **Step 5: Commit** — `git commit -am "feat: about page"`

---

## Task 6: Treatments page (`treatments.html`)

**Files:** Create `treatments.html`, add Treatments i18n keys

- [ ] **Step 1:** Shell from `index.html`, `<body data-page="treatments">`, meta, `<main id="page-treatments">`.

- [ ] **Step 2: Add i18n keys** for page title/intro and the five treatments (name + description each, en/es/fa). Durations/prices are visible placeholder text (e.g. "60 min · S/ XXX").

- [ ] **Step 3: Build content** — intro band + a responsive grid of five treatment cards, each with a `.parallax`-revealed image, name, blurb, duration/price placeholder, and a Book CTA. Cards `.reveal`.

- [ ] **Step 4: Verify** — `open treatments.html`; cards render, parallax + reveals + 3 languages work, RTL mirrors grid.

- [ ] **Step 5: Commit** — `git commit -am "feat: treatments page"`

---

## Task 7: Contact page (`contact.html`)

**Files:** Create `contact.html`, add Contact i18n keys

- [ ] **Step 1:** Shell, `<body data-page="contact">`, meta, `<main id="page-contact">`.

- [ ] **Step 2: Add i18n keys** for headings, form labels/placeholders (`data-i18n-ph`), hours, WhatsApp CTA (en/es/fa).

- [ ] **Step 3: Build content** — location block with embedded Google Maps iframe (Písac placeholder query), hours, WhatsApp/booking CTA (placeholder `https://wa.me/XXXXXXXXX`), and a contact form (name/email/message) with `action="#"` placeholder and `required` fields. Form labels use `data-i18n`, inputs use `data-i18n-ph`.

- [ ] **Step 4: Verify** — `open contact.html`; map shows, form renders, placeholders translate across languages, RTL correct.

- [ ] **Step 5: Commit** — `git commit -am "feat: contact page"`

---

## Task 8: Cross-page QA + polish

**Files:** touch any of the above as needed

- [ ] **Step 1:** Click through all four pages in EN, ES, FA. Confirm: language choice persists across navigation (localStorage), active nav link correct per page, no console errors.
- [ ] **Step 2:** Test `prefers-reduced-motion` (DevTools rendering emulation) — parallax/reveals disabled, content visible.
- [ ] **Step 3:** Test RTL on every page — layout mirrors, text aligns right, no overflow.
- [ ] **Step 4:** Responsive pass at 375px / 768px / 1280px.
- [ ] **Step 5: Commit** — `git commit -am "fix: cross-page i18n/RTL/motion/responsive QA"`

---

## Task 9: Assets, favicon, OG card

**Files:** Create `assets/favicon.svg`, `assets/og.jpg` (or note placeholder)

- [ ] **Step 1:** Add a simple SVG favicon (clay circle / orchid mark). Reference real or curated placeholder images consistently; document replacements in `README.md`.
- [ ] **Step 2:** Verify favicon shows and OG meta references resolve.
- [ ] **Step 3: Commit** — `git commit -am "chore: favicon + OG assets"`

---

## Task 10: Deploy to GitHub Pages

- [ ] **Step 1:** Create GitHub repo `Ashdabash2926/munay-massage`, add remote, push `main`.
- [ ] **Step 2:** Enable GitHub Pages (main branch, root) in repo settings.
- [ ] **Step 3:** Verify the live URL renders all four pages.
- [ ] **Step 4:** Update `README.md` with the live URL; commit + push.

---

## Self-review notes

- **Spec coverage:** 4 pages (T4–7), trilingual+RTL (T2, every content task), parallax+reveal+reduced-motion (T1, T3, T8), shared chrome via JS (T3), palette/typography (T1), placeholders (README + visible text), deploy (T10). All spec sections mapped.
- **Type consistency:** `MunayI18N.applyLang/initLang`, `.reveal/.is-visible`, `.parallax/.parallax__img`, `data-i18n/data-i18n-ph`, `data-page` used consistently across tasks.
- **Placeholders:** business facts (prices, phone, brand) are intentionally visible placeholders per the approved spec; no code-level TODOs.
