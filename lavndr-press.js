/* ✨ تفاعل الأزرار: ضغط مرئي فوري + حالة «جارٍ التنفيذ» حتى ينتهي الطلب المرتبط بالزر */
(function () {
  if (window.__lvnPress) return; window.__lvnPress = 1;
  var st = document.createElement('style');
  st.textContent = 'button,.btn,[role=button]{-webkit-tap-highlight-color:transparent;transition:transform .12s ease,box-shadow .2s ease,opacity .2s ease}' +
    'button:active:not(:disabled),.btn:active,[role=button]:active{transform:scale(.95)}' +
    '.lvn-press{box-shadow:0 0 0 3px rgba(201,168,76,.45)!important}' +
    '.lvn-busy{opacity:.65!important;pointer-events:none!important;position:relative}' +
    '.lvn-busy::after{content:"";display:inline-block;width:13px;height:13px;margin-inline-start:8px;vertical-align:-2px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;animation:lvnSpin .7s linear infinite}' +
    '@keyframes lvnSpin{to{transform:rotate(360deg)}}';
  document.head.appendChild(st);
  var last = null, lastAt = 0;
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button,.btn,[role=button]');
    if (!b || b.disabled || b.id === 'lvnBell') return;
    b.classList.add('lvn-press'); setTimeout(function () { b.classList.remove('lvn-press'); }, 260);
    last = b; lastAt = Date.now();
  }, true);
  var of = window.fetch;
  if (typeof of !== 'function') return;
  window.fetch = function () {
    var btn = last && Date.now() - lastAt < 1500 && document.body.contains(last) ? last : null, p = of.apply(this, arguments);
    if (btn) {
      btn.__lvnN = (btn.__lvnN || 0) + 1; btn.classList.add('lvn-busy');
      var done = function () { setTimeout(function () { if (--btn.__lvnN <= 0) btn.classList.remove('lvn-busy'); }, 250); };
      p.then(done, done);
    }
    return p;
  };
})();
