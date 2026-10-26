/* التبرع بالشهادة الذهبية بين البزنسات — نافذة في بوابة البزنس (business.html)
   المنصة تسجّل وتحجز وتكشف التواصل فقط؛ التعامل المالي بين البزنسين خارج المنصة بالأرقام المعلنة (بالدولار). */
(function () {
  var D = window.Donation = {};
  var board = null;
  var DISC = 'المنصة غير مسؤولة عن هذا التعامل؛ فهو يتم بين البزنسين خارج المنصة بالأرقام والقيم المقرّرة والمعلنة بالدولار الأمريكي كعملة أساس، ودور المنصة يقتصر على التسجيل والحجز وكشف بيانات التواصل.';
  function E(s) { return typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(id) { return document.getElementById(id); }
  function money(v) { return '$' + (Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function dt(v) { if (!v) return ''; var d = new Date(v); return isNaN(d) ? String(v) : d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }); }
  function dueFrom(days) { return new Date(Date.now() + (Number(days) || 0) * 86400000); }
  function dFull(v) { return v.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
  function months(days) { var m = Math.round((Number(days) || 0) / 30); return m >= 1 ? ' (≈ ' + m + ' شهر)' : ''; }
  function commitText(o) {
    var cond = o.growthPct > 0 ? 'وبلوغ نمو ' + o.growthPct + '% في طلباتي' : 'دون شرط نمو';
    return 'أتعهّد بتنفيذ شرط المتبرع — إرجاع ' + money(o.value) + ' ' + cond + ' — خلال فترة تبدأ من لحظة قبولي الآن، وبحدٍّ أقصى ' + o.returnDays + ' يوماً' + months(o.returnDays) + '، أي في موعد أقصاه يوم ' + dFull(dueFrom(o.returnDays)) + '.';
  }
  var ST = { pending: ['⏳ بانتظار قرار المستفيد', 'badge-available'], accepted: ['🤝 صفقة جارية', 'badge-guarantee'], completed: ['✓ اكتملت', 'badge-completed'], declined: ['اعتذر المستفيد', 'badge-available'], withdrawn: ['سُحب', 'badge-available'], cancelled: ['أُلغي', 'badge-available'] };
  var btn = 'padding:9px 14px;border-radius:10px;border:1px solid var(--gold);background:rgba(201,168,76,.12);color:var(--gold);cursor:pointer;font-weight:700;font-size:12px;';
  var btn2 = 'padding:9px 14px;border-radius:10px;border:1px solid var(--glass-border);background:none;color:var(--text-dim);cursor:pointer;font-size:12px;';

  function post(body) { return bizPost(body); }
  function modal(html) {
    close();
    var o = document.createElement('div'); o.id = 'donModal';
    o.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.72);display:flex;align-items:flex-end;justify-content:center;';
    o.innerHTML = '<div style="width:100%;max-width:560px;max-height:92vh;overflow:auto;background:#0d0d16;border:1px solid var(--glass-border);border-radius:20px 20px 0 0;padding:22px 18px 28px;">' + html + '</div>';
    o.addEventListener('click', function (e) { if (e.target === o) close(); });
    document.body.appendChild(o);
  }
  function close() { var m = $('donModal'); if (m) m.remove(); }
  D.close = close;

  D.load = async function () {
    var host = $('donationHost');
    if (!host) { host = document.createElement('div'); host.id = 'donationHost'; $('content').appendChild(host); }
    try {
      var res = await fetch(WORKER_URL + '?action=donation_board&token=' + encodeURIComponent(AUTH_TOKEN));
      board = await res.json();
    } catch (e) { return; }
    if (!board || !board.linked) { host.innerHTML = ''; return; }
    host.innerHTML = board.businesses.map(renderBiz).join('');
    announceNewCerts();
  };

  function renderCert(b, c) {
    var tag = c.locked ? (c.lockStatus === 'accepted' ? '🔒 في صفقة' : '⏳ معروضة') : '✅ حرّة';
    return '<div class="ent-row"><div class="ent-top"><span class="ent-amount">' + money(c.value) + '</span><span class="badge-status badge-completed">' + tag + '</span></div>' +
      '<div class="ent-meta">شهادة ذهبية مُصدَرة · ' + dt(c.date) + ' · وزنها ' + (Number(c.weight) || 0).toFixed(2) + '%</div></div>';
  }
  function offerLine(o) {
    return money(o.value) + ' · إرجاع خلال ' + o.returnDays + ' يوماً · ' + (o.growthPct > 0 ? 'بشرط نمو ' + o.growthPct + '%' : 'بلا شرط نمو');
  }
  function dealCard(o, role) {
    var other = role === 'donee' ? o.donor : o.donee;
    var s = ST[o.status] || [o.status, ''];
    var prog = (o.status === 'accepted' || o.status === 'completed') && o.growthPct > 0
      ? '<div class="ent-meta">نمو المستفيد منذ القبول: <b style="color:' + (o.growthReached ? '#6EE7B7' : 'var(--amber)') + ';">' + o.growthNow + '%</b> من الشرط ' + o.growthPct + '% ' + (o.growthReached ? '✓ تحقق' : '') + '</div>' : '';
    return '<div class="ent-row"><div class="ent-top"><span class="ent-amount">' + E(offerLine(o)) + '</span><span class="badge-status ' + s[1] + '">' + s[0] + '</span></div>' +
      (other ? '<div class="ent-meta" style="color:var(--text);">' + (role === 'donee' ? 'الدونر: ' : 'المستفيد: ') + '<b>' + E(other.name) + '</b> · <span style="direction:ltr;display:inline-block;">' + E(other.email) + '</span></div>' : '') +
      '<div class="ent-meta">قُبلت ' + dt(o.acceptedAt) + ' · تعهّد المستفيد بالتنفيذ في موعد أقصاه ' + dt(o.dueAt) + (o.overdue ? ' <b style="color:var(--red);">· تجاوز الموعد</b>' : '') + '</div>' +
      '<div class="ent-meta">قيمة الدونر المحجوزة ' + money(o.value) + ' (وزنه ' + (o.donorWeight || 0).toFixed(2) + '%) · مستحق المستفيد المحسوب ' + money(o.doneeValue) + ' (وزنه ' + (o.doneeWeight || 0).toFixed(2) + '%)</div>' + prog +
      (role === 'donor' && o.status === 'accepted' ? '<button style="' + btn + 'margin-top:8px;" onclick="Donation.complete(\'' + o.offerId + '\')">✓ استلمت قيمتي — إنهاء الصفقة</button>' : '') + '</div>';
  }
  function renderBiz(b) {
    var sid = E(b.sheetId), free = b.certs.filter(function (c) { return !c.locked; });
    var h = '<div class="glass card"><div class="biz-name">🎁 التبرع بالشهادة الذهبية</div><div class="biz-ticker">' + E(b.name) + '</div>';
    h += '<div class="ent-meta" style="line-height:1.9;margin-top:8px;">يمكن لصاحب شهادة مُصدَرة أن يتبرع بقيمتها لبزنس من الـ120 يعلن حاجته، بفترة إرجاع يحددها وبشرط نمو اختياري. ' + E(DISC) + '</div>';
    // 1) شهاداتي
    h += '<div class="section-title">شهاداتي المُصدَرة</div>';
    h += b.certs.length ? b.certs.map(function (c) { return renderCert(b, c); }).join('') : '<div class="empty" style="padding:10px 0;">لا توجد شهادة مُصدَرة بعد — تصدر بعد تأكيد الإدارة استلام الضمان.</div>';
    // 2) الدونر: طلبات معروضة
    if (free.length) {
      h += '<div class="section-title">طلبات التبرع المعروضة (مرتبة بالوزن الآن)</div>';
      h += board.openRequests.length ? board.openRequests.map(function (r) {
        return '<div class="ent-row"><div class="ent-top"><span class="ent-amount">' + E(r.name) + '</span><span style="font-size:11px;color:var(--gold);">وزن ' + r.weight.toFixed(2) + '%</span></div>' +
          '<div class="ent-meta">مستحقه المحسوب ' + money(r.value) + ' · ' + r.orders + ' طلب · منذ ' + dt(r.createdAt) + '</div>' +
          '<button style="' + btn + 'margin-top:8px;" onclick="Donation.offerForm(\'' + sid + '\',\'' + E(r.reqId) + '\')">🎁 دونر — أتبرع</button></div>';
      }).join('') : '<div class="empty" style="padding:10px 0;">لا توجد طلبات مفتوحة الآن.</div>';
    }
    // 3) عروضي كدونر
    var out = b.asDonor.filter(function (o) { return o.status === 'pending' || o.status === 'accepted' || o.status === 'completed'; });
    if (out.length) {
      h += '<div class="section-title">عروضي وتبرعاتي</div>';
      h += out.map(function (o) {
        if (o.status === 'pending') return '<div class="ent-row"><div class="ent-top"><span class="ent-amount">' + E(offerLine(o)) + '</span><span class="badge-status badge-available">' + ST.pending[0] + '</span></div><div class="ent-meta">إلى: ' + E(o.doneeName) + ' · لم يُكشف اسمك له</div><button style="' + btn2 + 'margin-top:8px;" onclick="Donation.withdraw(\'' + o.offerId + '\')">سحب العرض</button></div>';
        return dealCard(o, 'donor');
      }).join('');
    }
    // 4) المستفيد
    h += '<div class="section-title">أطلب تبرعاً</div>';
    if (b.busyAsDonee) {
      h += '<div class="ent-meta" style="margin-bottom:6px;">لديك صفقة تبرع جارية — تظهر أدناه. لا تُفتح طلبات جديدة حتى تكتمل.</div>';
    } else if (b.myRequest) {
      h += '<div class="ent-row"><div class="ent-top"><span class="ent-amount">طلبك معروض لأصحاب الشهادات</span><span class="badge-status badge-guarantee">مفتوح</span></div><div class="ent-meta">منذ ' + dt(b.myRequest.createdAt) + ' · وزنك الآن ' + (b.weight || 0).toFixed(2) + '% · مستحقك المحسوب ' + money(b.computedValue) + '</div>' +
        '<button style="' + btn2 + 'margin-top:8px;" onclick="Donation.cancelReq(\'' + E(b.myRequest.reqId) + '\')">إغلاق طلبي</button></div>';
      h += '<div class="ent-meta" style="margin:8px 0;">العروض الواردة (اسم الدونر مخفي حتى تقبل):</div>';
      h += b.incoming.length ? b.incoming.map(function (o) {
        return '<div class="ent-row"><div class="ent-top"><span class="ent-amount">' + E(offerLine(o)) + '</span></div><div class="ent-meta">بزنس (بدون كشف) تبرّع لك · ' + dt(o.createdAt) + (o.growthPct > 0 ? '' : ' · بلا شرط — قبول ومتابعة مباشرة') + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:8px;"><button style="' + btn + '" onclick="Donation.accept(\'' + o.offerId + '\')">قبول ومتابعة</button><button style="' + btn2 + '" onclick="Donation.decline(\'' + o.offerId + '\')">اعتذار</button></div></div>';
      }).join('') : '<div class="empty" style="padding:8px 0;">لا توجد عروض بعد.</div>';
    } else if (!b.agreementReceived) {
      h += '<div class="ent-meta">يلزم استلام اتفاقيتك الموقعة قبل فتح طلب تبرع.</div>';
    } else {
      h += '<div class="ent-meta" style="margin-bottom:8px;">تعلن رغبتك فيظهر طلبك لأصحاب الشهادات مرتباً بوزنك. إن لم يتبرع لك أحد أو لم تطلب، تحتفظ بمستحقك الفردي كما هو.</div>' +
        '<button style="' + btn + '" onclick="Donation.requestFor(\'' + sid + '\')">📣 أعلن رغبتي في استقبال تبرع</button>';
    }
    // 5) صفقاتي كمستفيد
    if (b.asDonee.length) { h += '<div class="section-title">تبرعات استقبلتها</div>' + b.asDonee.map(function (o) { return dealCard(o, 'donee'); }).join(''); }
    return h + '</div>';
  }

  function announceNewCerts() {
    try {
      for (var i = 0; i < board.businesses.length; i++) {
        var b = board.businesses[i];
        for (var j = 0; j < b.certs.length; j++) {
          var c = b.certs[j], key = 'lavndr_don_seen_' + b.sheetId + '_' + c.row;
          if (!c.locked && !localStorage.getItem(key)) {
            localStorage.setItem(key, '1');
            modal('<div style="text-align:center;font-size:40px;">🏅</div><div style="text-align:center;font-size:17px;font-weight:800;color:var(--gold);margin:8px 0;">شهادتك الذهبية صدرت</div>' +
              '<div style="text-align:center;font-size:20px;font-weight:900;margin-bottom:10px;">' + money(c.value) + '</div>' +
              '<div style="font-size:13px;line-height:1.9;color:var(--text);">لك الآن حق التبرع بها لبزنس آخر من الـ120 بحسب ما تراه وبحسب طلب معروض من البزنس المعني. تحدد فترة إرجاع القيمة، ولك أن تشترط الإرجاع ببلوغ نسبة نمو. ' + E(DISC) + '</div>' +
              '<div style="display:flex;gap:8px;margin-top:16px;"><button style="' + btn + 'flex:1;" onclick="Donation.close();document.getElementById(\'donationHost\').scrollIntoView({behavior:\'smooth\'})">فتح نافذة التبرع</button><button style="' + btn2 + '" onclick="Donation.close()">لاحقاً</button></div>');
            return;
          }
        }
      }
    } catch (e) {}
  }

  async function act(body, okMsg) {
    var d = await post(body);
    if (d && d.error) { showToast(d.error); return false; }
    if (okMsg) showToast(okMsg);
    await D.load(); return d;
  }
  D.requestFor = function (sid) { if (confirm('إعلان طلب تبرع يظهر لأصحاب الشهادات باسم بزنسك ووزنك. متابعة؟')) act({ action: 'donation_request_create', sheetId: sid }, 'تم نشر طلبك'); };
  D.cancelReq = function (id) { if (confirm('إغلاق الطلب؟ ستُعاد العروض الواردة.')) act({ action: 'donation_request_cancel', reqId: id }, 'أُغلق الطلب'); };
  D.withdraw = function (id) { if (confirm('سحب العرض؟')) act({ action: 'donation_offer_withdraw', offerId: id }, 'سُحب العرض'); };
  D.decline = function (id) { if (confirm('الاعتذار عن هذا العرض؟')) act({ action: 'donation_offer_respond', offerId: id, decision: 'decline' }, 'تم الاعتذار'); };
  D.complete = function (id) { if (confirm('تأكيد أنك استلمت قيمتك كاملة؟ سيُفكّ الحجز عنك وعن المستفيد.')) act({ action: 'donation_deal_complete', offerId: id }, 'اكتملت الصفقة'); };
  D.accept = function (id) {
    var o = null; board.businesses.forEach(function (b) { b.incoming.forEach(function (x) { if (x.offerId === id) o = x; }); });
    if (!o) return;
    modal('<div style="font-size:16px;font-weight:800;color:var(--gold);margin-bottom:10px;">قبول التبرع ومتابعته</div>' +
      '<div style="font-size:13px;line-height:2;">' + E(offerLine(o)) + '</div>' +
      '<div style="font-size:13px;line-height:2;margin:10px 0;padding:12px;border:1px solid var(--gold);border-radius:12px;background:rgba(201,168,76,.08);"><b style="color:var(--gold);">تعهّدك عند القبول</b><br>' + E(commitText(o)) + '</div>' +
      '<div style="font-size:12px;line-height:1.9;color:var(--text-dim);margin:10px 0;">عند القبول: تُحجز قيمة الدونر ووزنه، ووزنك ومستحقك المحسوب بتاريخ اليوم، ويُكشف لكما بيانات التواصل لإكمال الإجراء بينكما. ' + E(DISC) + '</div>' +
      '<label style="display:flex;gap:8px;font-size:12px;align-items:flex-start;"><input type="checkbox" id="donAck" style="margin-top:3px;"> قرأت ما سبق وأتعهّد بتنفيذ شرط المتبرع في الموعد المذكور</label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;"><button style="' + btn + 'flex:1;" id="donAccBtn">قبول ومتابعة</button><button style="' + btn2 + '" onclick="Donation.close()">إلغاء</button></div>');
    $('donAccBtn').onclick = async function () {
      if (!$('donAck').checked) { showToast('أكّد الموافقة أولاً'); return; }
      $('donAccBtn').disabled = true;
      var d = await post({ action: 'donation_offer_respond', offerId: id, decision: 'accept' });
      if (d && d.error) { showToast(d.error); $('donAccBtn').disabled = false; return; }
      modal('<div style="text-align:center;font-size:36px;">🤝</div><div style="text-align:center;font-size:16px;font-weight:800;color:var(--gold);margin:8px 0;">تمّ القبول</div>' +
        '<div style="font-size:12px;line-height:1.9;margin-bottom:8px;color:var(--gold);">موعدك الأقصى لتنفيذ الشرط: ' + E(dFull(dueFrom(o.returnDays))) + '</div>' +
        '<div style="font-size:13px;line-height:2;">تواصل مع الدونر لإكمال الإجراء:<br><b>' + E(d.contact.name) + '</b><br><span style="direction:ltr;display:inline-block;">' + E(d.contact.email) + '</span></div>' +
        '<button style="' + btn + 'width:100%;margin-top:14px;" onclick="Donation.close()">حسناً</button>'); D.load();
    };
  };
  D.offerForm = function (sid, reqId) {
    var b = board.businesses.filter(function (x) { return x.sheetId === sid; })[0], req = board.openRequests.filter(function (r) { return r.reqId === reqId; })[0];
    if (!b || !req) return;
    var free = b.certs.filter(function (c) { return !c.locked; });
    modal('<div style="font-size:16px;font-weight:800;color:var(--gold);margin-bottom:4px;">التبرع إلى ' + E(req.name) + '</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:12px;">وزنه الآن ' + req.weight.toFixed(2) + '% · مستحقه المحسوب ' + money(req.value) + ' · اسمك لا يظهر له إلا بعد قبوله</div>' +
      '<div style="font-size:12px;margin-bottom:4px;">الشهادة</div><select id="donCert" style="width:100%;padding:10px;border-radius:10px;background:#15151f;color:#fff;border:1px solid var(--glass-border);">' +
      free.map(function (c) { return '<option value="' + c.row + '">' + money(c.value) + ' — وزن ' + (Number(c.weight) || 0).toFixed(2) + '%</option>'; }).join('') + '</select>' +
      '<div style="font-size:12px;margin:12px 0 4px;">فترة إرجاع القيمة (بالأيام)</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">' + [30, 90, 180, 365].map(function (n) { return '<button type="button" style="' + btn2 + '" onclick="document.getElementById(\'donDays\').value=' + n + '">' + n + '</button>'; }).join('') + '</div>' +
      '<input id="donDays" type="number" min="7" max="1825" value="90" style="width:100%;padding:10px;border-radius:10px;background:#15151f;color:#fff;border:1px solid var(--glass-border);">' +
      '<label style="display:flex;gap:8px;font-size:12px;margin:14px 0 6px;align-items:center;"><input type="checkbox" id="donGrowthOn"> أشترط الإرجاع ببلوغ نسبة نمو</label>' +
      '<input id="donGrowth" type="number" min="1" max="1000" placeholder="نسبة النمو % (نمو طلبات المستفيد منذ القبول)" disabled style="width:100%;padding:10px;border-radius:10px;background:#15151f;color:#fff;border:1px solid var(--glass-border);">' +
      '<div style="font-size:12px;line-height:1.9;margin:12px 0;color:var(--gold);">عند قبول المستفيد يتعهّد بتنفيذ شرطك خلال فترة تبدأ من لحظة قبوله وبحدٍّ أقصى المدة التي تحددها أعلاه، ويظهر له التاريخ النهائي صريحاً.</div>' +
      '<div style="font-size:11px;line-height:1.8;color:var(--text-dim);margin:12px 0;">' + E(DISC) + '</div>' +
      '<label style="display:flex;gap:8px;font-size:12px;align-items:flex-start;"><input type="checkbox" id="donAck2" style="margin-top:3px;"> قرأت ما سبق وأوافق عليه</label>' +
      '<div style="display:flex;gap:8px;margin-top:14px;"><button style="' + btn + 'flex:1;" id="donSendBtn">إرسال العرض</button><button style="' + btn2 + '" onclick="Donation.close()">إلغاء</button></div>');
    $('donGrowthOn').onchange = function () { $('donGrowth').disabled = !this.checked; };
    $('donSendBtn').onclick = async function () {
      if (!$('donAck2').checked) { showToast('أكّد الموافقة أولاً'); return; }
      var g = $('donGrowthOn').checked ? $('donGrowth').value : '';
      if ($('donGrowthOn').checked && !(parseFloat(g) > 0)) { showToast('أدخل نسبة النمو'); return; }
      $('donSendBtn').disabled = true;
      var d = await post({ action: 'donation_offer_create', sheetId: sid, reqId: reqId, certRow: $('donCert').value, returnDays: $('donDays').value, growthPct: g });
      if (d && d.error) { showToast(d.error); $('donSendBtn').disabled = false; return; }
      close(); showToast('أُرسل عرضك للمستفيد'); D.load();
    };
  };
})();
