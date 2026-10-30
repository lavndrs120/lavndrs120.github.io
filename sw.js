/* LAVNDR120 service worker — تصفح بلا إنترنت من نسخة محفوظة. تغيير VERSION يمسح النسخ القديمة. */
const VERSION = 'lv-2';
const STATIC = VERSION + '-static', DATA = VERSION + '-data';
const SHELL = ['./', 'index.html', 'dashboard.html', 'business.html', 'admin.html', 'lavndr-app.js', 'agreement-form.js', 'demo-data.js', 'bg-m.jpg', 'bg-d.jpg'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(STATIC).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function networkFirst(req, cacheName, timeoutMs, okCheck) {
  return new Promise(resolve => {
    let done = false;
    const fromCache = () => caches.open(cacheName).then(c => c.match(req, { ignoreSearch: false })).then(r => r || caches.match(req, { ignoreSearch: true }));
    const timer = setTimeout(() => { if (done) return; fromCache().then(r => { if (r && !done) { done = true; resolve(r); } }); }, timeoutMs);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res && res.ok) {
        const copy = res.clone();
        const store = () => caches.open(cacheName).then(c => c.put(req, copy)).catch(() => {});
        if (okCheck) copy.clone().text().then(t => { if (okCheck(t)) store(); }).catch(() => {}); else store();
      }
      if (!done) { done = true; resolve(res); }
    }).catch(() => {
      clearTimeout(timer);
      fromCache().then(r => { if (!done) { done = true; resolve(r || new Response('', { status: 504 })); } });
    });
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.endsWith('app-version.json') || url.pathname.endsWith('.apk')) return; // دائماً من الشبكة
  if (url.origin === location.origin) {
    e.respondWith(networkFirst(req, STATIC, 4000));
    return;
  }
  if (/workers\.dev$/.test(url.hostname)) {
    // استجابات الـAPI (قراءة فقط): نخزّن الناجحة، وتُعرض آخر نسخة عند انقطاع الاتصال
    e.respondWith(networkFirst(req, DATA, 6000, t => !/"error"\s*:/.test(t.slice(0, 300))));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(STATIC).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { c.put(req, r.clone()); return r; }))));
  }
});
