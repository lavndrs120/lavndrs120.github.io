/* Lavenders (LAVNDR120) live index card widget. Read-only, no cookies, no tracking.
   Usage: <div data-lavenders-index data-lang="en"></div><script async src="https://lavndrs120.github.io/widget.js"></script>
   Informational only. Not investment advice. No promise of returns. No trading of shares on the platform. */
(function () {
  var API = 'https://lavndr.omssolutionorders.workers.dev/api/index';
  var SITE = 'https://lavndrs120.github.io/';
  var T = {
    en: { title: 'LAVNDR120 · Live consumer index', nav: 'Index value (USD)', chg: 'Change', asof: 'As of', open: 'Open the live card', note: 'Informational only. Not investment advice.', by: 'Powered by Lavenders', dir: 'ltr', path: 'en/consumer-index.html', na: 'The live card is temporarily unavailable.' },
    ar: { title: 'LAVNDR120 · المؤشر الاستهلاكي الحي', nav: 'قيمة المؤشر (دولار)', chg: 'التغيّر', asof: 'حتى', open: 'افتح البطاقة الحية', note: 'معلومات تعريفية فقط وليست نصيحة استثمارية.', by: 'بدعم من لاڤندرز', dir: 'rtl', path: 'consumer-index.html', na: 'البطاقة الحية غير متاحة مؤقتاً.' }
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(v, d) { var n = Number(v); return isFinite(n) ? n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : null; }
  function render(el) {
    if (el.getAttribute('data-lavenders-ready')) return;
    el.setAttribute('data-lavenders-ready', '1');
    var lang = el.getAttribute('data-lang') === 'ar' ? 'ar' : 'en', t = T[lang];
    var host = ''; try { host = location.hostname || ''; } catch (e) {}
    var link = SITE + t.path + '?utm_source=embed&utm_medium=widget&utm_campaign=' + encodeURIComponent(host || 'unknown');
    var root = el.attachShadow ? el.attachShadow({ mode: 'open' }) : el;
    var css = ':host{display:block;max-width:360px}.c{font-family:system-ui,-apple-system,Segoe UI,Tahoma,sans-serif;background:#0b0b14;color:#fff;border:1px solid rgba(201,168,76,.45);border-radius:14px;padding:14px 16px;line-height:1.6}.t{font-size:12px;color:#C9A84C;font-weight:700;letter-spacing:.3px}.v{font-size:30px;font-weight:800;margin:4px 0 0}.s{font-size:13px;color:rgba(255,255,255,.75)}.n{font-size:11px;color:rgba(255,255,255,.5);margin-top:8px}a{color:#C9A84C;text-decoration:none;font-size:12px}.f{display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px}';
    function draw(inner) { root.innerHTML = '<style>' + css + '</style><div class="c" dir="' + t.dir + '"><div class="t">' + esc(t.title) + '</div>' + inner + '<div class="n">' + esc(t.note) + '</div><div class="f"><a href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(t.open) + ' →</a><a href="' + SITE + '?utm_source=embed&utm_medium=widget&utm_campaign=' + encodeURIComponent(host || 'unknown') + '" target="_blank" rel="noopener">' + esc(t.by) + '</a></div></div>'; }
    draw('<div class="s">…</div>');
    fetch(API, { mode: 'cors' }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.available) { draw('<div class="s">' + esc(t.na) + '</div>'); return; }
      var v = num(d.netAssetValueUSD, 2), c = num(d.change, 2), p = num(d.changePercent, 2), up = Number(d.change) >= 0;
      var h = '<div class="v">' + esc(v === null ? '—' : v) + '</div><div class="s">' + esc(t.chg) + ': <span style="color:' + (up ? '#4ade80' : '#f87171') + '">' + esc(c === null ? '—' : c) + (p === null ? '' : ' (' + esc(p) + '%)') + '</span></div>';
      if (d.asOf) h += '<div class="s">' + esc(t.asof) + ': ' + esc(d.asOf) + '</div>';
      draw(h);
    }).catch(function () { draw('<div class="s">' + esc(t.na) + '</div>'); });
  }
  function init() { var n = document.querySelectorAll('[data-lavenders-index]'); for (var i = 0; i < n.length; i++) render(n[i]); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
