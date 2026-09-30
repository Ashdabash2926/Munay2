/* Parastoo — home page reviews marquee.

   Client reviews come from her Google Sheet at build time (lib/reviews.mjs),
   so every card is already in the HTML inside a natively scrolling track.
   This script turns that track into a slow, continuous, endless drift.

   Deliberate constraints:
   - vanilla, no libraries (house rule for the client sites)
   - with this file absent, blocked or broken, or under prefers-reduced-motion,
     the track stays a plain swipeable strip; this script never creates reviews
   - the loop is seamless because the cards are cloned once or more after the
     originals and the track wraps by exactly one set's width. The clones are
     aria-hidden and inert, so a screen reader meets each review once
   - driven by requestAnimationFrame rather than a CSS animation, so a pause
     stops on the spot and resumes from the same place, and speed stays the
     same whatever the number of cards
   - the Farsi switch flips html.dir with no page reload, so the direction and
     geometry are re-read whenever it changes, never cached across it
   - motion that runs for more than five seconds needs a way to stop it
     (WCAG 2.2.2), hence hover/focus/touch pausing and the pause button
*/
(function () {
  var root = document.querySelector("[data-reviews]");
  if (!root) return;
  var track = root.querySelector("[data-reviews-track]");
  if (!track) return;
  var originals = Array.prototype.slice.call(track.children);
  if (!originals.length) return;

  var SPEED = 32; // px per second: slow enough to read a card as it passes
  var GAP_REM = 1.75; // matches the gap on .reviews__track in styles.css
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- labels ----------
     aria-labels, and the shared i18n runtime only substitutes textContent, so
     they are read from the dictionary by hand. The English defaults are the
     last resort for a visitor whose js/i18n.js never loaded. */
  var FALLBACK = {
    "home.reviews.pause": "Pause reviews",
    "home.reviews.play": "Play reviews",
  };

  function t(key) {
    var i18n = window.ParastooI18N && window.ParastooI18N.I18N;
    var lang = document.documentElement.lang || "en";
    if (i18n) {
      if (i18n[lang] && i18n[lang][key] != null) return i18n[lang][key];
      if (i18n.en && i18n.en[key] != null) return i18n.en[key];
    }
    return FALLBACK[key] || key;
  }

  function isRtl() {
    return (document.documentElement.dir || "").toLowerCase() === "rtl";
  }

  /* ---------- geometry ----------
     Cards per view mirror the old carousel's breakpoints; on a phone a sliver
     of the next card shows, which tells the eye the row keeps going. */
  var clones = [];
  var distance = 0; // one full set of originals, gap included
  var offset = 0;

  function perView() {
    if (window.matchMedia("(min-width: 1024px)").matches) return 3;
    if (window.matchMedia("(min-width: 640px)").matches) return 2;
    return 1.15;
  }

  function layout() {
    var gap = GAP_REM * parseFloat(getComputedStyle(document.documentElement).fontSize);
    var view = perView();
    var width = (root.clientWidth - gap * (Math.ceil(view) - 1)) / view;
    root.style.setProperty("--review-w", width + "px");

    // Enough copies that the row never runs dry: one set to scroll through,
    // plus at least a screenful trailing behind it.
    var needed = Math.max(1, Math.ceil((view + 1) / originals.length));
    while (clones.length / originals.length < needed) {
      originals.forEach(function (item) {
        var copy = item.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        copy.setAttribute("inert", "");
        copy.dataset.clone = "";
        track.appendChild(copy);
        clones.push(copy);
      });
    }

    distance = originals.length * (width + gap);
    offset = offset % distance;
    paint();
  }

  function paint() {
    var x = isRtl() ? offset : -offset;
    track.style.transform = "translate3d(" + x + "px,0,0)";
  }

  /* ---------- motion ---------- */
  var frameId = 0;
  var last = null;
  var held = 0; // hover, focus and touch each hold a pause while active
  var userPaused = false;

  function frame(now) {
    // A backgrounded tab stops serving frames; capping the step keeps the row
    // from lurching forward a whole screen when the visitor comes back.
    var dt = last === null ? 0 : Math.min(100, now - last);
    last = now;
    offset = (offset + (SPEED * dt) / 1000) % distance;
    paint();
    frameId = requestAnimationFrame(frame);
  }

  function running() {
    return !!frameId;
  }

  function sync() {
    var should = !held && !userPaused && !reduceMotion.matches;
    if (should && !running()) {
      last = null;
      frameId = requestAnimationFrame(frame);
    } else if (!should && running()) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
    button.setAttribute("aria-pressed", String(userPaused));
    button.setAttribute("aria-label", t(userPaused ? "home.reviews.play" : "home.reviews.pause"));
  }

  function hold() { held++; sync(); }
  function release() { held = Math.max(0, held - 1); sync(); }

  /* ---------- pause button ---------- */
  var button = document.createElement("button");
  button.type = "button";
  button.className = "reviews__toggle";
  button.innerHTML =
    '<svg class="reviews__icon-pause" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<rect x="7" y="5" width="3.2" height="14" rx="1"/><rect x="13.8" y="5" width="3.2" height="14" rx="1"/></svg>' +
    '<svg class="reviews__icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
  button.addEventListener("click", function () {
    userPaused = !userPaused;
    sync();
  });

  var nav = document.createElement("div");
  nav.className = "reviews__nav";
  nav.appendChild(button);

  /* ---------- switching modes ----------
     Reduced motion is honoured live: turning it on mid-visit hands the
     visitor back the plain swipeable strip, and off again restarts the drift. */
  function enable() {
    root.classList.add("reviews--marquee");
    nav.hidden = false;
    layout();
    sync();
  }

  function disable() {
    if (running()) { cancelAnimationFrame(frameId); frameId = 0; }
    root.classList.remove("reviews--marquee");
    track.style.transform = "";
    clones.forEach(function (c) { c.remove(); });
    clones = [];
    offset = 0;
    nav.hidden = true;
  }

  /* ---------- wiring ---------- */
  root.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") hold(); });
  root.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") release(); });
  // Press and hold to read on a touch screen; letting go carries on.
  track.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    hold();
    var done = function () {
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
      release();
    };
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
  });
  track.addEventListener("focusin", hold);
  track.addEventListener("focusout", release);

  var resizeFrame = 0;
  window.addEventListener("resize", function () {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(function () {
      if (root.classList.contains("reviews--marquee")) layout();
    });
  });

  // Language change: relabel the button; a Farsi flip also reverses the
  // direction of travel, which paint() reads fresh on the next frame.
  new MutationObserver(function () {
    if (root.classList.contains("reviews--marquee")) { layout(); sync(); }
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });

  reduceMotion.addEventListener("change", function () {
    if (reduceMotion.matches) disable(); else enable();
  });

  root.appendChild(nav);
  if (reduceMotion.matches) disable(); else enable();

  // Web fonts land after first paint and can change the root's width.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (root.classList.contains("reviews--marquee")) layout();
    });
  }
})();
