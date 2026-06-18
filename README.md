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

- [ ] **Real session prices & durations** — offerings page uses illustrative values
- [ ] **In-person city / location** — currently "in person & online"; add real city once confirmed
- [ ] **Real testimonials** — home page uses a holding quote
- [ ] **Photography** — ceremony, method, retreat, and private chef sections need real Parastoo images; `assets/og.jpg` should be re-shot as a Parastoo-branded OG card
- [ ] **Retreat booking URL** — `content/site.json` → `retreat.bookingUrl`, currently `#`
- [ ] **Contact form action** — `contact.html` form `action` is `#`; wire to Formspree, Cloudflare Worker, etc.
- [ ] **Absolute og:image URL** — set a fully-qualified URL on the final domain (currently relative `assets/og.jpg`)
- [ ] **Native ES / FA translation review** — have a fluent speaker check the Spanish and Farsi copy

## Deploy

Cloudflare Pages from private GitHub repo `Ashdabash2926/Munay2` (branch: `main`).
