# Parastoo — Site Redesign Design Spec

**Date:** 2026-06-18
**Project:** `Munay2` (repo `Ashdabash2926/Munay2`, live `munay-site.pages.dev`)
**Type:** Content + IA re-architecture on top of the existing Eleventy build.

## Summary

The existing site is a polished 4-page trilingual (EN / ES / FA) "Earthen Sanctuary"
design themed as a **holistic massage** practice in Písac, Sacred Valley, Peru, built
around five "pillars." The client (Parastoo / "Held by Paras") has provided a much larger
brief for an **embodiment, plant-medicine, bodywork, ceremony, retreat and private-chef**
practice. The client likes the existing *visual design*, so this project **keeps the visual
system** and **re-architects content, brand and page structure** to the new brief.

## Decisions (locked with client)

- **Languages:** keep full trilingual **EN / ES / FA** (RTL Farsi). Farsi fits her Iranian
  heritage. A native ES/FA speaker should review translations before launch.
- **Brand / wordmark:** **Parastoo**.
- **Location:** kept **flexible** — no city named. Remove all Peru/Písac/Sacred Valley
  references. Use "in person & online" framing. Confirm a city with the client later.
- **Structure:** **multi-page, 6 pages.**
- **Chakana mark:** **replaced** (Andean cross is Peru-specific). Use a quieter,
  non-region motif (small sun / seed / sprig) in nav, footer and dividers.
- **Copy:** use the client's **wording verbatim** — only correct grammar and spelling.
  Do NOT condense, reword, or trim. Keep her full prose, the complete "may support you
  in" / "what's included" lists, and the "Invitation" closing passages. The web layout
  adds the structure (headings, sections, bullets); the words stay hers.

## What is kept vs changed

**Kept:** the "Earthen Sanctuary" design system — terracotta/cream/cocoa/sage/gold palette,
Fraunces + Barlow + Vazirmatn type, film-grain texture, scroll-reveal + parallax motion,
masked headline reveals, the rotating-hero mechanic, the Eleventy + trilingual i18n pipeline.

**Changed:** brand (Munay → Parastoo), all content, page count (4 → 6), the hero "pillars"
(→ five realms), removal of Peru-specific motifs (chakana mark, "Munay means love in
Quechua" mission, Písac/Sacred Valley, Peruvian-soles pricing).

## Architecture / pipeline (unchanged mechanics)

This is an **Eleventy** project, not a flat static site:

- `*.html` are Nunjucks templates using `{{ site.x }}` from `content/site.json`.
- All visible text lives in `content/i18n/{en,es,fa}.json` (nested → flattened to dotted
  keys). `i18n.11ty.js` compiles these into `js/i18n.js` at build time.
- `js/site.js` injects shared nav/footer, wires motion, runs the hero rotator.
- Build: `npm run build` → `_site/`. Dev: `npm run dev`.
- `eleventy.config.mjs` keeps `about.html` (not `/about/`) permalinks; passes through
  `css`, `assets`, `js/site.js`.

The build currently bakes in massage-specific logic (Peruvian-soles price composition,
fixed 5 "treatments", featured-card mirroring). This is **removed** — see below.

## Site map (6 pages)

| File | Page | Contents |
|---|---|---|
| `index.html` | **Home** | Hero (tagline + rotating five realms); Meet Parastoo teaser; the five realms section; The Embodied Plant Medicine Method™ teaser; 3 featured-offering cards; The Way Home retreat teaser; values teaser; testimonial; free-discovery-call CTA |
| `about.html` | **About** | "Meet Parastoo" full story; Philosophy / Values (the 10 values); CTA |
| `offerings.html` | **Offerings** | Sticky sub-nav, then: 1:1 Mentorship (4 journeys); The Embodied Plant Medicine Method™ (signature centrepiece); Bodywork (Ayurveda, Tantra, Deep Tissue); Ceremonies (psilocybin); Private Chef; CTA |
| `retreats.html` | **Retreats** | The Way Home — Lake Atitlán, Guatemala, Dec 17–23 2026; "may support you in" list; what's included; booking CTA (placeholder external link) |
| `faq.html` | **FAQ** | Full FAQ as an accordion |
| `contact.html` | **Contact** | "Book a Free Discovery Call" framing; contact trio (WhatsApp +1 416 837 1650 · Parastoovii@gmail.com · IG @Heldbyparas); discovery-call panel; trilingual form. **No map** (location TBD) |

Nav (desktop + mobile): Home · About · Offerings · Retreats · FAQ · Contact, plus a
"Book a Call" primary button. Footer mirrors nav + contact.

### Offerings page detail

Single long page with a sticky in-page sub-nav (anchors). Sections, in order:

1. **1:1 Mentorship** (online & in person) — four journeys:
   - Embodiment, Empowerment & Awakening Mentorship
   - DNA Healing Session
   - Journey Through the Chakras
   - Plant Medicine Preparation & Integration Mentorship
2. **The Embodied Plant Medicine Method™** — signature, given visual prominence; note the
   three medicines to choose from (Psilocybin, Wachuma, Syrian Rue).
3. **Bodywork** (90 min) — Ayurveda massage, Tantra massage, Deep Tissue.
4. **Ceremonies** — Private & Small Group Psilocybin Ceremonies; "what's included" list.
5. **Private Chef Experiences** — nourishment as ceremony; "available for" list.

Each offering uses the client's **full wording verbatim** (grammar/spelling fixes only):
her intro prose + the complete "may support you in" / "what's included" lists + the
"Invitation" closing passage, plus a "Book a discovery call" CTA. Meta labels
(format/duration) are normal translatable strings, e.g. "Online & in person",
"90 min · In person", "Private & small group". **No prices shown** until the client confirms.

## The five realms (hero rotator + home section)

Replaces the old five pillars. Doubles as quick context:
**Mentorship · Embodied Plant Medicine · Bodywork · Ceremony · Retreats.**

Hero tagline: *"A sanctuary for awakening, nervous system healing, and conscious living."*
Hero kicker / lead line: drawn from "Guiding people back to their most authentic, embodied,
and awakened selves."

## Brand & motif changes

- Wordmark **Parastoo** in nav + footer (Fraunces display).
- Replace the chakana SVG (`mark()` in `site.js`, dividers in pages) with a simple
  non-region motif — a small sun/seed/sprig glyph. Used at the same sizes.
- Remove "Munay means love in Quechua" mission; replace with a Meet-Parastoo teaser drawn
  from the brief ("The body holds the key" / "come home to yourself").
- Palette, fonts, grain, motion: unchanged.

## Content / i18n model changes

- **`i18n.11ty.js`:** remove the soles-price composition and the fixed-5-treatment +
  featured-mirror logic. Keep the flatten + `.word` alias mechanism (still used by the
  five realms). Offering meta strings become ordinary keys in the language files.
- **`content/site.json`:** replace `prices` + `featured` blocks. Keep `hero.slideN`
  (re-pointed images) and `escape.image`. `contact` gains `whatsapp` (+14168371650),
  `email` (Parastoovii@gmail.com), `instagram` (Heldbyparas). Optional `retreat.bookingUrl`
  (placeholder `#`).
- **`content/i18n/{en,es,fa}.json`:** rewritten for the new brand, nav (6 items + realms),
  Meet Parastoo, 10 values, all offerings, retreat, FAQ, contact/discovery, footer.
  EN authored first; ES + FA mirrored with full key parity.
- The i18n key namespace is reorganised (e.g. `mentor.*`, `method.*`, `bodywork.*`,
  `ceremony.*`, `chef.*`, `retreat.*`, `faq.*`, `values.*`, `about.*`, `contact.*`).

## FAQ content

Accordion of the brief's questions (Method vs traditional ceremony; embodiment; "is this
therapy?"; safety; strong emotions; touch/consent; "is this Tantra?"; nudity; which plant
medicines; readiness; preparation; aftercare; experience needed; her role). Trauma-informed,
careful tone preserved.

## Photography

Available: the 13 approved massage-shoot photos in `assets/img/*.webp`, plus `Images/Final`
(DSC*) and `Images/Paras*`, `Images/RI-*` originals.

**Gaps with no real photography:** ceremonies, plant medicine, the Guatemala retreat, chef
experiences. Approach: reuse the closest-fitting existing photos (warm, embodied, hands,
nature, portraits) in those slots and **mark each gap** in the build/notes so the client can
supply real images before launch. Bodywork + portrait + About slots are well covered.

## Sensitive content handling

Plant-medicine / psilocybin content is presented **as the brief writes it**, retaining the
client's trauma-informed, consent-first, "depending on legal context / proper screening"
framing. No pricing, no booking-on-the-spot, nothing that reads as solicitation — everything
routes to a **free discovery call** to assess fit. This matches the brief's own posture.

## Non-goals (YAGNI)

- No real booking/payment integration (CTAs route to discovery call / WhatsApp / email).
- No CMS field re-mapping in `cms.config.json` this pass (note as follow-up; the site builds
  and renders without it). *Verify the build does not depend on it.*
- No new fonts, colours, or motion systems.
- No prices until the client provides them.
- No named city/studio until the client confirms.

## Open items to confirm with client (post-launch-draft)

- In-person base city / studio location.
- Real prices and session durations (beyond the 90-min bodywork).
- Real testimonials (placeholder used until then).
- Real photography for ceremonies / plant medicine / retreat / chef.
- Retreat booking URL.
- ES + FA translation review by a native speaker.

## Success criteria

- `npm run build` succeeds; `_site/` contains all 6 pages with no Nunjucks/i18n errors.
- All visible strings resolve in EN, ES and FA with full key parity (no empty/placeholder
  keys leaking to the page); Farsi flips to RTL.
- No remaining "Munay", "Sacred Valley", "Písac", "Quechua", soles pricing, or chakana
  references in shipped pages.
- Nav/footer/rotator reflect the new brand, six pages and five realms.
- Plant-medicine content reads in the client's careful, trauma-informed voice; all CTAs
  route to the free discovery call / WhatsApp / email.
- Responsive and accessible parity with the current site (mobile nav, focus states,
  reduced-motion, RTL).
