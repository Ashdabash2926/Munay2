# Parastoo Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-architect the existing Munay massage site into a 6-page trilingual site for Parastoo (embodiment, plant medicine, bodywork, ceremony, retreats, private chef), keeping the "Earthen Sanctuary" visual system.

**Architecture:** Eleventy build. Templates (`*.html`, Nunjucks) read `{{ site.x }}` from `content/site.json`; all visible text lives in `content/i18n/{en,es,fa}.json` and is compiled to `js/i18n.js` by `i18n.11ty.js`. `js/site.js` injects shared nav/footer + motion + hero rotator. Build → `_site/`. We rewrite content, brand, page structure, and strip massage/Peru-specific build logic — touching no design tokens, fonts, or motion systems.

**Tech Stack:** Eleventy 3, Nunjucks, Tailwind (CDN), vanilla JS, CSS custom properties, trilingual JSON i18n (EN/ES/FA with RTL).

## Global Constraints

- `npm run build` MUST succeed with no Nunjucks/i18n errors; output in `_site/`.
- Trilingual parity: every flattened key in `en.json` MUST exist in `es.json` and `fa.json` (verified by the parity script in Task 14).
- Brand wordmark is **Parastoo** everywhere. No "Munay".
- No Peru references anywhere in shipped output: `Munay`, `Písac`, `Pisac`, `Sacred Valley`, `Valle Sagrado`, `Cusco`, `Quechua`, `Andean`, soles pricing (`S/`).
- No prices shown anywhere. No named in-person city/studio (use "in person & online").
- Contact: WhatsApp `+14168371650` (raw `14168371650` for `wa.me`), email `Parastoovii@gmail.com`, Instagram `@Heldbyparas` (`https://instagram.com/heldbyparas`).
- Keep all design tokens, fonts, palette, motion, film grain, reduced-motion, RTL, focus states, and mobile-nav behaviour intact.
- Plant-medicine copy stays in the client's trauma-informed, consent-first voice; every CTA routes to the free discovery call / WhatsApp / email — never a "buy now".
- Source of truth for all prose: `docs/superpowers/specs/parastoo-brief.md` (created in Task 1). Use the client's wording **verbatim** — fix only grammar/spelling, never reword, condense, or trim. Paste her full paragraphs and full lists into the i18n keys.
- Work on branch `redesign-parastoo`. Do not push until the user asks.

## Verbatim Copy Rules (apply to every content task)

1. **Use the client's wording exactly as written in `parastoo-brief.md`.** The ONLY permitted changes are grammar and spelling corrections (and obvious typo/spacing fixes). Do not reword, summarise, shorten, or "improve" her prose.
2. Each offering keeps its **full intro prose**, its **complete "may support you in" / "what's included" / "available for" list** (every bullet, not a subset), and its **"The Invitation" closing passage**. Layout adds structure; words stay hers.
3. The **Meet Parastoo** story is reproduced **whole**.
4. Preserve her em-dash, lowercase-poetic cadence and line breaks where they carry meaning.
5. Trademark: write **The Embodied Plant Medicine Method™** with the ™ as she does.
6. Because lists are full, key counts vary per offering — use `sN` / `incN` / `aN` running as far as the brief's list goes (e.g. mentor.1 has 10 support bullets → `s1..s10`). Add an `invite` key per offering for the closing "Invitation" passage where present.
7. The only NEW copy you may write is short structural connective tissue the brief doesn't provide: nav labels, sub-nav labels, meta/format labels (no price), button text, and `<title>`/meta-description SEO. Keep these minimal and factual.

## Key namespace (target `en.json` shape)

Keep the existing `pillar.N.{word,desc}` + `.word` alias mechanism (reused for the five realms — saves touching the rotator + fold logic). New/renamed namespaces:

```
nav: home, about, offerings, retreats, faq, contact
cta: book ("Book a free call"), call ("Book a discovery call"), whatsapp ("Message on WhatsApp"), explore ("Explore the work")
brand: tagline
footer: blurb, explore, connect, location, rights
pillar.1..5: { word, desc }            # the five realms (Mentorship, Embodied Plant Medicine, Bodywork, Ceremony, Retreats)
home.hero: { kicker, lead, sub, cta2 }
home.pillars: { kicker, title }         # "Five realms..." section header
home.mission: { kicker, title, body, link }   # Meet Parastoo teaser
home.featured: { kicker, title, all }
home.f1..f3: { name, blurb, meta }      # 3 static featured cards
home.escape: { kicker, title, sub }     # The Way Home retreat teaser
home.values: { kicker, title, sub }     # values teaser
home.testimonial: { quote, name }       # PLACEHOLDER (see Task 3)
home.cta: { title, sub }
about.hero: { kicker, title, sub }
about.story: { kicker, title, p1..p8 }  # Meet Parastoo
about.values: { kicker, title, intro }
about.v1..v10: { name, desc }           # the 10 values
about.cta: { title, sub }
offer.hero: { kicker, title, sub }
offer.nav: { mentorship, method, bodywork, ceremony, chef }
offer.mentorship: { kicker, title, intro }
mentor.1..4: { name, meta, intro, s1..s5 }
offer.method: { kicker, title, intro, medicines, m1..m5(support), close }   # method.s1..s5 via offer.method.s1..s5
offer.bodywork: { kicker, title, intro }
body.1..3: { name, meta, desc }
offer.ceremony: { kicker, title, intro, s1..s5(support), inc1..inc8(included) }
offer.chef: { kicker, title, intro, a1..a5(available-for) }
offer.cta: { title, sub }
retreat.hero: { kicker, title, sub }
retreat.intro: { dates, location, body }
retreat.support: { title, s1..s5 }
retreat.included: { title, i1..i6 }
retreat.cta: { title, sub, button }
faq.hero: { kicker, title, sub }
faq.q1..q15: { q, a }
faq.cta: { title, sub }
contact.hero: { kicker, title, sub }
contact.call: { title, body }            # free discovery call
contact.wa: { title, body }
contact.ig: { title, body }
contact.email: { title, body }
contact.form: { title, name.word, name.ph, email.word, email.ph, message.word, message.ph, submit, note }
```

(Removed entirely: `treat.*`, `about.phil.*`, `about.oil*`, `about.valley.*`, `contact.visit.*`, `contact.hours.*`, `home.t1..3.blurb`, `prices`, `featured`.)

---

### Task 1: Branch, capture brief, rework the build pipeline

**Files:**
- Create: `docs/superpowers/specs/parastoo-brief.md` (verbatim client brief)
- Modify: `i18n.11ty.js` (strip massage logic)
- Modify: `content/site.json` (restructure)
- Verify: `eleventy.config.mjs` (no change needed — confirm)

**Interfaces:**
- Produces: a build that compiles `content/i18n/*.json` straight to `js/i18n.js` with the `.word` fold intact and NO price/treatment/featured composition; `site.json` exposing `hero.slide1..5`, `escape.image`, `contact.{whatsapp,email,instagram}`, `retreat.bookingUrl`.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b redesign-parastoo
```

- [ ] **Step 2: Save the client brief verbatim**

Create `docs/superpowers/specs/parastoo-brief.md` and paste the full client brief text (hero line, Meet Parastoo, all offerings, retreat, chef, values, FAQ, contact) exactly as supplied. This is the prose source of truth for all content tasks.

- [ ] **Step 3: Strip massage logic from `i18n.11ty.js`**

Remove the price-meta loop (`treat.tN.meta`/`duration`) and the `site.featured` mirror loop. Keep flatten + `.word` fold. The `render()` becomes:

```js
  render() {
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
    return `/* Parastoo — trilingual dictionary (EN / ES / FA) + language switcher.
   GENERATED FILE — edit content/i18n/*.json instead. */

const I18N = ${JSON.stringify(dict, null, 2)};
` + RUNTIME;
  }
```

Move the unchanged runtime (the `RTL`/`applyLang`/`initLang`/`window.MunayI18N` block) into a `const RUNTIME = \`...\`` above the class, renaming the global to `window.ParastooI18N` AND keeping a `window.MunayI18N = window.ParastooI18N` alias (site.js still calls `MunayI18N` until Task 2 updates it — update both in the same pass to avoid a window where it breaks). Delete the now-unused `const site = ...` read.

- [ ] **Step 4: Restructure `content/site.json`**

```json
{
  "contact": {
    "whatsapp": "14168371650",
    "email": "Parastoovii@gmail.com",
    "instagram": "heldbyparas"
  },
  "retreat": { "bookingUrl": "#" },
  "hero": {
    "slide1": "assets/img/hero-wellness.webp",
    "slide2": "assets/img/hero-coaching.webp",
    "slide3": "assets/img/hero-yoga.webp",
    "slide4": "assets/img/hero-retreats.webp",
    "slide5": "assets/img/hero-living.webp"
  },
  "escape": { "image": "assets/img/mission-portrait.webp" }
}
```

(Image filenames are re-pointed in Task 13; keep current names for now so the build stays green.)

- [ ] **Step 5: Build to verify the pipeline still compiles**

Run: `npm install && npm run build`
Expected: build succeeds; `_site/js/i18n.js` exists and contains `const I18N = {` with no `S/` or `treat.t` price composition. (Pages still show old content — that's fixed in later tasks.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: capture brief, strip massage build logic, restructure site.json"
```

---

### Task 2: Shared chrome — brand, 6-page nav, footer, new mark, realms wiring

**Files:**
- Modify: `js/site.js`
- Modify: `css/styles.css` (mark/divider only)

**Interfaces:**
- Consumes: `window.ParastooI18N` (Task 1).
- Produces: nav/footer markup keyed to `nav.{home,about,offerings,retreats,faq,contact}`, `footer.{blurb,explore,connect,location,rights}`, brand "Parastoo", a new non-region `mark()` glyph; rotator still bound to `#pillarRotator`/`.hero__slide`/`#pillarChips`.

- [ ] **Step 1: Update nav links + brand in `js/site.js`**

Replace the `links` array and brand:

```js
  const links = [["home", "index.html"], ["about", "about.html"],
                 ["offerings", "offerings.html"], ["retreats", "retreats.html"],
                 ["faq", "faq.html"], ["contact", "contact.html"]];
```

Replace both `Munay` wordmarks (nav `<span class="font-display ...">Munay</span>` and footer) with `Parastoo`, and `aria-label="Munay — home"` with `aria-label="Parastoo — home"`. Change the nav CTA `data-i18n="cta.book"` label stays `cta.book` (now "Book a free call").

- [ ] **Step 2: Replace the chakana `mark()` with a non-region glyph**

```js
  /* simple sun/seed glyph — non-region, used in nav + footer + dividers */
  const mark = (cls) => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4"/>
      <path d="M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22M4.9 4.9l2.4 2.4M16.7 16.7l2.4 2.4M19.1 4.9l-2.4 2.4M7.3 16.7l-2.4 2.4"/>
    </svg>`;
```

- [ ] **Step 3: Update footer columns to the new keys**

In the footer template change `data-i18n="footer.visit"` → `data-i18n="footer.connect"`, keep `footer.explore`, `footer.location`, `footer.blurb`, `footer.rights`. Update the footer "Parastoo ©" line wordmark.

- [ ] **Step 4: Rename the i18n global call**

Change `window.MunayI18N.applyLang` / `window.MunayI18N.initLang` references in `site.js` to `window.ParastooI18N` (the Task-1 alias keeps the old name working too, but make site.js canonical). Also update `localStorage` key usage is inside i18n.js (`munay-lang`) — leave the storage key as-is (harmless) OR change to `parastoo-lang` in both files; choose `parastoo-lang` and change it in `i18n.11ty.js` runtime too.

- [ ] **Step 5: Mark/divider colour in CSS (optional cleanup)**

In `css/styles.css`, the `.chakana` class name stays (it's just a flex divider); no change required. Confirm no CSS references to removed assets. No other CSS edits.

- [ ] **Step 6: Build + manual check**

Run: `npm run build`
Then open `_site/index.html` — nav shows 6 links + Parastoo wordmark + sun glyph; footer shows Parastoo. (Link targets to not-yet-created pages 404 until later tasks — fine.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: rebrand shared chrome to Parastoo — 6-page nav, footer, sun mark"
```

---

### Task 3: Home page — template + EN content

**Files:**
- Modify: `index.html`
- Modify: `content/i18n/en.json` (home + realms + nav/cta/brand/footer base)

**Interfaces:**
- Consumes: realms keys `pillar.1..5`, `home.*`, `cta.*`.
- Produces: a rendering home page; establishes the EN base for nav/cta/brand/footer used by every page.

- [ ] **Step 1: Rewrite the base + home section of `en.json`**

Replace the whole `en.json`. For THIS task author these sections (other pages' keys added in their tasks, but you may stub the whole file now and fill progressively). Base + home EN values below.

> The home page is the one place that is mostly **connective summary** (a landing page has no 1:1 source in the brief), which Verbatim Rule 7 permits. Where a home string echoes something she wrote (the hero `sub`, the testimonial quote), use her exact words; for the short realm/featured/teaser blurbs, quote or lightly paraphrase her own sentences from the relevant offering rather than inventing new claims. The values below do this.

```jsonc
"nav": { "home":"Home","about":"About","offerings":"Offerings","retreats":"Retreats","faq":"FAQ","contact":"Contact" },
"cta": { "book":"Book a free call","call":"Book a discovery call","whatsapp":"Message on WhatsApp","explore":"Explore the work" },
"brand": { "tagline":"Embodiment · Plant Medicine · Conscious Living" },
"footer": {
  "blurb":"Guiding people back to their most authentic, embodied and awakened selves.",
  "explore":"Explore","connect":"Connect",
  "location":"In person & online · worldwide","rights":"All rights reserved."
},
"pillar": {
  "1": { "word":"Mentorship", "desc":"One-to-one journeys back to yourself — embodiment, nervous-system regulation and deep self-inquiry, online or in person." },
  "2": { "word":"Embodied Plant Medicine", "desc":"Parastoo's signature 1:1 method, weaving plant medicine, bodywork, breath and witnessing so the body can integrate what it holds." },
  "3": { "word":"Bodywork", "desc":"Ninety-minute Ayurvedic, Tantric and deep-tissue sessions to settle the nervous system and free what the body carries." },
  "4": { "word":"Ceremony", "desc":"Private and small-group psilocybin ceremonies — trauma-informed, carefully held containers for remembrance and healing." },
  "5": { "word":"Retreats", "desc":"Immersions like The Way Home — days of ceremony, movement and nature to remember who you are." }
},
"home": {
  "hero": {
    "kicker":"Embodiment · Plant Medicine · Conscious Living",
    "lead":"A sanctuary for",
    "sub":"Guiding people back to their most authentic, embodied, and awakened selves. A sanctuary for awakening, nervous system healing, and conscious living.",
    "cta2":"Explore the work"
  },
  "pillars": { "kicker":"How we work together","title":"Five realms, one intention" },
  "mission": {
    "kicker":"Meet Parastoo",
    "title":"The body holds the key.",
    "body":"Born in Iran, shaped in Canada, and called across the world, Parastoo is a student of life devoted to embodiment, plant medicine and the wisdom of the body. Her work does not give healing — it creates the conditions for the body to remember its own.",
    "link":"Her story"
  },
  "featured": { "kicker":"Where to begin","title":"Ways to work together","all":"See all offerings" },
  "f1": { "name":"1:1 Mentorship","blurb":"A personalised journey through awakening, life transitions and emotional healing — back into trust with yourself.","meta":"Online & in person" },
  "f2": { "name":"The Embodied Plant Medicine Method™","blurb":"Parastoo's signature 1:1 modality — plant medicine met with bodywork, breath and compassionate witnessing.","meta":"In person · by application" },
  "f3": { "name":"Ceremonies","blurb":"Private and small-group psilocybin ceremonies, held in a safe, trauma-informed container.","meta":"Private & small group" },
  "escape": {
    "kicker":"Retreats & immersions",
    "title":"The Way Home",
    "sub":"A 7-day transformational retreat in Lake Atitlán, Guatemala · December 17–23, 2026."
  },
  "values": {
    "kicker":"What guides this work",
    "title":"You are not broken.",
    "sub":"Embodiment, presence, safety, consent and compassion guide every session, ceremony and retreat. My role is not to heal you — it is to hold the space where your own healing can emerge."
  },
  "testimonial": {
    "quote":"Healing is not something that happens to you. It is something that unfolds when the body finally feels safe enough to let go.",
    "name":"— Parastoo · client words coming soon"
  },
  "cta": { "title":"Come home to yourself.","sub":"Begin with a free discovery call — a space to explore your intentions, your questions, and whether we are aligned to work together." }
}
```

> NOTE: `home.testimonial` is a holding quote (the client supplied no testimonials). Flag for replacement.

- [ ] **Step 2: Rewrite `index.html` body**

Keep the hero rotator, ribbon, mission, five-paths (realms), featured-cards, escape band, testimonial, CTA structure already in `index.html`. Required edits:
- Update `<title>`/meta to Parastoo (Task 13 finalises SEO; do a basic pass now): title `Parastoo · Embodiment, Plant Medicine & Conscious Living`.
- Hero buttons: primary `cta.book`, secondary `home.hero.cta2` → href `offerings.html`.
- Mission block: image stays `escape.image`; the small inset img `assets/img/mission-hands.webp` stays; link href `about.html` (`home.mission.link`).
- Featured cards: replace the three cards' `data-i18n` from `home.t1.name/blurb/meta` to `home.f1.name`,`home.f1.blurb`,`home.f1.meta` (and f2, f3). Card hrefs → `offerings.html`. Keep images for now.
- "See all" button `home.featured.all` → `offerings.html`.
- Escape band: heading `home.escape.title`, sub `home.escape.sub`, kicker `home.escape.kicker`, CTA → `retreats.html` (label `cta.explore` or a new `home.escape` button; reuse `home.featured.all`? Use `cta.explore`).
- Closing CTA: WhatsApp button href `https://wa.me/{{ site.contact.whatsapp }}`.
- Remove the word-ribbon's Peru pillar words automatically (they read from `pillar.*`, now realms — fine).

- [ ] **Step 3: Build + verify**

Run: `npm run build`
Then: `grep -ri "munay\|pisac\|sacred valley" _site/index.html` → Expected: no matches.
Open `_site/index.html`: hero rotates the five realms; all home text resolves in EN.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: home page — Parastoo hero, five realms, featured offerings, retreat teaser"
```

---

### Task 4: About page — Meet Parastoo + 10 Values

**Files:**
- Modify: `about.html`
- Modify: `content/i18n/en.json` (about.*)

**Interfaces:**
- Consumes: `about.hero.*`, `about.story.p1..p8`, `about.values.*`, `about.v1..10.{name,desc}`, `about.cta.*`.

- [ ] **Step 1: Author `about.*` EN content**

From `parastoo-brief.md` "Meet Parastoo": reproduce the story **whole and verbatim** (grammar/spelling only), split at her own paragraph breaks into `about.story.p1..pN` (it runs to ~20+ short paragraphs ending on "Waiting to be remembered." — use as many `pN` keys as needed; do not cut any). `about.hero.title`: "I am a student of life." (her words). Hero sub: "A devoted explorer of what it means to be fully human." (her words).

Values: `about.values.title` = "You are not broken." (her words). `about.values.intro` = her full opening paragraph verbatim ("The body is not something that needs to be fixed… My role is to create a safe, compassionate, and attuned space where your own healing intelligence can emerge."). Then the **10 values reproduced verbatim** — each `about.vN.name` is her heading (Embodiment, Presence, Safety & Consent, Trauma-Informed Care, Compassion, Authenticity, Conscious Living, Integration, Community, Remembrance) and each `about.vN.desc` is her **full value passage word-for-word** (multiple sentences; keep every line). Do NOT condense to one-liners.

- [ ] **Step 2: Rewrite `about.html`**

Reuse the page-hero + alternating sections already present. Map sections:
- Page hero → `about.hero.*`, image `assets/img/about-hero.webp`.
- "Meet Parastoo" → a story section rendering `about.story.p1..p8` as stacked paragraphs beside `assets/img/practitioner.webp`.
- Replace the old "philosophy" + "oils ritual" + "Sacred Valley" sections with a **Values** section: heading `about.values.{kicker,title}`, intro `about.values.intro`, then a responsive grid of 10 cards each `about.vN.name` + `about.vN.desc` (reuse the existing `.card !shadow-none` grid pattern; 2-col on md, 2–3 on lg). Use the new sun glyph or a small number `— 0N` per card.
- CTA → `about.cta.*`, button `cta.book` → `contact.html`.
- Remove all `about.oil*`, `about.phil.*`, `about.valley.*` markup.

- [ ] **Step 3: Build + verify**

Run: `npm run build`
`grep -ri "munay\|quechua\|sacred valley\|oils" _site/about.html` → Expected: no matches.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: about page — Meet Parastoo story + ten values"
```

---

### Task 5: Offerings page — mentorship, method, bodywork, ceremony, chef

**Files:**
- Create: `offerings.html`
- Modify: `content/i18n/en.json` (offer.*, mentor.*, body.*)

**Interfaces:**
- Consumes: `offer.*`, `mentor.1..4.*`, `body.1..3.*`.
- Produces: the main work hub with sticky sub-nav anchors `#mentorship #method #bodywork #ceremony #chef`.

- [ ] **Step 1: Author `offer.*` EN content (verbatim from brief)**

Per Verbatim Copy Rules, from `parastoo-brief.md`. Every intro, support list and "Invitation" passage is **her exact wording** (grammar/spelling only). Lists run to their full length (use `sN`/`incN`/`aN` as far as her list goes). `meta` labels and sub-nav labels are the only new strings (no prices). Structure:

- `offer.hero` kicker "Work with me" (new), title — use her in-person section heading "My signature methodology" is method-specific; for the page title use a neutral new line e.g. "Ways to work together"; sub: new one line.
- `offer.nav.{mentorship,method,bodywork,ceremony,chef}` = sub-nav labels (new, factual).
- **Mentorship** `offer.mentorship.{kicker,title}` + per-offering `mentor.1..4` with `{ name, meta, intro (her full intro prose, possibly intro2/intro3 for multiple paragraphs), s1..sN (her complete "This Journey May Support You In" list — every bullet), invite (her "The Invitation" passage) }`:
  - mentor.1 = "1:1 Embodiment, Empowerment & Awakening Mentorship" — meta "Online & in person".
  - mentor.2 = "1:1 DNA Healing Session" — meta "Online & in person".
  - mentor.3 = "1:1 Journey Through the Chakras" — meta "Online & in person".
  - mentor.4 = "1:1 Plant Medicine Preparation & Integration Mentorship" — meta "Online & in person".
- **Method** `offer.method.{ kicker, title:"The Embodied Plant Medicine Method™", subtitle:"A Private Journey of Witnessing, Embodiment & Transformation", intro1..introN (her full method prose verbatim), unique (her "What Makes This Method Unique?" passage), s1..sN (her full "This Journey May Support" list), medicines:"Plant medicine to choose from based on your intention: Psilocybin, Wachuma, Syrian Rue", invite (her "The Invitation" passage incl. "The body is the medicine.") }`. Render `unique`/`invite` as pull-quotes; this section gets the prominent `.on-dark` treatment.
- **Bodywork** `offer.bodywork.{kicker,title}` + `body.1..3` `{ name, meta:"90 min · In person", desc (her full description verbatim), s1..sN where she gives a list (Deep Tissue has a "This Session May Support You In" list — include it in full) }`:
  - body.1 "Ayurveda Massage" (her line). body.2 "Tantra Massage" (her line). body.3 "Deep Tissue Massage" (her full prose + its support list).
- **Ceremony** `offer.ceremony.{ kicker, title:"Private & Small Group Psilocybin Ceremonies", subtitle:"Sacred Spaces for Transformation, Remembrance & Inner Exploration", intro1..introN (her full prose verbatim), supportTitle:"What These Ceremonies May Support", s1..sN (her full list), includedTitle:"What's Included", inc1..incN (her full "What's Included" list) }`.
- **Chef** `offer.chef.{ kicker, title:"Private Chef Experiences", subtitle:"Nourishment as Ceremony", intro1..introN (her full prose verbatim, incl. "Food is medicine. / Food is connection. …"), availableTitle:"Available For", a1..aN (her full list), invite (her "The Invitation" passage) }`.
- `offer.cta.{title,sub}` → free discovery call (may quote her discovery-call line).

Reproduce EVERY bullet and passage — do not truncate any list.

- [ ] **Step 2: Create `offerings.html`**

Use the existing page-hero + the `treatments.html` alternating `article.grid.md:grid-cols-2` row pattern as the building block. Structure:
- `<head>` mirrors other pages (fonts, Tailwind, css, og). title "Offerings · Parastoo".
- Page hero `offer.hero.*`, image `assets/img/header-treatments.webp`.
- Sticky sub-nav bar (below hero) with anchor links to `#mentorship #method #bodywork #ceremony #chef` using `offer.nav.*` labels. Use `position: sticky; top: 0` on a slim `.bg-[var(--cream-2)]` bar; reuse `.kicker`/link styles.
- `#mentorship`: section header + 4 offering blocks. Each block: name (`mentor.N.name`), meta (`mentor.N.meta`), her intro paragraph(s) (`mentor.N.intro`, `intro2`…), a `<ul>` of her **full** support list (`mentor.N.s1..sN`), her `invite` passage (styled softer/italic), CTA `cta.call` → `contact.html`. Use the alternating image rows (reuse existing treatment images as placeholders, Task 11 re-points).
- `#method`: featured/prominent block (full-width, darker `.on-dark` treatment) for the signature method — title + subtitle, her full intro paragraphs, `unique` pull-quote, full support list, `offer.method.medicines`, `invite` pull-quote ("The body is the medicine.").
- `#bodywork`: 3 rows from `body.1..3` (Deep Tissue includes its full support list).
- `#ceremony`: section with her full intro, support list (`s1..sN`) and "What's Included" list (`inc1..incN`).
- `#chef`: section with her full intro and "Available For" list (`a1..aN`), plus her `invite` passage.
- Booking CTA band (reuse the dark band) `offer.cta.*` → contact + WhatsApp.

Render bullet lists by giving each `<li>` its own `data-i18n="mentor.1.s1"` etc.

- [ ] **Step 3: Build + verify**

Run: `npm run build`
Check `_site/offerings.html` exists; sub-nav anchors jump; all lists resolve; `grep -ri "S/\|munay" _site/offerings.html` → no matches.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: offerings page — mentorship, the method, bodywork, ceremonies, chef"
```

---

### Task 6: Retreats page — The Way Home

**Files:**
- Create: `retreats.html`
- Modify: `content/i18n/en.json` (retreat.*)

**Interfaces:**
- Consumes: `retreat.*`, `site.retreat.bookingUrl`.

- [ ] **Step 1: Author `retreat.*` EN content (verbatim from brief)**

From the brief's "The Way Home" — her wording verbatim (grammar/spelling only):
```
retreat.hero: kicker "Retreats & immersions" (new), title "The Way Home" (her words),
  subtitle "A 7-Day Transformational Retreat in Lake Atitlán, Guatemala" (her words),
  dates "December 17–23, 2026" (her words).
retreat.intro: intro1..introN = her full opening paragraphs verbatim
  ("The Way Home is a sacred invitation to step away from the noise of everyday life…"
   through "…the unique gifts, creativity, and inner knowing that are longing to be expressed.").
retreat.support.title = "This Journey May Support You In:" (her words) + s1..sN = her FULL list
  (every bullet: reconnecting with your authentic self and life's purpose; releasing limiting
   beliefs and patterns that keep you stuck; clarifying your vision for the next chapter; cultivating
   nervous system resilience and inner peace; unlocking creativity, intuition and self-expression;
   building meaningful connections and conscious community; exploring more intentional and aligned
   ways of living; returning home to yourself).
retreat.cta: title (new, warm), sub (new), button "Retreat details & booking" → site.retreat.bookingUrl.
```
(Her brief had no separate "what's included" list for the retreat — omit `retreat.included.*`; the `i1..i6` keys are dropped.)

- [ ] **Step 2: Create `retreats.html`**

`<head>` title "The Way Home · Retreats · Parastoo". Page hero `retreat.hero.*` (image `assets/img/hero-retreats.webp`) showing title + subtitle + `dates` as prominent meta. A details band rendering her `intro1..introN` paragraphs. The full support list (`retreat.support.title` + `s1..sN`) in the existing card/list pattern. Closing CTA: button `retreat.cta.button` → `{{ site.retreat.bookingUrl }}` (placeholder `#`; add `aria` note) plus `cta.book` → contact. Parallax band reuse `assets/img/valley-band.webp` (re-pointed Task 11).

- [ ] **Step 3: Build + verify**

Run: `npm run build`; confirm `_site/retreats.html` renders, dates show, booking button points to `#`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: retreats page — The Way Home, Lake Atitlán Dec 2026"
```

---

### Task 7: FAQ page — accordion

**Files:**
- Create: `faq.html`
- Modify: `content/i18n/en.json` (faq.*)
- Modify: `js/site.js` (accordion toggle — small, additive)

**Interfaces:**
- Consumes: `faq.q1..q15.{q,a}`, `faq.hero.*`, `faq.cta.*`.

- [ ] **Step 1: Author `faq.*` EN content**

Reproduce the brief's FAQ **verbatim** (grammar/spelling only) — each question and its **full answer word-for-word**, in her order. There are 14 in the brief (q1..q14): (1) Method vs traditional ceremony; (2) what "embodiment" means; (3) is this therapy?; (4) is this work safe?; (5) strong emotions; (6) will I be touched?; (7) is this Tantra?; (8) nudity?; (9) which plant medicines?; (10) how do I know if plant medicine is right for me?; (11) how to prepare; (12) after the session; (13) experience needed?; (14) your role. Add one new closing `q15` only if useful ("How do I begin?" → free discovery call) — otherwise route via the page CTA. Keep her line breaks within answers.

- [ ] **Step 2: Create `faq.html`**

`<head>` title "FAQ · Parastoo". Page hero `faq.hero.*`. Accordion: `<details class="faq-item">` per question is the simplest accessible pattern (no JS needed):

```html
<details class="faq-item reveal">
  <summary data-i18n="faq.q1.q"></summary>
  <p data-i18n="faq.q1.a"></p>
</details>
```

Add minimal styling for `.faq-item`/`summary` in `css/styles.css` (border-top, padding, marker rotation) consistent with tokens. Closing CTA `faq.cta.*` → discovery call. (Using `<details>` avoids the `site.js` accordion JS — skip that part of the Files list if you use native disclosure.)

- [ ] **Step 3: Build + verify**

Run: `npm run build`; `_site/faq.html` renders; each `<details>` expands; answers resolve in EN.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: faq page — trauma-informed accordion"
```

---

### Task 8: Contact page — discovery call + channels + form

**Files:**
- Modify: `contact.html`
- Modify: `content/i18n/en.json` (contact.*)

**Interfaces:**
- Consumes: `contact.hero.*`, `contact.call.*`, `contact.wa.*`, `contact.ig.*`, `contact.email.*`, `contact.form.*`, `site.contact.*`.

- [ ] **Step 1: Author `contact.*` EN content**

```
contact.hero: kicker "Begin here" (new), title "Book a Free Discovery Call" (her words), sub "A free connection call to explore your intentions, needs, questions, and whether we are aligned to work together." (her words, verbatim)
contact.call: title "Free discovery call" (new), body (new, short) "Reach out by WhatsApp or email and we'll find a time. No pressure, no commitment — just a space to feel into what you need."
contact.wa: title "WhatsApp", body "+1 (416) 837-1650"
contact.ig: title "Instagram", body "@Heldbyparas"
contact.email: title "Email", body "Parastoovii@gmail.com"
contact.form: title "Send a message", name/email/message labels + placeholders, submit "Send message", note "I'll reply within a few days. For anything time-sensitive, WhatsApp is fastest."
```

- [ ] **Step 2: Rewrite `contact.html`**

Replace the info trio with a 3-channel grid: WhatsApp (link `https://wa.me/{{ site.contact.whatsapp }}`), Instagram (link `https://instagram.com/{{ site.contact.instagram }}`), Email (link `mailto:{{ site.contact.email }}`). Add a discovery-call panel (`contact.call.*`) with the `cta.whatsapp` button. Keep the form (relabel keys to `contact.form.*`; `action="#"` stays — flag). **Remove the Google Map iframe** (location TBD) — replace that column with a calm image (`assets/img/about-hero.webp`) or the discovery-call panel. Remove `contact.hours.*`, `contact.visit.*`.

- [ ] **Step 3: Build + verify**

Run: `npm run build`; `grep -ri "pisac\|map\|hours" _site/contact.html` → no Peru/map matches; WhatsApp/IG/email links correct.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: contact page — free discovery call, channels, form (map removed)"
```

---

### Task 9: ES translation — full parity

**Files:**
- Modify: `content/i18n/es.json` (replace entirely)

- [ ] **Step 1: Translate every EN key into Spanish**

Mirror `en.json`'s structure exactly (same keys, including `.word` for `pillar.N`). Translate naturally, preserving the embodiment register. Keep "The Embodied Plant Medicine Method™" recognisable (e.g. "El Método de Medicina Vegetal Encarnada™" — keep ™). Proper nouns stay: Parastoo, Lake Atitlán → "Lago de Atitlán", Guatemala. Dates localised: "17–23 de diciembre de 2026".

- [ ] **Step 2: Build + parity check**

Run: `npm run build`
Run the parity script (Task 13 defines it) limited to es: it must report 0 missing keys.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Spanish translation (full key parity)"
```

---

### Task 10: FA translation — full parity + RTL

**Files:**
- Modify: `content/i18n/fa.json` (replace entirely)

- [ ] **Step 1: Translate every EN key into Farsi**

Mirror structure exactly. Natural Farsi, embodiment register. Method name in Farsi (keep ™). Numerals: use forms consistent with the existing file. Confirm RTL renders (the runtime sets `dir="rtl"` for `fa`).

- [ ] **Step 2: Build + parity + RTL check**

Run: `npm run build`; parity script reports 0 missing for fa. Open `_site/index.html`, switch to فا → layout flips RTL, fonts swap to Vazirmatn.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: Farsi translation (full key parity, RTL)"
```

---

### Task 11: Image mapping + gap markers

**Files:**
- Modify: `content/site.json` (hero slides)
- Modify: page templates (img `src` per slot)
- Create: `docs/superpowers/specs/image-gaps.md`

- [ ] **Step 1: Re-point hero slides to the five realms**

In `site.json`, map `hero.slide1..5` to the best-fitting existing photos for Mentorship / Method / Bodywork / Ceremony / Retreats. Available WebPs (and `Images/Final/DSC*`, `Images/Paras*`, `Images/RI-*` originals) — choose warm, embodied, hands/nature/portrait frames. Update `<img alt>` text on every reused slot to match the new meaning (remove massage-specific alts).

- [ ] **Step 2: Document gaps**

Create `docs/superpowers/specs/image-gaps.md` listing every slot where no true photo exists (ceremony, plant medicine, Guatemala retreat, chef) and which placeholder currently fills it, so the client can supply real images.

- [ ] **Step 3: Build + verify**

Run: `npm run build`; spot-check each page's imagery is non-jarring and alts updated; `grep -ri "massage\|hot stone\|aromatherapy" _site/*.html` → only where genuinely bodywork.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: re-map imagery to new realms + document photography gaps"
```

---

### Task 12: SEO, metadata, favicon, README

**Files:**
- Modify: all 6 `*.html` `<head>` blocks
- Modify: `README.md`
- Verify: `assets/og.jpg`, `assets/favicon.svg`

- [ ] **Step 1: Per-page `<head>`**

Set unique `<title>`, `meta description`, `og:title`/`og:description` per page (Parastoo voice, no Peru). Keep `og:image` pointing at `/assets/og.jpg` (note in image-gaps that og.jpg should be re-shot). `lang="en"` default. Confirm canonical-ish titles match the brand.

- [ ] **Step 2: README rewrite**

Replace Munay/massage description with Parastoo: purpose, 6 pages, trilingual, Eleventy build/dev commands, the "placeholders to replace before launch" list (prices, location/city, testimonials, photography, retreat booking URL, form action, og.jpg, ES/FA native review).

- [ ] **Step 3: Build + verify**

Run: `npm run build`; `grep -rli "munay\|pisac\|sacred valley\|quechua" _site/` → Expected: no matches (whole-site sweep).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: SEO/meta + README for Parastoo; whole-site Peru sweep clean"
```

---

### Task 13: Final QA — build, parity, forbidden-string sweep, a11y/RTL

**Files:**
- Create: `scripts/check-i18n-parity.mjs` (dev-only, gitignored or kept)

- [ ] **Step 1: Write the parity checker**

```js
// scripts/check-i18n-parity.mjs — fails if es/fa miss any en key
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
```

- [ ] **Step 2: Run parity**

Run: `node scripts/check-i18n-parity.mjs`
Expected: `[es] OK` and `[fa] OK`, exit 0. Fix any gaps.

- [ ] **Step 3: Forbidden-string sweep over built output**

Run: `npm run build && grep -rliE "munay|p[ií]sac|sacred valley|valle sagrado|cusco|quechua|andean|S/ " _site/ || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 4: Manual a11y/RTL/responsive pass**

Open `_site/` pages: mobile nav opens/closes; language switch EN/ES/FA persists + FA flips RTL; `prefers-reduced-motion` disables rotator/parallax; focus rings visible; all CTAs route to contact/WhatsApp/email or `#` booking. Note anything broken and fix.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: i18n parity checker + final QA sweep (clean)"
```

---

## Self-Review

**Spec coverage:**
- Languages EN/ES/FA → Tasks 3,9,10,13. Brand Parastoo → Tasks 2,3,12. Location flexible / no city → Global Constraints + Tasks 8,11. 6-page structure → Tasks 3–8. Chakana replaced → Task 2. Distilled copy → Distillation Rules + content tasks. i18n.11ty rework → Task 1. site.json → Tasks 1,11. Five realms → Tasks 1(pillar keys),2,3. Photography gaps → Task 11. Sensitive content voice → Global Constraints + Tasks 5,7. FAQ → Task 7. Discovery-call routing → Tasks 5,6,7,8. Testimonial placeholder → Task 3. SEO → Task 12. Parity/QA → Task 13. All spec sections covered.
- Private Chef on Offerings (not own page) → Task 5. ✓ matches spec.

**Placeholder scan:** Long-form prose is intentionally authored from `parastoo-brief.md` per explicit Distillation Rules with exact key lists and sample copy — not hand-waved. The `home.testimonial` and retreat `bookingUrl` are deliberate, flagged client placeholders, not plan gaps.

**Type/name consistency:** i18n global `window.ParastooI18N` (+`MunayI18N` alias) defined Task 1, consumed Task 2. `pillar.N.word` mechanism preserved (Task 1 keeps `.word` fold; Tasks 2/3 consume). Featured keys `home.f1..3` defined Task 3, used Task 3 template. Offering namespaces (`mentor.*`, `body.*`, `offer.*`) defined and consumed within Task 5. Parity checker (Task 13) validates the whole set.
