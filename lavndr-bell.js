/* 🔔 جرس الإشعارات الداخلي للمشترك: رسائل مباشرة بين المشترك المسجّل والأدمن.
   يعمل في أي صفحة داخلية بإضافة <script src="lavndr-bell.js" defer></script>. لا يظهر لغير المسجّلين. */
(function () {
  if (window.__lvnBell) return; window.__lvnBell = 1;
  var W = 'https://lavndr.omssolutionorders.workers.dev', timer = null, open = false;
  function tok() { try { return sessionStorage.getItem('lavndr_token') || sessionStorage.getItem('appb_token') || ''; } catch (e) { return ''; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var css = document.createElement('style');
  css.textContent = '#lvnBell{display:none;position:fixed;top:12px;left:12px;z-index:9000;width:44px;height:44px;border-radius:50%;border:1px solid #C9A84C;background:rgba(10,10,18,.88);color:#fff;font-size:20px;cursor:pointer;align-items:center;justify-content:center}#lvnBell.show{display:flex}#lvnBell.on{animation:lvnPulse 1.3s ease-in-out infinite}@keyframes lvnPulse{0%{box-shadow:0 0 0 0 rgba(244,63,94,.65)}70%{box-shadow:0 0 0 12px rgba(244,63,94,0)}100%{box-shadow:0 0 0 0 rgba(244,63,94,0)}}#lvnBellN{position:absolute;top:-6px;right:-6px;min-width:20px;height:20px;padding:0 5px;border-radius:100px;background:#F43F5E;color:#fff;font:800 11px/20px system-ui;text-align:center;display:none}#lvnPanel{display:none;position:fixed;top:64px;left:12px;z-index:9000;width:min(350px,calc(100vw - 24px));max-height:75vh;overflow:auto;border-radius:16px;border:1px solid rgba(255,255,255,.12);background:rgba(12,12,20,.97);color:#fff;font:13px system-ui;direction:rtl}#lvnPanel.open{display:block}#lvnPanel .h{padding:12px 14px;color:rgba(255,255,255,.5);font-size:12px;border-bottom:1px solid rgba(255,255,255,.08)}#lvnPanel .i{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.06);line-height:1.8}#lvnPanel .i.u{background:rgba(201,168,76,.1)}#lvnPanel .i b{color:#C9A84C}#lvnPanel .t{font-size:10.5px;color:rgba(255,255,255,.4)}#lvnPanel .e{padding:22px;text-align:center;color:rgba(255,255,255,.45)}#lvnPanel textarea{width:calc(100% - 28px);margin:10px 14px 0;min-height:56px;border-radius:10px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);color:#fff;padding:8px;font:13px system-ui;resize:vertical}#lvnPanel button{margin:8px 14px 12px;padding:9px 14px;border-radius:10px;border:1px solid #C9A84C;background:transparent;color:#C9A84C;font-weight:700;cursor:pointer}';
  document.head.appendChild(css);
  var btn = document.createElement('button'); btn.id = 'lvnBell'; btn.type = 'button'; btn.setAttribute('aria-label', 'الإشعارات'); btn.innerHTML = '🔔<span id="lvnBellN"></span>';
  var panel = document.createElement('div'); panel.id = 'lvnPanel';
  function mount() { document.body.appendChild(btn); document.body.appendChild(panel); start(); }
  function call(action, post, body) {
    var t = tok(); if (!t) return Promise.resolve(null);
    var opt = { headers: { 'Content-Type': 'text/plain;charset=utf-8', Authorization: 'Bearer ' + t } };
    if (post) { opt.method = 'POST'; opt.body = JSON.stringify(Object.assign({}, body || {}, { action: action, token: t })); }
    return fetch(W + '?action=' + action, opt).then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  function draw(d) {
    var n = (d && d.unread) || 0, el = document.getElementById('lvnBellN');
    btn.classList.add('show'); btn.classList.toggle('on', n > 0);
    el.style.display = n ? 'block' : 'none'; el.textContent = n > 99 ? '99+' : n;
    var items = (d && d.items) || [], h = '<div class="h">إشعاراتك ورسائلك مع الإدارة</div>';
    if (!items.length) h += '<div class="e">لا توجد إشعارات</div>';
    items.forEach(function (x) {
      var who = x.from === 'user' ? 'أنت' : (x.from === 'admin' ? 'الإدارة' : 'لاڤندرز');
      h += '<div class="i' + (x.unread ? ' u' : '') + '"><b>' + esc(who) + '</b> · ' + esc(x.title || '') + '<div>' + esc(x.body) + '</div><div class="t">' + esc(String(x.at || '').slice(0, 16).replace('T', ' ')) + '</div></div>';
    });
    h += '<textarea id="lvnMsg" maxlength="500" placeholder="اكتب رسالة نصية فقط (بدون روابط أو صور)…"></textarea><button type="button" id="lvnSend">إرسال للإدارة</button><div id="lvnSt" class="t" style="padding:0 14px 10px"></div>';
    panel.innerHTML = h;
    document.getElementById('lvnSend').onclick = function () {
      var v = document.getElementById('lvnMsg').value.trim(); if (v.length < 2) return;
      if (/(https?:|www\.|\.[a-z]{2,}\/|\b[a-z0-9-]{2,}\.(com|net|org|io|me|app|co|sa|sd|ly|link|gl|dev|info|xyz|ae|eg)\b|[<>{}\[\]\\`|])/i.test(v)) { document.getElementById('lvnSt').textContent = 'الرسالة نص فقط — بدون روابط أو رموز'; return; }
      call('note_to_admin', true, { body: v }).then(function (r) { var s = document.getElementById('lvnSt'); if (s) s.textContent = r && r.status === 'sent' ? 'وصلت رسالتك للإدارة ✓' : ((r && r.error) || 'تعذّر الإرسال'); if (r && r.status === 'sent') refresh(true); });
    };
  }
  function refresh(keepOpen) { call('my_notes').then(function (d) { if (!d || d.error) { btn.classList.remove('show'); return; } draw(d); if (open && !keepOpen) call('notes_read', true); }); }
  function start() { refresh(); timer = setInterval(refresh, 60000); }
  btn.onclick = function () {
    open = !open; panel.classList.toggle('open', open);
    if (open) { refresh(true); call('notes_read', true).then(function () { btn.classList.remove('on'); var el = document.getElementById('lvnBellN'); if (el) el.style.display = 'none'; }); }
  };
  document.addEventListener('click', function (e) { if (open && !e.target.closest('#lvnBell') && !e.target.closest('#lvnPanel')) { open = false; panel.classList.remove('open'); } });
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
