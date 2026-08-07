/* Parastoo — home page reviews carousel.

   Client reviews come from her Google Sheet at build time (lib/reviews.mjs),
   so every card is already in the HTML inside a scroll-snapping track.

   Deliberate constraints:
   - vanilla, no libraries (house rule for the client sites)
   - the track scrolls natively, so swipe, trackpad and keyboard scrolling all
     work with this file absent, blocked or broken. This script only adds the
     arrows, the dots and the autoplay; it never creates the reviews.
   - page geometry is measured off live boxes rather than assumed from the
     breakpoints in styles.css, so the two can never drift
   - the Farsi switch flips html.dir with no page reload, so scroll direction
     is resolved at call time and never cached
   - autoplay stops for good on the first real interaction. A carousel that
     keeps yanking itself out from under someone mid-read is worse than one
     that simply stopped.
*/
(function () {
  var root = document.querySelector("[data-reviews]");
  if (!root) return;
  var track = root.querySelector("[data-reviews-track]");
  if (!track) return;
  var items = Array.prototype.slice.call(track.children);
  if (items.length < 2) return;

  var AUTOPLAY_MS = 7000;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- labels ----------
     These are aria-labels, and the shared i18n runtime only substitutes
     textContent, so they are read from the dictionary by hand. The English
     defaults are the last resort for a visitor whose js/i18n.js never loaded. */
  var FALLBACK = {
    "home.reviews.prev": "Previous reviews",
    "home.reviews.next": "More reviews",
    "home.reviews.page": "Reviews page",
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

  /* ---------- geometry ----------
     step is the distance between two cards' leading edges, which folds in the
     flex gap without having to parse it back out of the computed style.
     offsetLeft runs right-to-left in RTL, hence the abs throughout. */
  var step = 0;
  var perPage = 1;
  var pages = 1;

  function measure() {
    step = Math.abs(items[1].offsetLeft - items[0].offsetLeft) || items[0].offsetWidth;
    perPage = Math.max(1, Math.round(track.clientWidth / step));
    pages = Math.max(1, Math.ceil(items.length / perPage));
  }

  /* Browsers report scrollLeft as negative-going in RTL. Everything below
     works in "distance travelled from the start", which is positive in both
     directions, and only converts back at the moment of scrolling. */
  function isRtl() {
    return (document.documentElement.dir || "").toLowerCase() === "rtl";
  }
  function scrolled() {
    return Math.abs(track.scrollLeft);
  }
  function maxScroll() {
    return Math.max(0, track.scrollWidth - track.clientWidth);
  }

  /* Distance from the start to a card, taken from the card itself rather than
     multiplied out of step, so a target always lands exactly on the snap
     position the browser would have chosen and never a pixel beside it. */
  function offsetOf(index) {
    var i = Math.min(items.length - 1, Math.max(0, index));
    return Math.min(maxScroll(), Math.abs(items[i].offsetLeft - items[0].offsetLeft));
  }

  function currentPage() {
    var max = maxScroll();
    // The final page is short whenever the cards do not divide evenly, so its
    // scroll target is clamped and would otherwise round to the page before.
    if (max > 0 && scrolled() >= max - 2) return pages - 1;
    var pageWidth = step * perPage;
    if (!pageWidth) return 0;
    return Math.min(pages - 1, Math.max(0, Math.round(scrolled() / pageWidth)));
  }

  /* ---------- scrolling ----------
     The easing is done here rather than handed to CSS scroll-behavior, so RTL
     (where every scroll position is a negative scrollLeft) runs exactly the
     same code as LTR, and so an animation can be cut short and settled at any
     moment - on a direction flip, or when the tab is hidden and stops serving
     frames.

     Snap is suspended for the duration: mandatory snap treats the intermediate
     positions as places to rest and drags the track back to the nearest card
     mid-flight. */
  var DURATION_MS = 450;
  var frameId = 0;
  var settle = null; // set while an animation is in flight

  /* Jump to the end and put snap back. The inline value only ever holds the
     "none" this file writes, so clearing it always restores the stylesheet's
     mandatory snap; saving and restoring the old value would let two
     overlapping animations save each other's "none" and strand it. */
  function endAnim(to) {
    cancelAnimationFrame(frameId);
    frameId = 0;
    settle = null;
    if (to !== null) track.scrollLeft = to;
    track.style.scrollSnapType = "";
  }

  function animateTo(distance) {
    var to = (isRtl() ? -1 : 1) * distance;
    if (settle) settle();
    if (reduceMotion.matches) { track.scrollLeft = to; return; }

    var from = track.scrollLeft;
    var delta = to - from;
    if (Math.abs(delta) < 1) return;

    track.style.scrollSnapType = "none";
    settle = function () { endAnim(to); };
    var started = null; // null, not 0: a timestamp of 0 is falsy but valid

    frameId = requestAnimationFrame(function ease(now) {
      if (started === null) started = now;
      var p = Math.min(1, (now - started) / DURATION_MS);
      // easeOutCubic, the same shape as --ease-out elsewhere on the site
      track.scrollLeft = from + delta * (1 - Math.pow(1 - p, 3));
      if (p < 1) frameId = requestAnimationFrame(ease);
      else endAnim(to);
    });
  }

  function goTo(page) {
    animateTo(offsetOf(page * perPage));
  }

  /* ---------- chrome ---------- */
  var nav = document.createElement("div");
  nav.className = "reviews__nav";

  var CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

  function arrow(key, d) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "reviews__arrow";
    b.dataset.label = key;
    b.innerHTML = CHEVRON + '<path d="' + d + '"/></svg>';
    return b;
  }

  var prev = arrow("home.reviews.prev", "M15 5l-7 7 7 7");
  var next = arrow("home.reviews.next", "M9 5l7 7-7 7");

  var dotWrap = document.createElement("div");
  dotWrap.className = "reviews__dots";
  var dots = [];

  function buildDots() {
    dotWrap.innerHTML = "";
    dots = [];
    for (var i = 0; i < pages; i++) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "reviews__dot";
      d.dataset.page = String(i);
      d.dataset.label = "home.reviews.page";
      d.dataset.labelIndex = String(i + 1);
      dotWrap.appendChild(d);
      dots.push(d);
    }
    relabel();
  }

  /* Re-read every label out of the dictionary. Called on build and again
     whenever the language switcher rewrites html.lang. */
  function relabel() {
    var all = [prev, next].concat(dots);
    for (var i = 0; i < all.length; i++) {
      var el = all[i];
      var text = t(el.dataset.label);
      if (el.dataset.labelIndex) text += " " + el.dataset.labelIndex;
      el.setAttribute("aria-label", text);
    }
  }

  nav.appendChild(prev);
  nav.appendChild(dotWrap);
  nav.appendChild(next);

  function syncNav() {
    var page = currentPage();
    for (var i = 0; i < dots.length; i++) {
      dots[i].setAttribute("aria-current", String(i === page));
    }
    // Hidden rather than removed, so the track's width never changes underneath
    // a measurement that is already in flight.
    nav.hidden = pages < 2;
  }

  /* ---------- autoplay ---------- */
  var timer = null;
  var stopped = false;

  function tick() {
    var page = currentPage();
    goTo(page >= pages - 1 ? 0 : page + 1);
  }

  function play() {
    if (stopped || timer || pages < 2 || reduceMotion.matches) return;
    timer = setInterval(tick, AUTOPLAY_MS);
  }

  function pause() {
    if (timer) { clearInterval(timer); timer = null; }
  }

  /* One deliberate interaction and the carousel is hers, not ours. */
  function stop() {
    stopped = true;
    pause();
  }

  /* ---------- wiring ---------- */
  prev.addEventListener("click", function () { stop(); goTo(Math.max(0, currentPage() - 1)); });
  next.addEventListener("click", function () {
    stop();
    var page = currentPage();
    goTo(page >= pages - 1 ? 0 : page + 1);
  });
  dotWrap.addEventListener("click", function (e) {
    var dot = e.target.closest(".reviews__dot");
    if (!dot) return;
    stop();
    goTo(Number(dot.dataset.page));
  });

  ["pointerdown", "touchstart", "wheel", "keydown"].forEach(function (type) {
    track.addEventListener(type, stop, { passive: true });
  });

  root.addEventListener("pointerenter", pause);
  root.addEventListener("pointerleave", play);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", function (e) {
    if (!root.contains(e.relatedTarget)) play();
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      pause();
      // A hidden tab stops serving animation frames, so an animation caught
      // mid-flight would otherwise hang there with snap still switched off
      // until the visitor came back.
      if (settle) settle();
    } else {
      play();
    }
  });

  var frame = 0;
  track.addEventListener("scroll", function () {
    if (frame) return;
    frame = requestAnimationFrame(function () { frame = 0; syncNav(); });
  }, { passive: true });

  var resizeFrame = 0;
  window.addEventListener("resize", function () {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(function () {
      var before = pages;
      measure();
      if (pages !== before) buildDots();
      syncNav();
    });
  });

  /* A language change rewrites the labels, and switching to or from Farsi
     flips html.dir, which reverses what scrollLeft means. Re-measuring and
     returning to the first page is the only position guaranteed to be
     meaningful in the new direction. */
  var dir = document.documentElement.dir;
  new MutationObserver(function () {
    relabel();
    var flipped = document.documentElement.dir !== dir;
    dir = document.documentElement.dir;
    measure();
    buildDots();
    if (flipped) {
      // An animation started under the old direction is now scrolling towards
      // a position whose sign has just been inverted.
      endAnim(0);
    }
    syncNav();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });

  reduceMotion.addEventListener("change", function () {
    if (reduceMotion.matches) pause(); else play();
  });

  root.appendChild(nav);
  measure();
  buildDots();
  syncNav();
  play();

  // Web fonts land after first paint and change how much text each card holds,
  // which moves every card's offsetLeft.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); buildDots(); syncNav(); });
  }
})();
