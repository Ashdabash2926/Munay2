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

1. **No visual QA has been done.** Every check during the build was static (Eleventy build,
   i18n key parity, forbidden-string sweeps) — the rendered pages were never opened in a real
   browser. Worth eyeballing before launch: the long `offerings.html` (sticky sub-nav
   behaviour, section spacing), the 10-card values grid on `about.html`, the `faq.html`
   accordion, and especially **Farsi RTL layout** across all pages. The CSS rules exist; only a
   visual pass will confirm there are no overflow / wrapping / sticky-positioning bugs.

2. **All body text is injected client-side by JavaScript (i18n).** Every paragraph lives in a
   `data-i18n` attribute and is filled in after the page loads from `js/i18n.js`. Consequences:
   visitors with JS disabled, and many SEO / social-preview crawlers that don't execute JS, see
   pages that are nearly empty (only `<title>`, meta description, and image `alt` text render
   without JS). This is the original site's architecture (not a regression), but now that the
   copy is the whole point it's a real SEO / link-preview weakness. Fixing it properly means
   server-rendering the default-language text into the HTML at build time (an Eleventy change),
   not just the i18n swap layer.

3. **The home page (`index.html`) uses summary copy written by Claude, not Parastoo's verbatim
   words.** Her brief has no home-page source text, so the five realm descriptions
   (`pillar.N.desc`), the three featured-card blurbs (`home.f1/f2/f3.blurb`), and the
   mission/values teasers (`home.mission.*`, `home.values.*`) are paraphrased summaries.
   **Every other page (About, Offerings, Retreats, FAQ) is her wording verbatim.** If she wants
   strict verbatim everywhere, swap these home strings for her own sentences or cut them.

4. **ES / FA translations are AI-reviewed only** (also in the checklist above). They passed an
   automated accuracy + full key-parity review, but no fluent human has checked them — the
   embodiment / plant-medicine register in Farsi especially is easy to get subtly wrong.

5. **Plant-medicine content is now public.** The site openly describes psilocybin ceremonies
   and other sacred medicines, and her actual location / jurisdiction is still unknown (the site
   says only "in person & online"). This follows the brief, but going live with it warrants her
   explicit sign-off given the legal sensitivity.

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
