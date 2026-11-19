/* مؤشر سوق مستقل: نسخة من مؤشر LAVNDR120 بنفس طريقة حسابه، تعمل داخل حساب Google الخاص بصاحبها.
   لا يرتبط بمؤشر لاڤندرز الرئيسي ولا يرسل إليه أي بيانات.
   الحساب مطابق للمؤشر الرئيسي:
   - كل صف في تبويب Orders لكل بزنس (فيه اسم المنتج) يُحسب طلباً واحداً. والصف من نوع REDEEM يُنقص طلباً. ولا ينزل عدّ أي منتج عن صفر.
   - قيمة المؤشر NAV = صافي الطلبات × قيمة الطلب (4.275).
   - تُسجَّل لقطة كل ساعة في تبويب Snapshots (مثل History).
   - التغيّر = الفرق عن قيمة اللقطة السابقة. الأعلى والأدنى من لقطات اليوم. التذبذب = انحراف عوائد آخر 30 لقطة × √252 × 100.
   لا يعرض المخرج العام أسماء البزنسات ولا أي بيانات عملاء. */
var M = __MARKET_JSON__;
var BUDGET_MS = 25000;

function doGet(e) {
  var p = (e && e.parameter) || {}, res;
  try { res = route_(p); } catch (err) { res = { error: String(err && err.message || err) }; }
  var out = JSON.stringify(res);
  if (p.callback && /^[A-Za-z0-9_.$]{1,60}$/.test(p.callback)) {
    return ContentService.createTextOutput(p.callback + '(' + out + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

function route_(p) {
  var a = p.action || 'index';
  if (a === 'ping') return { status: 'ok', market: M.id };
  if (a === 'setup') return setup_();
  if (a === 'health') return state_(true);
  if (a === 'config') return { name: M.name, bizImage: img_() };
  return state_(false);
}

function ss_() { return SpreadsheetApp.openById(M.sheetId); }

// صورة المؤشر (أيقونة التطبيق + خلفية البطاقة): رابط مصغّر عام من Drive يحفظه المالك في Config!B1
function img_() {
  try {
    var u = String(ss_().getSheetByName('Config').getRange('B1').getValue() || '').trim();
    return /^https:\/\/drive\.google\.com\/thumbnail\?id=[A-Za-z0-9_-]{10,80}&sz=w\d{3,4}$/.test(u) ? u : '';
  } catch (e) { return ''; }
}

function list_() {
  var sh = ss_().getSheetByName('Businesses'), n = sh.getLastRow(), out = [], seen = {};
  if (n < 2) return out;
  sh.getRange(2, 1, Math.min(n - 1, 400), 2).getValues().forEach(function (r) {
    var id = String(r[1] || '').trim();
    if (id && !seen[id] && out.length < (M.max || 120)) { seen[id] = 1; out.push(id); }
  });
  return out;
}

function readBiz_(id) {
  var s = SpreadsheetApp.openById(id).getSheetByName('Orders');
  if (!s) return { net: 0 };
  var n = s.getLastRow(); if (n < 2) return { net: 0 };
  var v = s.getRange(2, 1, n - 1, 9).getValues(), cnt = {};
  v.forEach(function (r) {
    var item = r[1]; if (!item) return;
    var type = r[6] || 'BUY';
    if (type === 'REDEEM') cnt[item] = Math.max(0, (cnt[item] || 0) - 1);
    else cnt[item] = (cnt[item] || 0) + 1;
  });
  var net = 0; Object.keys(cnt).forEach(function (k) { net += cnt[k]; });
  return { net: net };
}

// يحدّث أقدم الشيتات أولاً ضمن ميزانية زمنية، فيتقارب المؤشر مهما كان عدد البزنسات
function refresh_(budget) {
  var t0 = Date.now(), ss = ss_(), ts = ss.getSheetByName('Totals'), ids = list_();
  var n = ts.getLastRow(), map = {};
  if (n > 1) ts.getRange(2, 1, n - 1, 5).getValues().forEach(function (r) { map[String(r[0])] = { sum: Number(r[1]) || 0, count: Number(r[2]) || 0, at: Number(r[3]) || 0, ok: String(r[4]) === 'yes' }; });
  var order = ids.slice().sort(function (a, b) { return ((map[a] || {}).at || 0) - ((map[b] || {}).at || 0); });
  for (var i = 0; i < order.length; i++) {
    if (Date.now() - t0 > budget) break;
    var id = order[i], r = null;
    try { r = readBiz_(id); } catch (e) { r = null; }
    var prev = map[id] || { sum: 0, count: 0 };
    map[id] = r ? { sum: r.net, count: r.net, at: Date.now(), ok: true } : { sum: prev.sum, count: prev.count, at: Date.now(), ok: false };
  }
  var rows = ids.map(function (id) { var m = map[id] || { sum: 0, count: 0, at: 0, ok: false }; return [id, m.sum, m.count, m.at, m.ok ? 'yes' : 'no']; });
  if (n > 1) ts.getRange(2, 1, n - 1, 5).clearContent();
  if (rows.length) ts.getRange(2, 1, rows.length, 5).setValues(rows);
  return rows;
}

function nav_(rows) {
  var net = 0; rows.forEach(function (r) { net += Number(r[1]) || 0; });
  return { net: net, nav: net * (M.orderValue || 4.275) };
}

function snap_(nav) {
  var ss = ss_(), sn = ss.getSheetByName('Snapshots'), now = new Date(), tz = ss.getSpreadsheetTimeZone() || Session.getScriptTimeZone() || 'Africa/Khartoum';
  var n = sn.getLastRow();
  if (n < 2) { sn.appendRow([now, 0]); n = sn.getLastRow(); }
  var last = sn.getRange(n, 1, 1, 2).getValues()[0];
  if (now.getTime() - new Date(last[0]).getTime() >= 55 * 60000) { sn.appendRow([now, nav]); n = sn.getLastRow(); }
  if (n > 5000) { sn.deleteRows(2, 1000); n = sn.getLastRow(); }
  var cnt = Math.min(30, Math.max(1, n - 1));
  var rows = sn.getRange(Math.max(2, n - 29), 1, cnt, 2).getValues();
  var values = rows.map(function (r) { return Number(r[1]) || 0; }), rets = [], i;
  for (i = 1; i < values.length; i++) if (values[i - 1] > 0) rets.push((values[i] - values[i - 1]) / values[i - 1]);
  var avg = rets.length ? rets.reduce(function (a, b) { return a + b; }, 0) / rets.length : 0;
  var variance = rets.length ? rets.reduce(function (a, b) { return a + Math.pow(b - avg, 2); }, 0) / rets.length : 0;
  var vol = Math.sqrt(variance * 252) * 100;
  var day = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  var today = rows.filter(function (r) { return Utilities.formatDate(new Date(r[0]), tz, 'yyyy-MM-dd') === day; }).map(function (r) { return Number(r[1]) || 0; });
  var hi = today.length ? Math.max.apply(null, today) : nav, lo = today.length ? Math.min.apply(null, today) : nav;
  var prev = rows.length > 1 ? Number(rows[rows.length - 2][1]) || 0 : nav;
  var ch = nav - prev, pct = prev > 0 ? ch / prev * 100 : 0;
  return { NAV: nav.toFixed(2), change: ch.toFixed(2), changePercent: pct.toFixed(2), dayHigh: hi.toFixed(2), dayLow: lo.toFixed(2), volatility: vol.toFixed(2) };
}

function state_(healthOnly) {
  var lock = LockService.getScriptLock(), got = false;
  try { got = lock.tryLock(8000); } catch (e) {}
  var cache = CacheService.getScriptCache(), key = healthOnly ? 'h' : 'i', hit = cache.get(key);
  if (hit && !healthOnly) return JSON.parse(hit);
  var rows;
  try { rows = refresh_(got ? BUDGET_MS : 0); } finally { if (got) lock.releaseLock(); }
  var ok = rows.filter(function (r) { return r[4] === 'yes'; }).length, orders = 0;
  rows.forEach(function (r) { orders += Number(r[2]) || 0; });
  var calc = nav_(rows), nav = calc.nav, res;
  if (healthOnly) return { status: 'ok', market: M.id, businesses: rows.length, readable: ok, orders: orders };
  res = { market: M.name, image: img_(), index: snap_(nav), businesses: rows.length, orders: orders, timestamp: new Date().toISOString() };
  cache.put('i', JSON.stringify(res), 240);
  return res;
}

function marketTick() { try { state_(false); } catch (e) {} }

function setup_() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'marketTick') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('marketTick').timeBased().everyMinutes(10).create();
  return { status: 'ok', trigger: 'every 10 minutes' };
}
