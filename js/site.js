/* Parastoo — shared chrome (nav + footer), language switcher, motion wiring. */
(function () {
  const page = document.body.dataset.page || "home";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* simple sun/seed glyph — non-region, used in nav + footer + dividers */
  const mark = (cls) => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <circle cx="12" cy="12" r="3.4"/>
      <path d="M12 2v3.4M12 18.6V22M2 12h3.4M18.6 12H22M4.9 4.9l2.4 2.4M16.7 16.7l2.4 2.4M19.1 4.9l-2.4 2.4M7.3 16.7l-2.4 2.4"/>
    </svg>`;

  const links = [["home", "index.html"], ["about", "about.html"],
                 ["offerings", "offerings.html"], ["retreats", "retreats.html"],
                 ["faq", "faq.html"], ["contact", "contact.html"]];

  const navLinks = (cls) => links.map(([k, href]) =>
    `<a href="${href}" data-i18n="nav.${k}" class="nav-link ${cls}"
        ${k === page ? 'aria-current="page"' : ""}></a>`).join("");

  const langBtns = ["en", "es", "fa"].map(l =>
    `<button class="lang-btn px-2.5 text-[11px] font-semibold uppercase tracking-wider"
             data-lang="${l}" aria-label="${{en:"English",es:"Español",fa:"فارسی"}[l]}">${l === "fa" ? "فا" : l}</button>`).join("");

  /* ---------- nav ---------- */
  document.getElementById("site-nav").innerHTML = `
    <nav id="navbar" class="fixed top-0 inset-x-0 z-50">
      <div class="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
        <a href="index.html" class="nav-ink flex items-center gap-2.5 text-[var(--text-inv)] transition-colors" aria-label="Parastoo — home">
          <span class="text-[var(--gold)]">${mark("w-6 h-6 breathe")}</span>
          <span class="font-display text-[1.55rem] tracking-wide">Parastoo</span>
        </a>
        <div class="hidden md:flex items-center gap-1">
          ${navLinks("nav-ink px-3 py-2 text-[.78rem] tracking-[.18em] uppercase text-[var(--text-inv)] transition-colors")}
        </div>
        <div class="flex items-center gap-3">
          <div class="lang-pill nav-ink flex gap-0.5 items-center border border-[rgba(247,241,232,.35)] rounded-full p-0.5 text-[var(--text-inv)] transition-colors">${langBtns}</div>
          <a href="contact.html" data-i18n="cta.book"
             class="hidden sm:inline-flex btn btn-primary !px-5 !py-2.5 !min-h-0 text-[.7rem]"></a>
          <button id="navToggle" class="nav-ink md:hidden text-[var(--text-inv)] p-2 transition-colors" aria-label="Menu" aria-expanded="false">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
              <path d="M2 6h18M2 11h18M2 16h18"/></svg>
          </button>
        </div>
      </div>
      <div id="mobileMenu" class="md:hidden hidden bg-[var(--cream)] border-t border-[var(--border)] px-6 pb-5 pt-1 flex-col">
        ${navLinks("text-sm tracking-[.16em] uppercase")}
        <a href="contact.html" data-i18n="cta.book" class="btn btn-primary mt-4 self-start !py-3"></a>
      </div>
    </nav>`;

  /* ---------- footer ---------- */
  document.getElementById("site-footer").innerHTML = `
    <footer class="on-dark relative overflow-hidden">
      <div class="max-w-6xl mx-auto px-5 pt-16 pb-10 grid sm:grid-cols-3 gap-10 relative">
        <div>
          <div class="flex items-center gap-2.5 text-[var(--gold)]">${mark("w-7 h-7")}
            <span class="font-display text-3xl text-[var(--text-inv)]">Parastoo</span></div>
          <p class="text-sm mt-3 max-w-xs text-[var(--muted-inv)]" data-i18n="footer.blurb"></p>
        </div>
        <nav aria-label="Footer">
          <h3 class="kicker kicker--gold !text-[.66rem]" data-i18n="footer.explore"></h3>
          <div class="mt-4 flex flex-col gap-2.5 text-sm">
            ${links.map(([k, href]) => `<a href="${href}" data-i18n="nav.${k}" class="link-line self-start text-[var(--muted-inv)] hover:text-[var(--gold-bright)] transition-colors"></a>`).join("")}
          </div>
        </nav>
        <div>
          <h3 class="kicker kicker--gold !text-[.66rem]" data-i18n="footer.connect"></h3>
          <p class="mt-4 text-sm text-[var(--muted-inv)]" data-i18n="footer.location"></p>
          <a href="contact.html" data-i18n="cta.book" class="btn btn-ghost btn-ghost--inv mt-5 !px-6 !py-2.5 !min-h-0 text-[.68rem]"></a>
        </div>
      </div>
      <div class="chakana pb-2 opacity-60">${mark("w-4 h-4")}</div>
      <div class="text-center text-xs pb-7 text-[var(--muted-inv)] opacity-70">
        <span data-i18n="footer.rights"></span> · Parastoo © <span id="year"></span>
      </div>
    </footer>`;
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- ribbon: duplicate track for a seamless loop ---------- */
  document.querySelectorAll(".ribbon__track").forEach(t => {
    t.setAttribute("aria-hidden", "true");
    t.innerHTML += t.innerHTML;
  });

  /* ---------- language switcher ---------- */
  document.querySelectorAll(".lang-btn").forEach(b =>
    b.addEventListener("click", () => window.ParastooI18N.applyLang(b.dataset.lang)));

  /* ---------- mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("mobileMenu");
  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("flex");
    menu.classList.toggle("hidden", !open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  /* ---------- navbar scrolled state ---------- */
  const nav = document.getElementById("navbar");
  const onScroll = () => nav.classList.toggle("nav-scrolled", window.scrollY > 24);
  onScroll();
  addEventListener("scroll", onScroll, { passive: true });

  /* ---------- scroll-reveal ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
  document.querySelectorAll(".reveal, .reveal-left, .reveal-right, .reveal-scale")
    .forEach(el => io.observe(el));

  /* ---------- five-pillar hero (home) ---------- */
  const rotator = document.getElementById("pillarRotator");
  if (rotator) {
    const words = [...rotator.querySelectorAll(".hr-word")];
    const slides = [...document.querySelectorAll(".hero__slide")];
    const chips = [...document.querySelectorAll("#pillarChips .chip")];
    const counter = document.getElementById("pillarCounter");
    const HOLD = 4200;
    let current = 0, timer = null;

    const show = (n) => {
      if (n === current) return;
      words[current].classList.remove("is-in");
      words[current].classList.add("is-out");
      const prev = current;
      setTimeout(() => words[prev].classList.remove("is-out"), 750);
      words[n].classList.add("is-in");
      slides[current].classList.remove("is-active");
      slides[n].classList.add("is-active");
      chips[current].classList.remove("is-active");
      chips[n].classList.add("is-active");
      counter.textContent = String(n + 1).padStart(2, "0");
      current = n;
    };
    const cycle = () => show((current + 1) % words.length);
    const restart = () => { if (timer) clearInterval(timer); if (!reduceMotion) timer = setInterval(cycle, HOLD); };

    chips.forEach((c) => c.addEventListener("click", () => { show(+c.dataset.pillar); restart(); }));
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) { if (timer) clearInterval(timer), timer = null; }
      else restart();
    });
    restart();

    /* drifting motes */
    const field = document.getElementById("moteField");
    if (field && !reduceMotion) {
      for (let i = 0; i < 16; i++) {
        const m = document.createElement("span");
        const size = 2 + Math.random() * 4;
        m.className = "mote";
        m.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;` +
          `--mt:${(12 + Math.random() * 14).toFixed(1)}s;--md:${(-Math.random() * 20).toFixed(1)}s;` +
          `--mo:${(0.25 + Math.random() * 0.45).toFixed(2)};--mxs:${((Math.random() - 0.5) * 120).toFixed(0)}px;`;
        field.appendChild(m);
      }
    }

    /* pointer-reactive depth */
    const hero = document.getElementById("pillarHero");
    const depth = hero.querySelector(".hero__depth");
    if (depth && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
      hero.addEventListener("pointermove", (e) => {
        const r = hero.getBoundingClientRect();
        depth.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
        depth.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
      });
      hero.addEventListener("pointerleave", () => {
        depth.style.setProperty("--mx", 0); depth.style.setProperty("--my", 0);
      });
    }
  }

  /* ---------- parallax fallback (no CSS scroll-timeline) ---------- */
  if (!reduceMotion && !CSS.supports("animation-timeline: scroll()")) {
    const bands = [...document.querySelectorAll(".parallax__img")];
    const hero = document.querySelector(".hero__bg") || document.querySelector(".hero__drift");
    let raf = null;
    const tick = () => {
      raf = null;
      bands.forEach(img => {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        img.style.transform = `translateY(${(-p * 13).toFixed(2)}%)`;
      });
      if (hero) {
        const y = Math.min(scrollY / innerHeight, 1);
        hero.style.transform = `translateY(${(y * 9).toFixed(2)}%) scale(${(1.06 + y * .06).toFixed(3)})`;
      }
    };
    const onMove = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    addEventListener("scroll", onMove, { passive: true });
    addEventListener("resize", onMove, { passive: true });
  }

  window.ParastooI18N.initLang();
})();
