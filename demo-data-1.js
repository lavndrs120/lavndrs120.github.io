/* بيانات المعاينة التجريبية — للزائر فقط، نموذجية بالكامل ولا تمثل بزنساً حقيقياً */
(function () {
  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function ymd(off) { var d = new Date(); d.setDate(d.getDate() + off); return iso(d); }
  var BIZ = [['مطعم الأصالة', 'مطعم5521'], ['بقالة النور', 'بقالة1187'], ['صيدلية الشفاء', 'صيدلي8821'], ['كافيه المدينة', 'كافيه2290'], ['أزياء الخليج', 'ملابس3341'], ['مخبز الفجر', 'مخبز7743'], ['عطور الواحة', 'عطور4410'], ['سوبرماركت الرحمة', 'سوبر9082'], ['مغسلة النقاء', 'مغسلة1603'], ['حلويات السعادة', 'حلوي3376'], ['مكتبة المعرفة', 'مكتبة2218'], ['ورشة الأمان', 'ورشة5094'], ['صالون الأناقة', 'صالون6107'], ['أجهزة التقنية', 'أجهزة7721'], ['مزرعة الخير', 'مزرعة8830'], ['مطعم السلطان', 'مطعم4402'], ['عيادة الابتسامة', 'عيادة1957'], ['متجر الهدايا', 'هدايا6613'], ['مطبعة الإتقان', 'مطبعة3085'], ['محل الأحذية', 'أحذية2741'], ['ألعاب الأطفال', 'ألعاب9916'], ['قهوة الصباح', 'قهوة5560'], ['عصائر الفواكه', 'عصائر4128'], ['مفروشات الراحة', 'مفروش1874']];
  var PRODUCTS = ['وجبة غداء', 'قهوة مختصة', 'خبز طازج', 'عصير طبيعي', 'عبوة عطر', 'حلى مشكّل', 'دواء مزمن', 'قميص رجالي', 'خدمة غسيل', 'كتاب مدرسي', 'صيانة سيارة', 'قصّة شعر', 'كشف أسنان', 'هدية مغلّفة', 'طباعة بنرات', 'حذاء رياضي', 'لعبة تعليمية', 'خضار ورقية', 'مفرش سرير', 'ملحقات هاتف'];
  var LOCS = ['الخرطوم', 'أم درمان', 'بحري', 'مدني', 'بورتسودان', 'الأبيض', 'كسلا', 'القضارف', 'نيالا', 'الدمازين', 'عطبرة', 'كوستي'];
  function series(n, base, noise) {
    var out = [], t = 0;
    for (var i = n - 1; i >= 0; i--) { var d = new Date(); d.setDate(d.getDate() - i - 1); var wk = [0.9, 1.0, 1.05, 1.1, 1.2, 0.8, 0.85][d.getDay()]; var v = Math.max(0, Math.round(base * wk * (1 + (n - i) / (n * 3)) * (1 + (rnd() - 0.5) * noise))); out.push({ date: iso(d), v: v }); t += v; }
    return { s: out, t: t };
  }
  function fpts(last, k) { var o = []; for (var i = 0; i < 7; i++) { var v = Math.round(last * (1.02 + 0.01 * i) * (0.97 + rnd() * 0.06)); o.push({ date: ymd(i), v: v, lo: Math.round(v * 0.82), hi: Math.round(v * 1.18) }); } return o; }
  function rows(names, scale, withTicker) {
    return names.map(function (n, i) {
      var nm = withTicker ? n[0] : n, tk = withTicker ? n[1] : '';
      var tot = Math.round(scale * (1 - i * 0.034) * (0.85 + rnd() * 0.3)) + 3, sp = []; for (var j = 0; j < 14; j++) sp.push(Math.round(tot / 14 * (0.6 + rnd() * 0.8)));
      var y = sp[12], t = sp[13], ft = Math.round(t * (0.95 + rnd() * 0.25)), chg = Math.round((rnd() - 0.35) * 400) / 10;
      return { name: nm, ticker: tk, total: tot, share: 0, chg: chg, prev: Math.round(tot / (1 + chg / 100)), spark: sp, yday: y, today: t, avg7: Math.round(tot / 14), fToday: Math.round(t * 1.1), fTom: ft, fTomLo: Math.round(ft * 0.8), fTomHi: Math.round(ft * 1.2), f7: ft * 7, conf: i < 8 ? 'high' : (i < 16 ? 'mid' : 'low') };
    });
  }
  function shares(r) { var t = r.reduce(function (a, x) { return a + x.total; }, 0) || 1; r.forEach(function (x) { x.share = Math.round(x.total / t * 1000) / 10; }); return r; }
  var NAMES = { monthly: 'آخر 30 يوماً', semiannual: 'آخر 6 أشهر', annual: 'آخر 12 شهراً' }, DAYS = { monthly: 30, semiannual: 180, annual: 365 };
  var D = {};
  D.oracle = function (p) {
    p = DAYS[p] ? p : 'monthly'; seed = 11 + DAYS[p];
    var sr = series(DAYS[p], 520, 0.25), last = sr.s[sr.s.length - 1].v, fp = fpts(last);
    var prev = Math.round(sr.t / 1.083);
    return {
      period: p, periodNameAr: NAMES[p], days: DAYS[p], nav: 1342.6, navChangePercent: 1.8, detailReady: true, aiEnabled: true, generatedAt: new Date().toISOString(),
      overall: { total: sr.t, prev: prev, chg: 8.3, yday: last, today: Math.round(last * 0.62), avg7: Math.round(sr.s.slice(-7).reduce(function (a, x) { return a + x.v; }, 0) / 7), fTom: fp[1], f7: fp.reduce(function (a, x) { return a + x.v; }, 0), conf: 'high', direction: 'صاعد', growthPercent: 8.3, series: sr.s, fPts: fp },
      businesses: shares(rows(BIZ, 5200, true)), products: shares(rows(PRODUCTS, 4200, false)), locations: shares(rows(LOCS, 8000, false)),
      counts: { businesses: BIZ.length, products: PRODUCTS.length, locations: LOCS.length }
    };
  };
  D.summary = 'الطلبات في ارتفاع واضح مقارنةً بالفترة السابقة (**+8.3%**)، والتوقع للغد أعلى قليلاً من أمس.\nأقوى حضور: **مطعم الأصالة** و**بقالة النور**، وأسرع نمواً: **عطور الواحة**.\nتراجع طفيف في **المخبوزات** نهاية الأسبوع، ويُتوقع أن يعود الأسبوع القادم.\n(ملخص نموذجي للمعاينة)';
  D.chat = function (q) {
    q = String(q || '');
    if (/غد|توقع/.test(q)) return 'توقعي لغدٍ نحو **' + Math.round(600 + rnd() * 80) + ' طلباً** بنطاق ثقة 80% بين 500 و720، والاتجاه صاعد.\n(إجابة نموذجية — للمشتركين تُحسب من بياناتهم الحقيقية)';
    if (/يتراجع|تراجع|هبوط/.test(q)) return 'أبرز المتراجعين: **خبز طازج** (−6.4%) و**حذاء رياضي** (−3.1%) عن الفترة السابقة.\n(إجابة نموذجية)';
    if (/نمو|أسرع|اسرع/.test(q)) return 'الأسرع نمواً: **عطور الواحة** (+21.5%) ثم **عيادة الابتسامة** (+14.2%).\n(إجابة نموذجية)';
    return 'هذه معاينة: في النسخة الفعلية أجيب عن أي سؤال من بيانات التقرير نفسها (بزنسات، منتجات، مواقع، توقع). جرّب أحد الأسئلة المقترحة أعلاه.';
  };
  D.magma = function () {
    var cats = ['مطاعم', 'بقالات', 'صيدليات', 'مقاهي', 'أزياء', 'مخابز', 'عطور', 'خدمات'];
    var b = BIZ.concat(BIZ).concat(BIZ).concat(BIZ).concat(BIZ).slice(0, 60).map(function (x, i) { return { sheetId: 'demo-' + i, rank: i + 1, name: x[0] + (i >= 24 ? ' ' + (Math.floor(i / 24) + 1) : ''), category: cats[i % cats.length], weight: Math.max(0.15, 9 - i * 0.15), viewed: i < 14, link: 'demo' }; });
    return { businesses: b, totalBusinesses: 120, viewedCount: 14 };
  };
  D.reseller = function () {
    return { slots: [{ idx: 1, name: 'مطعم الأصالة', status: 'sold' }, { idx: 2, name: 'بقالة النور', status: 'sold' }, { idx: 3, name: 'صالون الأناقة', status: 'negotiating' }], sold: 2, appsCount: 8, appValue: 169.35, totalValue: 1354.8, endDate: ymd(300), requests: [{ idx: 3, reqStatus: 'pending', name: 'صالون الأناقة' }], saleFee: 22.58, bank: {} };
  };
  D.franchise = function () {
    var names = ['مطعم السلطان', 'عيادة الابتسامة', 'مطبعة الإتقان', 'قهوة الصباح', 'ألعاب الأطفال', 'مفروشات الراحة'], sl = [];
    for (var i = 0; i < names.length; i++) sl.push({ idx: i + 1, name: names[i], status: i < 3 ? 'live' : 'onboarding' });
    return { totalSeats: 120, seatsPaid: 12, slots: sl, paidUsd: 360, totalUsd: 2709, remainingUsd: 2349, nextAmountUsd: 22.58, perSeat: 22.58, status: 'active', pendingStage: '', platformFull: false, platformCount: 74, platformTotal: 120, requests: [] };
  };
  D.portal = function () {
    return { linked: true, businesses: [{ sheetId: 'demo-biz', name: 'مطعم الأصالة (نموذج)', ticker: 'مطعم5521', verified: 2, orders: 412, weight: 3.84, closed: false, autoAccept: false,
      standing: { rank: 7, of: 120, points: 384, delta: 2, isNew: false, stages: [1], stage: 1, cohortSize: 40 },
      stageValuations: [{ stage: 1, points: 384, inCohort: true, allocation: 311.2, expectedReturn: 380.4, valuation: 0, fundValue: 0 }],
      requests: { agreement: { status: 'received' }, cash: [{ status: 'pending', requestedAt: ymd(-3), due36: 634.1, approvedAmount: '' }], m: { due36: 634.1, orders: 412 } },
      entitlements: [{ entitlement: 311.2, status: 'available', date: ymd(-10), orders: 360 }, { entitlement: 128.5, status: 'completed', date: ymd(-40), orders: 210 }] }] };
  };
  D.donation = function () {
    return { linked: true, businesses: [{ sheetId: 'demo-biz', name: 'مطعم الأصالة (نموذج)', agreementReceived: true, weight: 3.84, computedValue: 311.2, certs: [{ row: 'demo', value: 128.5, date: ymd(-40), weight: 2.9, locked: false, consumed: false, reserved: 0, free: 128.5 }], myRequest: null, incoming: [], asDonee: [], asDonor: [], busyAsDonee: false }],
      openRequests: [{ reqId: 'demo-r1', sheetId: 'demo-x', name: 'محل الأحذية', createdAt: ymd(-2), weight: 1.12, value: 96.4, orders: 120 }] };
  };
  D.BLOCK = 'هذه معاينة تجريبية — الاشتراك يفتح التنفيذ الفعلي على بياناتك.';
  window.DemoData = D;
})();
