# Munay — Holistic Massage, Sacred Valley

**Status:** Approved design (2026-06-09)
**Type:** Flat static client website (multi-page)
**Location:** `/Users/ash/Projects/munay-massage`

> **Brand name is a placeholder.** "Munay" = love / heart-energy in Quechua Andean
> cosmovision — chosen to fit holistic healing and the Pisac hippie community. All
> business details (name, services, durations, prices, contact) are tasteful
> placeholders to be swapped for real content later.

---

## 1. Goal & theme

A calming, warm, energetic website for a holistic massage practice in Písac, Sacred
Valley (Cusco), Peru, serving the international hippie/wellness community. The feel:
relaxed, comforting, warm, energetic. Visual direction drawn from the three reference
designs the user supplied — all sharing a warm terracotta / cream / cocoa palette with
elegant serif display type and orchid/spa imagery.

Distinct from a single-page scroll site: this is **four real pages** with parallax
scrolling and animation, not sections of one page.

## 2. Architecture

- **Flat static, no build step.** Matches the workspace convention for client sites
  (HTML + Tailwind CDN + CSS custom properties + vanilla JS). Deploys directly to
  GitHub Pages.
- **Files:**
  - `index.html` — Home
  - `about.html` — About
  - `treatments.html` — Treatments
  - `contact.html` — Contact
  - `css/styles.css` — custom properties, parallax/animation styles, RTL overrides
  - `js/site.js` — injects shared nav + footer into a mount point on every page; wires
    scroll-reveal (IntersectionObserver) and parallax behaviour
  - `js/i18n.js` — translation dictionary + language switcher
  - `assets/` — images, logo, favicon
- **Shared chrome via JS injection.** The nav and footer are built once in `js/site.js`
  and mounted into a `<div id="site-nav">` / `<div id="site-footer">` on each page.
  Edit once, applies everywhere — no markup duplication across the four files.
- **Out of scope (YAGNI):** no booking backend, no CMS, no analytics, no real form
  submission. The contact form posts to a placeholder action; booking buttons link to a
  placeholder WhatsApp/booking URL.

## 3. Internationalisation (EN / ES / FA)

- **Three languages:** English, Spanish, Farsi (Persian).
- **Mechanism:** a single `js/i18n.js` object keyed `en` / `es` / `fa`. Translatable
  elements carry a `data-i18n="key"` attribute; the switcher replaces their text from the
  active dictionary. Attributes like placeholders use `data-i18n-attr`.
- **Switcher:** a 3-way control (EN · ES · فا) in the nav. On change it:
  1. sets `document.documentElement.lang` and `dir`
  2. swaps all `data-i18n` text
  3. persists the choice to `localStorage` (key `munay-lang`) and restores it on load
- **Farsi is right-to-left (true RTL flip).** When `fa` is active, `<html dir="rtl">`,
  the **Vazirmatn** font loads, and `css/styles.css` carries RTL-aware overrides (logical
  properties / `[dir="rtl"]` rules) so the whole layout mirrors correctly. EN/ES use
  `dir="ltr"`.
- Default language on first visit: English.

## 4. Pages & content

### Home (`index.html`)
- **Hero:** layered parallax (orchid / Andean spa imagery with depth), a subtle
  continuous float, and a scroll-cued headline. Primary CTA: **Book Now**.
- Mission teaser (short holistic philosophy statement).
- Three featured treatments (cards linking to Treatments).
- A full-width parallax "your escape" band.
- One testimonial.
- Closing CTA to Contact/booking.

### About (`about.html`)
- Holistic philosophy + practitioner story.
- The **oils / aromatherapy ritual** narrative (folded in here rather than its own page).
- The Sacred Valley setting (Písac, altitude, Andean energy).

### Treatments (`treatments.html`)
- Full menu, each a card with parallax-revealed imagery, placeholder
  name / duration / price. Placeholder treatments:
  - Andean Hot Stone
  - Holistic Full-Body Relaxation
  - Aromatherapy Oil Massage
  - Deep Tissue / Therapeutic
  - Chakra / Energy Balancing
- A pricing/booking CTA band.

### Contact (`contact.html`)
- Location (Písac, Sacred Valley) with an embedded map.
- Hours (placeholder).
- WhatsApp / booking CTA (placeholder number/link).
- Simple contact form (placeholder action, name / email / message).

## 5. Look & motion

- **Palette** (CSS custom properties): warm terracotta/clay accent, soft cream
  backgrounds, deep cocoa-brown feature sections, muted gold highlights.
- **Typography:** elegant serif display (Cormorant or Fraunces) + a clean humanist sans
  for body (Barlow family, consistent with other Pisac sites); **Vazirmatn** for Farsi.
- **Motion:**
  - Parallax via modern CSS scroll-driven animation (`animation-timeline: scroll()` /
    `view()`), with an **IntersectionObserver + transform fallback** for unsupported
    browsers.
  - Section scroll-reveals (fade / rise) as elements enter the viewport.
  - Hero: layered parallax depth + subtle float.
  - **Respects `prefers-reduced-motion`** — disables non-essential motion.
- Mobile-first responsive; semantic HTML (`<nav>`, `<section>`, `<article>`, etc.).

## 6. Design / build skills to apply

During implementation, lean on **ui-ux-pro-max** (layout system, palette, spacing,
typography pairing, interaction states) and **frontend-design** (distinctive,
production-grade, non-generic visual execution + motion polish).

## 7. Deployment

GitHub Pages under `Ashdabash2926/munay-massage` (consistent with the workspace's other
flat static sites). Auto-push after changes per user preference.
