/* Munay — shared chrome (nav + footer), language switcher, motion wiring. */
(function () {
  const page = document.body.dataset.page || "home";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* chakana-inspired mark, used in nav + footer */
  const mark = (cls) => `
    <svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">
      <path d="M12 2.8 14.4 7l4.6.4-3 3.6 3 3.6-4.6.4L12 19.2 9.6 15l-4.6-.4 3-3.6-3-3.6L9.6 7 12 2.8Z"/>
      <circle cx="12" cy="11" r="2.2"/>
    </svg>`;

  const links = [["home", "index.html"], ["about", "about.html"],
                 ["treatments", "treatments.html"], ["contact", "contact.html"]];

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
        <a href="index.html" class="nav-ink flex items-center gap-2.5 text-[var(--text-inv)] transition-colors" aria-label="Munay — home">
          <span class="text-[var(--gold)]">${mark("w-6 h-6 breathe")}</span>
          <span class="font-display text-[1.55rem] tracking-wide">Munay</span>
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
            <span class="font-display text-3xl text-[var(--text-inv)]">Munay</span></div>
          <p class="text-sm mt-3 max-w-xs text-[var(--muted-inv)]" data-i18n="footer.blurb"></p>
        </div>
        <nav aria-label="Footer">
          <h3 class="kicker kicker--gold !text-[.66rem]" data-i18n="footer.explore"></h3>
          <div class="mt-4 flex flex-col gap-2.5 text-sm">
            ${links.map(([k, href]) => `<a href="${href}" data-i18n="nav.${k}" class="link-line self-start text-[var(--muted-inv)] hover:text-[var(--gold-bright)] transition-colors"></a>`).join("")}
          </div>
        </nav>
        <div>
          <h3 class="kicker kicker--gold !text-[.66rem]" data-i18n="footer.visit"></h3>
          <p class="mt-4 text-sm text-[var(--muted-inv)]" data-i18n="footer.location"></p>
          <a href="contact.html" data-i18n="cta.book" class="btn btn-ghost btn-ghost--inv mt-5 !px-6 !py-2.5 !min-h-0 text-[.68rem]"></a>
        </div>
      </div>
      <div class="chakana pb-2 opacity-60">${mark("w-4 h-4")}</div>
      <div class="text-center text-xs pb-7 text-[var(--muted-inv)] opacity-70">
        <span data-i18n="footer.rights"></span> · Munay © <span id="year"></span>
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
    b.addEventListener("click", () => window.MunayI18N.applyLang(b.dataset.lang)));

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

  /* ---------- parallax fallback (no CSS scroll-timeline) ---------- */
  if (!reduceMotion && !CSS.supports("animation-timeline: scroll()")) {
    const bands = [...document.querySelectorAll(".parallax__img")];
    const hero = document.querySelector(".hero__bg");
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

  window.MunayI18N.initLang();
})();
