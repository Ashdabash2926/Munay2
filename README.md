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

1. **Visual QA — partial pass done (2026-06-18).** A headless (Brave/Chromium) render pass was
   attempted; it was flaky (intermittent profile hangs), so only three screenshots were
   actually captured and reviewed: **`index.html` in Farsi (RTL)**, **`contact.html` in Farsi
   (RTL)**, and `offerings.html` in English (full-page, zoomed out). On the two Farsi shots the
   header mirrored correctly (logo right, lang switcher left), the hero text was right-aligned
   in Vazirmatn, and no overflow was visible above the fold. The EN offerings shot showed a
   coherent layout at full-page zoom (detail not readable). Everything else below was checked
   **statically, not visually**: the offerings sticky sub-nav CSS is sound
   (`position:sticky; top:0; z-index:40`), and one real RTL bug was found and fixed
   (`offerings.html .pull-quote` used hardcoded `border-left`/`padding-left`, so its accent bar
   wouldn't flip in Farsi — now logical properties). **Still needs a proper human browser
   pass** before launch — nothing was viewed at readable zoom and several areas were never
   rendered visually at all: the `about.html` values grid, the `faq.html` accordion, the Farsi
   *offerings*/*about*/*retreats*/*faq* pages, and all mobile widths. (Minor: a few faint
   decorative blur-circles use `-right-*/-left-*` Tailwind utilities that don't mirror in RTL —
   cosmetic only.)

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

### ⏸ RESUME HERE — visual proofreading pass (paused 2026-06-18)

Mid-task: doing a real-browser visual QA of the whole site. Was blocked because the
terminal lacked macOS **Screen Recording** permission, so `screencapture` returned
"could not create image from display". User is restarting the terminal to apply the
permission. **When the terminal reopens, resume the visual proofread:**

1. Rebuild + serve the current build:
   ```bash
   cd ~/Projects/Munay2 && rm -rf _site && npm run build
   nohup python3 -m http.server 8099 --directory _site >/tmp/srv.log 2>&1 &
   ```
2. Open a page in the real browser and capture the screen (this is what needs the
   permission — verify it works first with one capture):
   ```bash
   open -a "Brave Browser" "http://localhost:8099/index.html"
   osascript -e 'tell application "Brave Browser" to activate'
   sleep 5 && screencapture -x /tmp/cap.png   # then read /tmp/cap.png
   ```
   Scroll with AppleScript System Events `key code 121` (Page Down) between captures.
   For **Farsi (RTL)** proofing: click the `فا` switcher, or pre-set it by injecting
   `localStorage.setItem("parastoo-lang","fa")` into a temp `_site/__fa_<page>.html`
   copy (the inline-setter trick used earlier) and open that.
3. **What still needs eyeballing** (rest of concern #1): scroll the full **home** page
   to confirm the new verbatim copy lays out well (mission "I am a student of life…",
   the 5 pillar cards, values teaser, CTA); the **`about.html`** 10-card values grid;
   the **`faq.html`** accordion open/close; **Farsi RTL** on offerings/about/retreats/
   faq; and **mobile widths** (narrow the window or use a ~430px capture).

Already visually confirmed: home **hero** (EN) renders correctly in the real browser;
home + contact in **Farsi RTL** (earlier headless shots) — nav mirrors, text right-
aligned, no overflow. (Note: headless Brave was flaky here — silent first-run hangs —
so the real-browser + screencapture route above is the reliable one now.)

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
