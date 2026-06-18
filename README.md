# Parastoo · Embodiment, Plant Medicine & Conscious Living

Private practitioner site for Parastoo — a guide in embodiment, plant medicine, bodywork, ceremony, conscious living, and private chef experiences.

Trilingual: English / Español / فارسی (with true RTL layout for Farsi). Eleventy static site with content extracted to `content/` and a JS i18n dictionary auto-generated at build time.

## Pages

| File | Purpose |
|------|---------|
| `index.html` | Home — hero, philosophy, testimonial |
| `about.html` | About Parastoo — story, approach, method |
| `offerings.html` | Services: 1:1 mentorship, The Embodied Plant Medicine Method™, bodywork, psilocybin ceremony, private chef |
| `retreats.html` | The Way Home — 7-Day Retreat, Lake Atitlán, Guatemala, Dec 17–23 2026 |
| `faq.html` | Frequently asked questions |
| `contact.html` | Discovery call booking + contact form |

## Stack

- **HTML + Tailwind (CDN) + CSS custom properties + vanilla JS** — no framework
- **Eleventy** — builds i18n.js from `content/i18n/` JSON + injects content
- **i18n:** EN / ES / FA with RTL flip for Farsi; persisted in `localStorage`
- **Fonts:** Fraunces (variable) + Barlow + Vazirmatn (for Farsi)
- **Assets:** `assets/favicon.svg`, `assets/og.jpg`

## Build & Dev

```bash
npm install
npm run build   # outputs to _site/
npm run dev     # Eleventy watch + local server
```

## Placeholders to replace before launch

- [ ] **Real session prices & durations** — no prices are shown anywhere yet; only the 90-min bodywork sessions carry a duration. Add prices/durations once confirmed
- [ ] **In-person city / location** — currently "in person & online"; add real city once confirmed
- [ ] **Real testimonials** — home page uses a holding quote
- [ ] **Photography** — ceremony, method, retreat, and private chef sections need real Parastoo images; `assets/og.jpg` should be re-shot as a Parastoo-branded OG card
- [ ] **Retreat booking URL** — `content/site.json` → `retreat.bookingUrl`, currently `#`
- [ ] **Contact form action** — `contact.html` form `action` is `#`; wire to Formspree, Cloudflare Worker, etc.
- [ ] **Absolute og:image URL** — set a fully-qualified URL on the final domain (currently relative `assets/og.jpg`)
- [ ] **Native ES / FA translation review** — have a fluent speaker check the Spanish and Farsi copy

## Open concerns / not yet verified

These came out of the redesign review and are **not blocking the deploy**, but should be
addressed before treating the site as final. Listed most → least important.

1. **~~Visual QA — partial pass done.~~ FULL VISUAL PASS DONE (2026-06-18).** Completed a
   real-browser (Brave + macOS `screencapture`) proofread at readable zoom across the whole
   site. **Everything passed — no layout bugs found.** Checked:
   - **Home (EN), full scroll:** rotating hero, "Five realms" list (01–05), "Meet Parastoo"
     mission ("I am a student of life…"), featured cards, "You are not broken." values teaser,
     holding testimonial, "Come home to yourself." CTA, footer — all verbatim copy lays out
     cleanly.
   - **about.html values grid:** all 10 cards render in an even 3-column grid (card 10 sits
     alone in the last row, correct).
   - **faq.html accordion:** native `<details>` open/close confirmed — open item shows accent
     summary + rotated chevron + readable answer; closed items keep dark text + down-chevron.
   - **Farsi (RTL) on offerings / about / retreats / faq:** header mirrors (logo right, lang
     switcher left), headings right-aligned in Vazirmatn, grids flow right-to-left with Persian
     numerals top-right, accordion chevrons move to the left, and the fixed `.pull-quote` accent
     bar correctly sits on the right (the `border-inline-start` fix works).
   - **Mobile:** hamburger menu opens a clean stacked nav (Home/About/Offerings/Retreats/FAQ/
     Contact); offerings sticky sub-nav wraps to two centered rows; about values grid stacks to
     one column; faq accordion + contact form go full-width and stack. Caveat: Brave clamps its
     window to a **500px minimum**, so exact phone widths (375/390/430px) weren't captured — but
     500px is inside the mobile breakpoint range (below `sm` 640 / `md` 768) and the layouts are
     fluid, so they scale down cleanly.
   - Minor (unchanged, cosmetic): a few faint decorative blur-circles use `-right-*/-left-*`
     Tailwind utilities that don't mirror in RTL.

2. **~~All body text is injected client-side by JavaScript (i18n).~~ RESOLVED (2026-06-18).**
   The default-language (English) copy is now **prerendered into the HTML at build time** by an
   Eleventy transform (`eleventy.config.mjs` → `i18n-prerender`), so crawlers and no-JS
   visitors see real content (all 400 `[data-i18n]` elements + form placeholders). The
   client-side `js/i18n.js` still runs on top for language switching. Dictionary logic is shared
   via `lib/i18n-dict.mjs` so the prerender and the generated JS can't drift. Tradeoff: a
   returning ES/FA visitor now sees a brief flash of English before the JS swaps — acceptable,
   and strictly better than the previous blank-until-JS behaviour.

3. **~~The home page uses summary copy written by Claude.~~ RESOLVED (2026-06-18).** Parastoo
   supplied her full brief, so the previously-paraphrased home strings — the five realm
   descriptions (`pillar.N.desc`), the three featured-card blurbs (`home.f*.blurb`), the mission
   teaser (`home.mission.body`), the values teaser (`home.values.sub`) and the discovery-call
   line (`home.cta.sub`) — were rewritten using phrases drawn **verbatim from her brief**
   (selected/trimmed to card length, not invented). Two editorial choices worth a glance: the
   mission teaser is now in her **first-person voice** ("I am a student of life…"), matching the
   About page; and the section headers that have no source in her brief (e.g. "Five realms, one
   intention", "Ways to work together") were kept as structural copy. ES/FA were re-translated to
   match (still AI-only — see #4). The testimonial is still a holding quote in her words until
   real client testimonials arrive (see checklist).

4. **ES / FA translations are AI-reviewed only** (also in the checklist above). They passed an
   automated accuracy + full key-parity review, but no fluent human has checked them — the
   embodiment / plant-medicine register in Farsi especially is easy to get subtly wrong.

5. **Plant-medicine content is now public.** The site openly describes psilocybin ceremonies
   and other sacred medicines, and her actual location / jurisdiction is still unknown (the site
   says only "in person & online"). This follows the brief, but going live with it warrants her
   explicit sign-off given the legal sensitivity.

### ✅ Visual proofreading pass — DONE (2026-06-18)

The real-browser visual QA that was paused for the Screen Recording permission is now
complete (permission applied, `screencapture` works). Findings are folded into concern #1
above: **no layout bugs found across EN, Farsi RTL, and mobile.** The only remaining
launch blockers are the content/wiring items in the checklist (prices, location, real
testimonials, photography, retreat booking URL, contact form `action`, absolute og:image,
human translation review).

### Useful context for picking this up in a fresh chat

- Design spec: `docs/superpowers/specs/2026-06-18-parastoo-redesign-design.md`
- Implementation plan (13 tasks): `docs/superpowers/plans/2026-06-18-parastoo-redesign.md`
- Verbatim client brief (source of truth for all copy): `docs/superpowers/specs/parastoo-brief.md`
- Photography gaps: `docs/superpowers/specs/image-gaps.md`
- i18n parity check: `node scripts/check-i18n-parity.mjs`

## Deploy

Cloudflare Pages (canonical, live at `munay-site.pages.dev`) builds from GitHub repo
`Ashdabash2926/munay-site` (`origin`, branch `main`): runs `npm run build` and serves `_site/`.
Pushing to `origin/main` triggers a fresh deploy.
