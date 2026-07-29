/* Parastoo — about page "values constellation".

   Ten values fanned around the section's statement. Hovering a name previews it
   in the centre, clicking pins it there until it is clicked again or another is
   chosen.

   Deliberate constraints:
   - vanilla, no libraries (house rule for the client sites)
   - the markup is ten native <details>, so the section is a working accordion
     with this file absent, blocked or broken. This script only adds
     .is-enhanced and the behaviour that depends on it; it never creates the
     content or the semantics.
   - open state is read back off the DOM rather than mirrored in a variable,
     because the toggle event is queued and closing nine siblings would race a
     variable that tried to track it
   - the centre is decorative (aria-hidden). Assistive tech reads the branch's
     own panel, which is why opening a value here is a real <details> toggle.
   - the connector lines are measured from live bounding boxes, so RTL, three
     languages and every viewport width fall out of the same code */
(function () {
  const root = document.getElementById("valuesConstellation");
  if (!root) return;

  const svg = root.querySelector(".constellation__lines");
  const core = root.querySelector(".constellation__core");
  const detailName = root.querySelector(".constellation__detail-name");
  const detailDesc = root.querySelector(".constellation__detail-desc");
  const items = Array.from(root.querySelectorAll(".constellation__item"));
  if (!svg || !core || !detailName || !detailDesc || !items.length) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  /* keeps the line clear of the dot it leaves and the panel it arrives at */
  const GAP = 7;

  const fan = matchMedia("(min-width: 900px)");
  const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

  let hovered = null;
  let paths = [];

  root.classList.add("is-enhanced");

  /* ---------- state ---------- */

  function active() {
    if (!fan.matches) return null;
    return hovered || items.find((item) => item.open) || null;
  }

  function render() {
    const current = active();

    if (current) {
      const nameEl = current.querySelector(".constellation__name");
      const descEl = current.querySelector(".constellation__panel p");
      /* Carrying the keys across means applyLang refills the open centre on a
         language change for free, with no listener and nothing to invalidate. */
      detailName.setAttribute("data-i18n", nameEl.getAttribute("data-i18n"));
      detailDesc.setAttribute("data-i18n", descEl.getAttribute("data-i18n"));
      detailName.textContent = nameEl.textContent;
      detailDesc.textContent = descEl.textContent;
    }

    root.classList.toggle("is-open", Boolean(current));
    items.forEach((item, i) => {
      item.classList.toggle("is-active", item === current);
      if (paths[i]) paths[i].classList.toggle("is-active", item === current);
    });
  }

  /* ---------- connector lines ---------- */

  function drawLines() {
    if (!fan.matches) {
      svg.replaceChildren();
      paths = [];
      return;
    }

    const stage = root.getBoundingClientRect();
    const centre = core.getBoundingClientRect();
    if (!stage.width || !centre.width) return;

    svg.setAttribute("viewBox", `0 0 ${stage.width} ${stage.height}`);

    const centreX = (centre.left + centre.right) / 2;
    const y2 = centre.top + centre.height / 2 - stage.top;

    paths = items.map((item) => {
      const node = item.querySelector("summary").getBoundingClientRect();
      const onStartSide = (node.left + node.right) / 2 < centreX;

      const x1 = (onStartSide ? node.right + GAP : node.left - GAP) - stage.left;
      const y1 = node.top + node.height / 2 - stage.top;
      const x2 = (onStartSide ? centre.left - GAP : centre.right + GAP) - stage.left;

      const path = document.createElementNS(SVG_NS, "path");
      /* leaves the dot horizontally, then curves in to the centre */
      path.setAttribute("d", `M${x1} ${y1} Q${(x1 + x2) / 2} ${y1} ${x2} ${y2}`);
      return path;
    });

    svg.replaceChildren(...paths);
    render();
  }

  /* ---------- wiring ---------- */

  items.forEach((item) => {
    const summary = item.querySelector("summary");

    item.addEventListener("toggle", () => {
      /* one at a time in the fan, where they all share a single centre;
         on the phone spine several open branches are no problem */
      if (item.open && fan.matches) {
        items.forEach((other) => { if (other !== item) other.open = false; });
      }
      render();
    });

    if (canHover) {
      summary.addEventListener("pointerenter", () => { hovered = item; render(); });
      summary.addEventListener("pointerleave", () => {
        if (hovered === item) { hovered = null; render(); }
      });
    }
    summary.addEventListener("focus", () => { hovered = item; render(); });
    summary.addEventListener("blur", () => {
      if (hovered === item) { hovered = null; render(); }
    });
  });

  new ResizeObserver(drawLines).observe(root);

  /* a language change rewrites every label, so the geometry moves with it */
  new MutationObserver(drawLines).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["lang", "dir"],
  });

  fan.addEventListener("change", () => {
    hovered = null;
    drawLines();
    render();
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawLines);
  drawLines();
})();
