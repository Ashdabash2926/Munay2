# Retreats system, where things stand (2026-07-29)

Parastoo can now publish her own upcoming retreats from a Google Sheet, without a
developer. This is the state of it after the build and the first live setup.

## Done

**The page.** `retreats.html` no longer describes one specific retreat. The hero, the
meta tags and the intro copy are evergreen in all three languages, so nothing on the page
can go stale. The same was true of the home page (`home.escape.*`, `pillar.5.desc`) and
that was fixed too. A guard test in `test/copy.test.mjs` fails if a year, a place name or
a retreat name ever reappears in that copy.

**The pipeline.** `lib/retreats.mjs` reads her sheet as CSV at build time, validates every
row, formats each date range into English, Spanish and Farsi, downloads each photo and
re-hosts it as WebP on our own origin, then hands Eleventy an array of retreats.
`retreats.html` renders them. 60 tests, three of which run real Eleventy builds.

**The layout.** One retreat fills the section as a wide feature card, image beside the
copy. Two share the width, three or more take a third each.

**The live setup.**
- Sheet "Munay retreats" in Ash's Google account, tab `Retreats`, shared Anyone-with-the-link
  Viewer. Columns B and C number-formatted `yyyy-mm-dd`. Status is a four-value dropdown.
  Column I holds her instructions.
- Bound Apps Script "Munay retreats publish" adds a **Munay** menu with **Publish to
  website**. It validates every row and refuses to publish, naming the bad row, before
  firing the deploy hook. A copy of the script lives at `docs/retreats-publish.gs`.
- `RETREATS_SHEET_URL` set as a Cloudflare Pages environment variable and as a GitHub
  Actions secret on the public repo. Never committed.
- Cloudflare deploy hook "Sheet publish" on `main`, stored in the script's Script
  properties as `DEPLOY_HOOK_URL`.

## The one structural thing to understand

**Her Publish button rebuilds Cloudflare only.** A deploy hook is a URL that starts a
Cloudflare build. GitHub Pages has no equivalent that is safe to put in a spreadsheet:
triggering it needs a token with write access to the repo. So:

- `munay-site.pages.dev` is canonical. This is the URL to give her, and to point any real
  domain at. The studio-north portfolio card already links here.
- `ashdabash2926.github.io/Munay2` is a mirror. It has the same code and the same secret,
  so it renders correctly, but it only rebuilds on a push and will drift between pushes.

If she ever says "I published and nothing changed", check which URL she is looking at
before anything else. That already happened once.

## To do before handover

1. **Authorise the script as her.** She clicks Munay, Publish to website, and works
   through Google's consent screens once: choose account, Advanced, Go to project
   (unsafe), Allow. It says unsafe because the script is unverified, which is normal for a
   private script. Do this with her in person, it looks alarming the first time.
2. **Give her edit access to the sheet.** Add her email as an Editor in the Share dialog.
   That is separate from the link sharing, which is read-only and only exists so the build
   can fetch it. Her address must be a Google account, though it does not have to be a
   Gmail one: any existing email can be registered as one at `accounts.google.com/signup`
   via "Use your existing email instead". Signing in is not optional, because an anonymous
   link-editor cannot grant the authorization the Publish button needs.
3. **Fill in the Cost cell** for The Way Home, or decide to leave it. Empty means the card
   shows no price line at all.
4. **Hand her `docs/retreats-sheet-guide.md`.** One page, written for her, not for a
   developer.

## Known gaps, not blocking

- **Spanish and Farsi are AI-written and unreviewed.** Same caveat the rest of the site
  already carries in `README.md`. Worth a fluent speaker before this is the page her
  clients land on.
- **The studio-north portfolio card is stale in its copy.** It still says "Munay",
  "Holistic Wellness and Retreats, Sacred Valley, Peru", and the preview image is a
  screenshot of the old homepage. The link itself is correct.
- **An archived row with free-text dates will fail the build** if there is nothing
  upcoming alongside it. This is a deliberate, narrow trade: that pattern is
  indistinguishable from the date column losing its format, which is the failure worth
  catching. Blank dates and properly-dated old rows are both safe.
- **The GitHub Pages mirror has no scheduled rebuild.** If it should stay closer in step,
  a nightly cron in `.github/workflows/deploy.yml` would do it, at the cost of up to a day
  of lag.

## Debugging

`node scripts/check-retreats.mjs "<gviz csv url>"` prints exactly what the site would
render from a sheet, without building anything. Run this first when something looks wrong.

A damaged sheet (missing column, tab renamed, sharing switched off) fails the build on
purpose, which leaves the previous deploy live. A single bad row is skipped with a warning
so her other retreats still publish.

## Where things live

- Design: `docs/superpowers/specs/2026-07-28-upcoming-retreats-design.md`
- Plan: `docs/superpowers/plans/2026-07-28-upcoming-retreats.md`
- Her guide: `docs/retreats-sheet-guide.md`
- Sheet script: `docs/retreats-publish.gs`
- Deploy notes: `README.md`
