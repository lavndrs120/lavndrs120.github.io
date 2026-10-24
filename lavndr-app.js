/* LAVNDR120 — طبقة مشتركة لكل الصفحات:
   1) العمل بلا إنترنت: تسجيل service worker + رسالة واضحة عند أي إجراء يحتاج اتصالاً + مزامنة عند عودة الاتصال.
   2) زر «حمّل التطبيق» (أخضر + أيقونة أندرويد) في الزاوية المقابلة لزر الدخول، ويتحوّل إلى «حمّل التحديث»
      وينبض عند صدور إصدار أحدث (من app-version.json). داخل التطبيق لا يظهر إلا عند وجود تحديث. */
(function () {
  'use strict';
  var UA = navigator.userAgent || '';
  var m = UA.match(/LavndrApp\/([^\/\s]+)\/(\d+)/);
  var IN_APP = !!m, APP_NAME = m ? m[1] : '', APP_CODE = m ? parseInt(m[2], 10) : 0;
  var IS_IOS = /iPhone|iPad|iPod/i.test(UA);
  var OFFLINE_MSG = 'لا يوجد اتصال بالإنترنت — تعذّر تنفيذ هذا الإجراء. جرّب مرة أخرى عند عودة الاتصال.';

  /* ───── 1) بلا إنترنت ───── */
  try {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  } catch (e) {}

  var realFetch = window.fetch ? window.fetch.bind(window) : null;
  function isApi(u) { return /workers\.dev|script\.google\.com/.test(String(u || '')); }
  function offlineResponse() {
    return new Response(JSON.stringify({ error: OFFLINE_MSG, offline: true, code: 0 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  if (realFetch) {
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if (isApi(url) && method !== 'GET' && navigator.onLine === false) { showBar(OFFLINE_MSG, 'warn', 4000); return Promise.resolve(offlineResponse()); }
      return realFetch(input, init).catch(function (err) {
        if (isApi(url) && method !== 'GET') { showBar(OFFLINE_MSG, 'warn', 4000); return offlineResponse(); }
        throw err;
      });
    };
  }

  var bar;
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));z-index:2147483000;max-width:92vw;padding:9px 16px;border-radius:100px;font:600 12.5px/1.5 system-ui,Tahoma,sans-serif;color:#fff;box-shadow:0 6px 24px rgba(0,0,0,.45);display:none;text-align:center;direction:rtl';
    (document.body || document.documentElement).appendChild(bar);
    return bar;
  }
  var barTimer;
  function showBar(text, kind, ms) {
    var b = ensureBar();
    b.textContent = text;
    b.style.background = kind === 'ok' ? 'rgba(16,185,129,.95)' : (kind === 'warn' ? 'rgba(180,83,9,.96)' : 'rgba(60,60,70,.96)');
    b.style.display = 'block';
    clearTimeout(barTimer);
    if (ms) barTimer = setTimeout(function () { b.style.display = 'none'; }, ms);
  }
  function goOffline() { showBar('📴 أنت غير متصل — تتصفح النسخة المحفوظة. الإجراءات تحتاج اتصالاً.', 'info', 0); }
  function goOnline() {
    showBar('✓ عاد الاتصال — جارٍ تحديث البيانات', 'ok', 2500);
    try { window.dispatchEvent(new Event('lavndr-online')); } catch (e) {}
    try { if (typeof window.loadData === 'function' && window.AUTH_TOKEN !== undefined) window.loadData(); } catch (e) {}
    checkVersion();
  }
  window.addEventListener('offline', goOffline);
  window.addEventListener('online', goOnline);
  document.addEventListener('DOMContentLoaded', function () { if (navigator.onLine === false) goOffline(); });

  /* ───── 2) زر التحميل / التحديث ───── */
  var row, btn, latest = null;
  var ANDROID_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M17.6 9.48l1.84-3.18a.38.38 0 0 0-.14-.52.38.38 0 0 0-.52.14l-1.87 3.24A11.4 11.4 0 0 0 12 8.2c-1.7 0-3.3.38-4.9 1l-1.88-3.24a.38.38 0 0 0-.52-.14.38.38 0 0 0-.14.52l1.84 3.18C3.3 11.28 1.3 14.3 1 17.8h22c-.3-3.5-2.3-6.52-5.4-8.32zM7 15.3a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm10 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/></svg>';

  function injectCss() {
    if (document.getElementById('lavndrAppCss')) return;
    var st = document.createElement('style'); st.id = 'lavndrAppCss';
    st.textContent = '@keyframes lvPulse{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.65);transform:scale(1)}50%{box-shadow:0 0 0 9px rgba(16,185,129,0);transform:scale(1.06)}}' +
      '#lavndrAppBtn{display:inline-flex;align-items:center;gap:6px;border:none;cursor:pointer;color:#fff;font:700 12px/1 system-ui,Tahoma,sans-serif;padding:8px 13px;border-radius:100px;background:linear-gradient(135deg,#10B981,#059669);box-shadow:0 2px 10px rgba(16,185,129,.35);white-space:nowrap}' +
      '#lavndrAppBtn.upd{animation:lvPulse 1.4s ease-in-out infinite;background:linear-gradient(135deg,#34D399,#10B981)}';
    document.head.appendChild(st);
  }
  function build() {
    if (row) return;
    injectCss();
    row = document.createElement('div'); row.id = 'lavndrAppRow';
    row.style.cssText = 'direction:ltr;display:none;margin:8px auto 0;padding:0 10px;box-sizing:border-box;position:relative;z-index:5';
    btn = document.createElement('button'); btn.id = 'lavndrAppBtn'; btn.type = 'button';
    btn.onclick = function () { if (latest && latest.apkUrl) { location.href = latest.apkUrl + (latest.apkUrl.indexOf('?') < 0 ? '?v=' + (latest.versionCode || '') : ''); } };
    row.appendChild(btn);
    document.body.insertBefore(row, document.body.firstChild);
  }
  function loginSide() {
    var sels = ['#accountActionBtn', '.login:not(.guest)', '#bellBtn', 'header button[onclick*="clearSession"]', '#loginOverlay'];
    for (var i = 0; i < sels.length; i++) {
      var el = document.querySelector(sels[i]);
      if (!el) continue;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      var c = (r.left + r.right) / 2, w = window.innerWidth;
      if (c < w * 0.4) return 'right';   // زر الدخول على اليسار ← زر التحميل يمين
      if (c > w * 0.6) return 'left';    // زر الدخول على اليمين ← زر التحميل يسار
      return 'left';
    }
    return 'left';
  }
  function place() {
    if (!row) return;
    var wrap = document.querySelector('.wrap');
    var mw = wrap ? getComputedStyle(wrap).maxWidth : 'none';
    row.style.maxWidth = (mw && mw !== 'none') ? mw : '560px';
    row.style.justifyContent = loginSide() === 'left' ? 'flex-start' : 'flex-end';
  }
  function render() {
    if (!latest || !latest.apkUrl || IS_IOS) { if (row) row.style.display = 'none'; return; }
    var newer = APP_CODE > 0 ? (parseInt(latest.versionCode, 10) > APP_CODE) : true;
    if (IN_APP && !newer) { if (row) row.style.display = 'none'; return; }
    build();
    if (IN_APP) { btn.innerHTML = ANDROID_SVG + '<span>حمّل التحديث v' + (latest.versionName || '') + '</span>'; btn.className = 'upd'; btn.title = latest.notes || ''; }
    else { btn.innerHTML = ANDROID_SVG + '<span>حمّل التطبيق الآن</span>'; btn.className = ''; btn.title = latest.versionName ? ('الإصدار ' + latest.versionName) : ''; }
    btn.id = 'lavndrAppBtn';
    row.style.display = 'flex';
    place();
  }
  function checkVersion() {
    if (!realFetch || navigator.onLine === false) return;
    realFetch('app-version.json?_=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) { latest = j; render(); } }).catch(function () {});
  }
  function start() { checkVersion(); setInterval(place, 2500); window.addEventListener('resize', place); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
