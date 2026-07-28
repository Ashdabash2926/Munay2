/* Parastoo — about page "moments wall".

   A full-viewport plane of photo tiles. Each row drifts horizontally at its own
   speed and wraps, so the wall never runs out of pictures. On a fine pointer the
   tiles part radially around the cursor while the nearest tile is pulled to it,
   lifted and scaled up.

   Deliberate constraints:
   - vanilla, no libraries (house rule for the client sites)
   - the rAF loop only runs while the section is on screen, so a long page does
     not pay for a wall nobody is looking at
   - coarse pointers and prefers-reduced-motion get the drift only, never the
     parting, and never the custom cursor
   - tile transforms are written straight to style.transform each frame; there is
     deliberately no CSS transition on .mw-tile, which would fight the loop */
(function () {
  const section = document.getElementById("momentsWall");
  if (!section) return;

  const plane = section.querySelector(".moments-wall__plane");
  const cursorEl = section.querySelector(".moments-wall__cursor");

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const interactive = finePointer && !reduceMotion;

  /* Display order carried over from the ten-photo gallery. Alt text is only
     written for the three fallback tiles in the markup; the wall itself is
     decorative repetition of the same ten photographs, so its tiles are hidden
     from assistive tech via the section's aria-label and empty alts. */
  const PHOTOS = Array.from({ length: 10 }, (_, i) =>
    `assets/img/wall-${String(i + 1).padStart(2, "0")}.webp`);

  let tiles = [];
  let cols = 0, rows = 0, cellW = 0, cellH = 0, planeW = 0, planeH = 0;
  let rowScroll = [], rowVel = [];
  let running = false, built = false, rafId = 0;

  const pointer = { x: 0, y: 0, inside: false };
  const offset = { x: 0, y: 0 };
  let curX = 0, curY = 0, cursorReady = false;
  let focused = null;

  const lerp = (a, b, n) => a + (b - a) * n;
  const wrap = (v, m) => ((v % m) + m) % m;
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- layout ----------
     Cells are 4:5 to match the source photographs, sized off the viewport so the
     wall reads the same on a laptop and a large display. The plane is made wider
     and taller than the viewport so drifting rows always have tiles to spare. */
  function measure() {
    const vw = innerWidth, vh = section.clientHeight || innerHeight;
    /* Sized so ten photographs fill the wall without repeating so often that the
       repeat reads as a shortage of pictures. Larger tiles, fewer of them. */
    cellW = Math.round(Math.max(130, Math.min(300, vw * 0.19)));
    cellH = Math.round(cellW * 1.25);
    const gap = Math.round(cellW * 0.07);

    cols = Math.ceil((vw * 1.5) / (cellW + gap)) + 1;
    rows = Math.ceil((vh * 1.25) / (cellH + gap)) + 1;

    planeW = cols * (cellW + gap);
    planeH = rows * (cellH + gap);
  }

  function build() {
    measure();
    plane.textContent = "";
    tiles = [];

    plane.style.width = planeW + "px";
    plane.style.height = planeH + "px";
    plane.style.marginLeft = -planeW / 2 + "px";
    plane.style.marginTop = -planeH / 2 + "px";

    const gap = Math.round(cellW * 0.07);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const el = document.createElement("div");
        el.className = "mw-tile";
        el.style.width = cellW + "px";
        el.style.height = cellH + "px";

        const im = document.createElement("img");
        /* r * 3 staggers the sequence row to row so the same photograph never
           lands directly above or beside itself. 3 and 10 are coprime, so the
           whole set is used before any repeat within a row. */
        im.src = PHOTOS[(r * 3 + c) % PHOTOS.length];
        im.alt = "";
        im.width = 600; im.height = 750;
        im.decoding = "async";
        el.appendChild(im);

        const bx = c * (cellW + gap);
        const by = r * (cellH + gap);
        tiles.push({
          el, bx, by, row: r,
          bz: rand(-40, 30), rot: rand(-3, 3),
          ox: 0, oy: 0, oz: 0,
          lx: bx, cx: bx + cellW / 2, cy: by + cellH / 2,
          scale: 1,
        });
        plane.appendChild(el);
      }
    }

    rowScroll = new Array(rows).fill(0);
    /* Alternating direction per row, slightly varied speed, so the wall never
       reads as one sheet sliding. Halved when the pointer cannot part it, since
       drift is then the only motion and a slower wall is easier to look at. */
    rowVel = Array.from({ length: rows }, (_, r) =>
      (r % 2 === 0 ? -1 : 1) * (0.18 + (r % 3) * 0.04) * (interactive ? 1 : 0.5));

    for (const t of tiles) {
      t.el.style.transform =
        `translate3d(${t.bx}px, ${t.by}px, ${t.bz}px) rotateZ(${t.rot}deg)`;
    }
    built = true;
  }

  /* Section-relative point -> plane-local coordinates. Ignores the 3D skew,
     which is only a few degrees and does not change which tile is nearest.
     pointer.x/y are stored section-relative throughout, which is also what the
     absolutely positioned custom cursor needs, so nothing converts twice. */
  function toPlane(px, py) {
    return {
      x: px - section.clientWidth / 2 - offset.x + planeW / 2,
      y: py - section.clientHeight / 2 - offset.y + planeH / 2,
    };
  }

  const PART_RADIUS = 230;
  const PART_FORCE = 90;

  function frame() {
    if (!running) return;

    if (interactive && pointer.inside) {
      if (!cursorReady) { curX = pointer.x; curY = pointer.y; cursorReady = true; }
      curX = lerp(curX, pointer.x, 0.25);
      curY = lerp(curY, pointer.y, 0.25);
      cursorEl.style.transform = `translate(${curX}px, ${curY}px)`;
    }

    for (let r = 0; r < rows; r++) rowScroll[r] += rowVel[r];
    for (const t of tiles) {
      t.lx = wrap(t.bx + rowScroll[t.row], planeW);
      t.cx = t.lx + cellW / 2;
      t.cy = t.by + cellH / 2;
    }

    let focus = null;
    if (interactive && pointer.inside) {
      const nx = pointer.x / section.clientWidth - 0.5;
      const ny = pointer.y / section.clientHeight - 0.5;
      offset.x = lerp(offset.x, -nx * 60, 0.06);
      offset.y = lerp(offset.y, -ny * 40, 0.06);
      plane.style.transform =
        `translate(${offset.x}px, ${offset.y}px) rotateX(${-ny * 6}deg) rotateY(${nx * 8}deg)`;

      const wp = toPlane(pointer.x, pointer.y);
      let best = Infinity;
      for (const t of tiles) {
        const d = Math.hypot(t.cx - wp.x, t.cy - wp.y);
        if (d < best) { best = d; focus = t; }
      }
      if (best > 200) focus = null;

      for (const t of tiles) {
        let tx = 0, ty = 0, tz = 0;
        if (t === focus) {
          tx = (wp.x - t.cx) * 0.82;
          ty = (wp.y - t.cy) * 0.82;
        } else {
          const dx = t.cx - wp.x, dy = t.cy - wp.y;
          const dist = Math.hypot(dx, dy) || 0.001;
          if (dist < PART_RADIUS) {
            const f = 1 - dist / PART_RADIUS;
            const push = f * f * PART_FORCE;
            tx = (dx / dist) * push;
            ty = (dy / dist) * push;
            tz = f * 30;
          }
        }
        t.ox = lerp(t.ox, tx, 0.14);
        t.oy = lerp(t.oy, ty, 0.14);
        t.oz = lerp(t.oz, tz, 0.14);
        t.scale = lerp(t.scale, t === focus ? 1.55 : 1, 0.16);
        t.el.style.transform =
          `translate3d(${t.lx + t.ox}px, ${t.by + t.oy}px, ${t.bz + t.oz + (t === focus ? 90 : 0)}px) ` +
          `rotateZ(${t === focus ? 0 : t.rot}deg) scale(${t.scale})`;
      }
    } else {
      /* Drift only: no parting, no plane tilt. Tiles ease back to rest in case
         the pointer left mid-push. */
      for (const t of tiles) {
        t.ox = lerp(t.ox, 0, 0.14);
        t.oy = lerp(t.oy, 0, 0.14);
        t.oz = lerp(t.oz, 0, 0.14);
        t.scale = lerp(t.scale, 1, 0.16);
        t.el.style.transform =
          `translate3d(${t.lx + t.ox}px, ${t.by + t.oy}px, ${t.bz + t.oz}px) ` +
          `rotateZ(${t.rot}deg) scale(${t.scale})`;
      }
    }
    focused = focus;

    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /* Only animate while the section is actually on screen. rootMargin gives the
     images a head start so the wall is already painted when it scrolls in. */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        if (!built) build();
        start();
      } else {
        stop();
        section.classList.remove("is-live");
        pointer.inside = false;
      }
    }
  }, { rootMargin: "200px 0px" });
  io.observe(section);

  /* A frozen wall still needs building, but must never spin the loop. */
  if (reduceMotion) {
    const once = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { if (!built) build(); once.disconnect(); }
    }, { rootMargin: "200px 0px" });
    once.observe(section);
    io.disconnect();
    return;
  }

  if (interactive) {
    section.addEventListener("pointerenter", () => {
      pointer.inside = true;
      section.classList.add("is-live");
    });
    section.addEventListener("pointerleave", () => {
      pointer.inside = false;
      cursorReady = false;
      section.classList.remove("is-live");
    });
    section.addEventListener("pointermove", (e) => {
      const r = section.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    }, { passive: true });
  }

  let resizeTimer = 0;
  addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!built) return;
      const wasRunning = running;
      stop();
      build();
      if (wasRunning) start();
    }, 200);
  }, { passive: true });
})();
