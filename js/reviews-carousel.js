/* Parastoo — home page reviews marquee (written reviews and video reviews).

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
   - the same code runs every [data-carousel] on the page: the written reviews
     ("reviews") and, when there is more than one, the video reviews
     ("videos"). Video clones stay clickable so whichever copy is on screen
     plays; starting a video pauses the drift, and resuming the drift stops
     the video (the player is swapped back for its still frame)
   - the visitor can also flick through by hand: drag or swipe the row,
     scroll it sideways (trackpad, or shift + mouse wheel), or use the arrow
     buttons. A fling carries on with momentum, and the drift picks up again
     a moment after the last touch
*/
(function () {
  function setup(root) {
  var track = root.querySelector("[data-reviews-track]");
  if (!track) return;
  var originals = Array.prototype.slice.call(track.children);
  if (!originals.length) return;
  var kind = root.dataset.carousel; // "reviews" or "videos": picks the labels
  var isVideo = kind === "videos";
  // Pristine copies taken before anything plays, so a clone made later (on a
  // resize) never copies a running player.
  var templates = originals.map(function (item) { return item.cloneNode(true); });

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
    "home.reviews.prev": "Previous review",
    "home.reviews.next": "Next review",
    "home.videos.pause": "Pause videos",
    "home.videos.play": "Play videos",
    "home.videos.prev": "Previous video",
    "home.videos.next": "Next video",
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
  var step = 0; // one card plus its gap, the distance an arrow press moves
  var offset = 0; // how far the row has travelled, always in [0, distance)

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
      templates.forEach(function (item) {
        var copy = item.cloneNode(true);
        copy.setAttribute("aria-hidden", "true");
        if (isVideo) {
          // must stay clickable: the copy on screen is often a clone
          copy.querySelectorAll("button").forEach(function (b) { b.tabIndex = -1; });
        } else {
          copy.setAttribute("inert", "");
        }
        copy.dataset.clone = "";
        track.appendChild(copy);
        clones.push(copy);
      });
    }

    step = width + gap;
    distance = originals.length * step;
    paint();
  }

  function wrap(n) {
    return distance ? ((n % distance) + distance) % distance : 0;
  }

  // Move the row by dx pixels on screen (positive = rightwards). In Farsi the
  // row travels the other way, so the same screen motion is the opposite
  // change in offset.
  function nudge(dx) {
    offset = wrap(offset + (isRtl() ? dx : -dx));
  }

  function paint() {
    var at = wrap(offset);
    var x = isRtl() ? at : -at;
    track.style.transform = "translate3d(" + x + "px,0,0)";
  }

  /* ---------- motion ----------
     One frame loop drives everything: the drift, the coast after a fling, and
     the glide an arrow press starts. It only runs while one of them has work
     to do. */
  var RESUME_MS = 2500; // quiet time after a hand-driven move before drifting
  var frameId = 0;
  var last = null;
  var held = 0; // hover and touch each hold a pause while active
  var focused = false; // keyboard focus inside the row also holds it
  var userPaused = false;
  var velocity = 0; // offset px per second, left over from a fling
  var glide = null; // { from, to, start } while an arrow press eases along
  var dragging = false;
  var resumeAt = 0;

  function drifting() {
    return !held && !focused && !userPaused && !reduceMotion.matches;
  }

  function busy() {
    return dragging || glide || velocity || drifting();
  }

  function frame(now) {
    // A backgrounded tab stops serving frames; capping the step keeps the row
    // from lurching forward a whole screen when the visitor comes back.
    var dt = last === null ? 0 : Math.min(100, now - last);
    last = now;
    if (glide) {
      var p = Math.min(1, (now - glide.start) / 450);
      var eased = 1 - Math.pow(1 - p, 3);
      offset = glide.from + (glide.to - glide.from) * eased;
      if (p === 1) { glide = null; offset = wrap(offset); }
    } else if (velocity && !dragging) {
      offset += (velocity * dt) / 1000;
      velocity *= Math.exp(-dt / 325); // the same decay a phone's own scroll uses
      if (Math.abs(velocity) < 10) velocity = 0;
    } else if (!dragging && drifting() && now >= resumeAt) {
      offset += (SPEED * dt) / 1000;
    }
    // A glide runs on unwrapped numbers so its start and end stay comparable.
    if (!glide) offset = wrap(offset);
    paint();
    frameId = busy() ? requestAnimationFrame(frame) : 0;
  }

  function running() {
    return !!frameId;
  }

  function sync() {
    if (busy() && !running()) {
      last = null;
      frameId = requestAnimationFrame(frame);
    } else if (!busy() && running()) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
    button.setAttribute("aria-pressed", String(userPaused));
    button.setAttribute("aria-label", t("home." + kind + (userPaused ? ".play" : ".pause")));
    prevButton.setAttribute("aria-label", t("home." + kind + ".prev"));
    nextButton.setAttribute("aria-label", t("home." + kind + ".next"));
  }

  function hold() { held++; sync(); }
  function release() { held = Math.max(0, held - 1); sync(); }

  // Any hand-driven move stops whatever was carrying the row and holds the
  // drift off for a moment, so the card the visitor landed on stays put.
  function handled() {
    glide = null;
    resumeAt = performance.now() + RESUME_MS;
    stopVideos();
  }

  // Ease to the next or previous card edge, counted from wherever the row is
  // heading, so repeated presses step cleanly card by card.
  function go(dir) {
    if (!step) return;
    var from = glide ? glide.to : offset;
    var to = (Math.round(from / step) + dir) * step;
    velocity = 0;
    handled();
    glide = { from: offset, to: to, start: performance.now() };
    sync();
  }

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
    if (!userPaused) { stopVideos(); resumeAt = 0; } // play means now
    pausedByVideo = false;
    sync();
  });

  // js/site.js swaps a still frame for the YouTube player on play and keeps
  // the still frame on frame._poster; putting it back stops the video.
  function stopVideos() {
    if (!isVideo) return;
    track.querySelectorAll("[data-yt]").forEach(function (frame) {
      if (!frame._poster) return;
      frame.replaceChildren.apply(frame, frame._poster);
      frame._poster = null;
    });
    if (pausedByVideo) { pausedByVideo = false; userPaused = false; }
    // Removing a focused player fires no focusout, so re-read it here.
    focused = track.contains(document.activeElement);
  }

  // Playing a video holds the row still until the visitor resumes it, and
  // slides a card that was half off the edge fully into view.
  //
  // The row loops by snapping offset back into [0, distance), which swaps the
  // copy of each card on screen for its twin one set along. A video playing
  // in the copy that just left would carry on unseen, so:
  // - a slide-in that crosses the loop point ends with the twin on screen,
  //   so the twin is the copy that plays
  // - any hand-driven move (drag, wheel, arrows) stops a playing video, and
  //   if the video was what paused the row, the drift picks up again
  var pausedByVideo = false;
  var forwarding = false; // true while handing a click on to a card's twin
  if (isVideo) {
    track.addEventListener("click", function (e) {
      var play = e.target.closest(".video-review__play");
      if (!play) return;
      if (!userPaused) pausedByVideo = true;
      userPaused = true;
      if (!forwarding && root.classList.contains("reviews--marquee")) {
        var item = play.closest(".reviews__item");
        var card = item.getBoundingClientRect();
        var box = root.getBoundingClientRect();
        var dx = 0; // screen movement that brings the card inside the row
        if (card.left < box.left) dx = box.left - card.left;
        else if (card.right > box.right) dx = box.right - card.right;
        if (dx) {
          var to = offset + (isRtl() ? dx : -dx);
          var items = Array.prototype.slice.call(track.children);
          var j = items.indexOf(item);
          velocity = 0;
          glide = { from: offset, to: to, start: performance.now() };
          var hop = to < 0 ? 1 : to >= distance ? -1 : 0;
          var twin = hop && items[j + hop * originals.length];
          if (twin) {
            e.stopPropagation(); // js/site.js must not play this copy
            forwarding = true;
            twin.querySelector(".video-review__play").click();
            forwarding = false;
            return;
          }
        }
      }
      sync();
    });
  }

  function arrow(dir) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "reviews__toggle reviews__arrow";
    b.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        (dir < 0 ? '<path d="M14.5 6l-6 6 6 6"/>' : '<path d="M9.5 6l6 6-6 6"/>') + "</svg>";
    b.addEventListener("click", function () { go(dir); });
    return b;
  }
  var prevButton = arrow(-1);
  var nextButton = arrow(1);

  var nav = document.createElement("div");
  nav.className = "reviews__nav";
  nav.appendChild(prevButton);
  nav.appendChild(button);
  nav.appendChild(nextButton);

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
    glide = null; velocity = 0; dragging = false;
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
  // Drag or swipe the row by hand. Pressing and holding on a touch screen
  // still stops it to read; letting go carries on after a moment. Vertical
  // swipes stay with the page (touch-action: pan-y in styles.css).
  var startX = 0, lastX = 0, lastT = 0, pointerId = null, moved = false;
  var suppressClick = false;
  track.addEventListener("click", function (e) {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  track.addEventListener("pointerdown", function (e) {
    if (!root.classList.contains("reviews--marquee")) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerId = e.pointerId;
    startX = lastX = e.clientX;
    lastT = e.timeStamp;
    moved = false;
    dragging = true;
    velocity = 0;
    handled();
    if (e.pointerType !== "mouse") hold();
    sync();
  });

  track.addEventListener("pointermove", function (e) {
    if (!dragging || e.pointerId !== pointerId) return;
    if (!moved) {
      if (Math.abs(e.clientX - startX) < 6) return;
      moved = true;
      root.classList.add("is-dragging");
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
    }
    var dx = e.clientX - lastX;
    var dt = Math.max(1, e.timeStamp - lastT);
    nudge(dx);
    // Smoothed so one jittery last sample does not decide the fling.
    var v = ((isRtl() ? dx : -dx) / dt) * 1000;
    velocity = velocity * 0.4 + v * 0.6;
    lastX = e.clientX;
    lastT = e.timeStamp;
    paint();
  });

  function endDrag(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    root.classList.remove("is-dragging");
    // A finger that stopped before lifting should not fling.
    if (!moved || e.timeStamp - lastT > 80) velocity = 0;
    // The click that follows a drag must not press a play button.
    if (moved) { suppressClick = true; setTimeout(function () { suppressClick = false; }, 0); }
    velocity = Math.max(-4000, Math.min(4000, velocity));
    handled();
    if (e.pointerType !== "mouse") release(); else sync();
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  // A drag that started on a card must not also select its text.
  track.addEventListener("dragstart", function (e) { e.preventDefault(); });

  // Sideways scrolling: a trackpad swipe, or shift + mouse wheel. Plain
  // vertical wheel scrolling is left alone so the page still scrolls past.
  root.addEventListener("wheel", function (e) {
    if (!root.classList.contains("reviews--marquee")) return;
    var dx = e.deltaX;
    if (!dx && e.shiftKey) dx = e.deltaY;
    if (!dx || Math.abs(dx) < Math.abs(e.deltaY) && !e.shiftKey) return;
    e.preventDefault();
    if (e.deltaMode === 1) dx *= 16; // Firefox reports lines, not pixels
    velocity = 0;
    handled();
    nudge(-dx);
    paint();
    sync();
  }, { passive: false });

  // Read from the DOM rather than counted: a focused video player that gets
  // removed never reports leaving, which would hold the row still for good.
  track.addEventListener("focusin", function () { focused = true; sync(); });
  track.addEventListener("focusout", function () {
    setTimeout(function () { focused = track.contains(document.activeElement); sync(); }, 0);
  });

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
  }

  document.querySelectorAll("[data-carousel]").forEach(setup);
})();
