/* TEMPORARY palette sampler — not for production. Delete this file, the
   css/palette-preview.css themes, and the <script> tags once a palette is
   chosen. Adds a floating switcher that flips the whole site between the
   current palette and two candidates. Pin a palette per-tab with ?palette=a
   or ?palette=b. */
(function () {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'css/palette-preview.css';
  document.head.appendChild(link);

  var bar = document.createElement('div');
  bar.id = 'palette-sampler';
  var options = [
    { key: '', label: 'Original' },
    { key: 'a', label: 'A · Sea Stone' },
    { key: 'b', label: 'B · Violet Hour' }
  ];
  function apply(key) {
    if (key) { document.documentElement.setAttribute('data-palette', key); }
    else { document.documentElement.removeAttribute('data-palette'); }
    try { localStorage.setItem('palette-preview', key); } catch (e) {}
    var btns = bar.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('is-on', btns[i].dataset.key === key);
    }
  }
  options.forEach(function (opt) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = opt.label;
    b.dataset.key = opt.key;
    b.addEventListener('click', function () { apply(opt.key); });
    bar.appendChild(b);
  });
  document.body.appendChild(bar);

  var saved = '';
  try { saved = localStorage.getItem('palette-preview') || ''; } catch (e) {}
  var param = new URLSearchParams(location.search).get('palette');
  apply(param !== null ? param : saved);
})();
