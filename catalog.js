/* كتالوج الأسعار: الأرقام مصدرها الخلفية (public_catalog) والواجهة تعرضها فقط.
   القيم المكتوبة في الصفحة = احتياطي إن تعذّر الاتصال. الدفع يُحسب في الخلفية من اسم الباقة وحده. */
(function () {
  var W = 'https://lavndr.omssolutionorders.workers.dev/?action=public_catalog', K = 'lavndr_catalog_v1';
  function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function load() { try { return JSON.parse(localStorage.getItem(K)); } catch (e) { return null; } }
  function swap(s, oldP, newP) { // يستبدل $السعر أو السعر$ فقط، حتى لا يمسّ أرقاماً أخرى في النص
    if (typeof s !== 'string' || oldP === newP) return s;
    return s.split('$' + oldP).join('$' + newP).split(oldP + '$').join(newP + '$');
  }
  var C = window.LavCatalog = {
    data: load(),
    apply: function (offers) {
      var c = C.data; if (!c || !c.prices) return false;
      Object.keys(offers).forEach(function (k) {
        var o = offers[k]; if (!o.variants) return;
        if (o._o === undefined) o._o = { body: o.body, bodyEn: o.bodyEn };
        o.variants.forEach(function (v) {
          if (v._o === undefined) v._o = { price: v.price, label: v.label, body: v.body, bodyEn: v.bodyEn };
          var p = c.prices[v.tier]; if (!(p > 0)) return;
          var np = fmt(p); v.price = np;
          if (v.tier === 'franchise' && c.reservation > 0) v.label = 'ابدأ بحجز $' + fmt(c.reservation);
          ['body', 'bodyEn'].forEach(function (f) { if (v._o[f] !== undefined) v[f] = swap(v._o[f], v._o.price, np); });
          if (o.variants.length === 1 && o._o.body !== undefined) o.body = swap(o._o.body, v._o.price, np);
          if (o.variants.length === 1 && o._o.bodyEn !== undefined) o.bodyEn = swap(o._o.bodyEn, v._o.price, np);
        });
      });
      return true;
    },
    refresh: function (done) {
      fetch(W).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.prices) return;
        var changed = JSON.stringify(d.prices) + d.reservation !== (C.data ? JSON.stringify(C.data.prices) + C.data.reservation : '');
        C.data = d; try { localStorage.setItem(K, JSON.stringify(d)); } catch (e) {}
        if (done) done(changed);
      }).catch(function () {});
    }
  };
})();
