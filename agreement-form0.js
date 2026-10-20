/* LAVNDR120 — نموذج «لاڤندرز لإدارة البزنسات» داخل الصفحة
   يُستخدم من business.html (البزنس) و admin.html (الأدمن) بنفس التصميم.
   الاستخدام: AgreementForm.open({ sheetId, name })
   يعتمد على المتغيرات العامة: WORKER_URL و AUTH_TOKEN و showToast (اختياري)
   • لمس أي حقل يفتح لوحة الكتابة (حروف / أرقام حسب نوع الحقل)
   • لمس خانة التوقيع يفتح لوحة رسم بدل الكيبورد
   • الحفظ تلقائي على الخادم؛ وزر الطباعة يحفظ PDF */
(function () {
  var BUSINESS_KEYS = ['type','b_name','b_activity','b_owner','b_phone','b_id','c_name','c_number','c_id','a9_name','a9_owner','a9_id','inv_from','inv_to','inv_count','book_no','receipt_no','receipt_date','tax_decl_no','tax_year','paid_usd','paid_local','orders_count','m2_name','m3_note','signer_name','stamp_text','w1_name','w1_id','w2_name','w2_id','final_date'];
  var ADMIN_KEYS = ['m3_cheque_no','m3_bank','m3_value','m3_from','m3_date','admin_date','admin_name'];
  var BUSINESS_SIGS = ['sig_business','sig_creator','sig_witness1','sig_witness2','sig_m2'];
  var ADMIN_SIGS = ['sig_admin'];

  // {{key|تسمية|نوع}} حقل · {{sig:key|تسمية}} توقيع · {{opt:key:قيمة|تسمية}} اختيار
  var DOC = [
    ['t', 'لاڤندرز لإدارة البزنسات'],
    ['sub', 'اتفاقية انضمام بزنس وبراند لمؤشر سوق لاڤندرز 120 وتنفيذ تطبيق نظام الطلبات، متضمنة اللائحة التنظيمية رقم (1) لسنة 2026م — سياسة إثبات حقيقة الطلبات واستحقاق السيولة التشغيلية من صندوق بزنسات لاڤندرز'],
    ['h', 'الأطراف'],
    ['p', 'الطرف الأول: إدارة لاڤندرز 120 — مالك منظومة مؤشر لاڤندرز 120 والكود.'],
    ['p', '<b>الطرف الثاني: البزنس / البراند</b><br>الاسم التجاري: {{b_name|الاسم التجاري}}<br>النشاط: {{b_activity|النشاط}}<br>اسم المالك أو الوكيل: {{b_owner|اسم المالك أو الوكيل}}<br>رقم التواصل: {{b_phone|رقم التواصل|tel}}<br>رقم الهوية: {{b_id|رقم الهوية|num}}'],
    ['p', '<b>الطرف الثالث: الكريتر المنفذ</b><br>الاسم: {{c_name|اسم الكريتر}}<br>رقم الكريتر: {{c_number|رقم الكريتر|num}}<br>رقم الهوية: {{c_id|رقم هوية الكريتر|num}}'],
    ['h', 'تمهيد موحد'],
    ['p', 'حيث إن لاڤندرز تدير منظومة مؤشر سوق تضم 120 بزنس وبراند لكل سوق، وحيث إن كل بزنس وبراند يمتلك تطبيق إلكتروني لإدارة الطلبات ويرسل بيانات الطلبات التي تمت عبر التطبيق إلى مؤشر لاڤندرز 120، وحيث إن هدف صندوق بزنسات لاڤندرز تحفيزي لتوفير سيولة تشغيل دورية توجه للبزنسات وفقاً لمستحقها المحسوب بنظام التقييم بكود مؤشر السوق لاڤندرز 120، وحيث يرغب الطرف الثاني في الانضمام للمؤشر، فقد اتفقت الأطراف على ما يلي:'],
    ['h', 'الباب الأول: علاقة الكريتر بالبزنس والبراند'],
    ['h2', 'المادة (1)'],
    ['p', '1- يلتزم الطرف الثالث للطرف الثاني بتنفيذ تطبيق طلبات بمواصفات منظومة مؤشر لاڤندرز 120 باستخدام كود لاڤندرز ويتم تسليمه خلال يومين من تاريخ سداد رسم الدخول للمؤشر.<br>2- يلتزم بالمتابعة الفنية حتى اعتماد التطبيق من الطرف الأول.<br>3- لا يحق للطرف الثالث استلام أي مبالغ نقدية مباشرة من الطرف الثاني، التحصيل حصري عبر الطرف الأول.<br>4- اعتماد التطبيق وإدراجه في منظومة مؤشر السوق حق حصري للطرف الأول.'],
    ['h', 'الباب الثاني: الرسوم'],
    ['h2', 'المادة (2): اختر نوعاً واحداً فقط — السداد عبر الطرف الأول فقط'],
    ['p', '{{opt:type:products|بزنس منتجات: أتعاب تنفيذ $492 + رسم دخول المؤشر $22.58 = الإجمالي $514.58}}<br>{{opt:type:services|بزنس خدمات: أتعاب تنفيذ $429 + رسم دخول المؤشر $22.58 = الإجمالي $451.58}}'],
    ['h', 'الباب الثالث: التعريفات والهدف'],
    ['h2', 'المادة (3) - التعريفات'],
    ['p', 'أ- الصندوق: صندوق بزنسات لاڤندرز الرقمي، ويظل رقمي محسوب الحقوق ويعتبر جاهزة للاعتماد ولا تتم معاملات مالية ما لم يتم توثيق الطلبات وفقاً لبنود هذه اللائحة.<br>ب- البزنس: أي كيان من ضمن الـ 120 كيان في منظومة مؤشر السوق.<br>ج- المؤشر: نظام مؤشر سوق لاڤندرز 120 بنظام تقييم الأداء للبزنسات والبراندات بالنقاط.<br>د- الإدارة: إدارة لاڤندرز.<br>هـ- الطلب المحتسب: هو الطلب المكتمل السداد والمثبت بفاتورة ضريبية وتسليم فعلي للعميل، ولا يعتد بالملغي أو المرتجع.'],
    ['h2', 'المادة (4) - هدف الصندوق'],
    ['p', 'تحفيز الأداء بتقييم البزنس والبراند وتوفير سيولة تشغيل دورية توجه للبزنسات والبراندات وفقاً لمستحقها المحسوب بنظام التقييم في منظومة مؤشر سوق لاڤندرز 120، وتنتظم وتترتب البزنسات والبراندات وفقاً للأهلية في أداء البزنس أو البراند.'],
    ['h', 'الباب الرابع: مؤشر الأداء وقيمة الالتزام'],
    ['h2', 'المادة (5)'],
    ['p', 'أ- جملة الطلبات المستهدفة لكل بزنس وبراند هي 1000 طلب، وهذا العدد يمثل نقاطه الكاملة في منظومة مؤشر السوق.<br>ب- الأداء هو عدد الطلبات المستقبلة في المؤشر ويتم تحليلها وعليه صنع قيمة النقاط بتسييل نقدي بنسبة 36% من جملة الطلبات المحققة كتوثيق ومصادقة على حقيقة الطلبات.<br>ج- قيمة الطلب الواحد ضمن نسبة الـ 36% محددة بمبلغ 4.275 دولار أمريكي موحدة.<br>د- طريقة الحساب المعتمدة: بزنس وبراند أرسل للمؤشر عدد طلبات وتم تحليلها فواجب صنع القيمة بالتسييل النقدي = 36% من جملة عدد الطلبات × $4.275<br>هـ- يتم التسييل بما يعادل قيمة المبلغ بالعملة المحلية حسب سعر الصرف وقت التسييل.<br>و- لا يعتد بالتقييم إلا إذا تم توثيقه وفق الباب الخامس.'],
    ['h', 'الباب الخامس: شروط استحقاق السيولة'],
    ['h2', 'المادة (6)'],
    ['p', 'لا يستحق البزنس أو البراند أي نقطة تقييم من حصيلة أداء البزنس والبراند في منظومة مؤشر سوق لاڤندرز 120 إلا بعد استيفاء الأطواق الثلاثة مجتمعة:<br>أ- الطوق المالي: تسييل قيمة 36% من عدد الطلبات المحققة وفق المادة -5/د-.<br>ب- الطوق الضماني: يلتزم بتقديم شيك مصرفي معتمد كضمان حسن تنفيذ، محرر باسم مقرر من إدارة لاڤندرز بقيمة تعادل مبلغ السيولة التقييمية الموجهة منه. وتكون القيمة الثابتة مقومة بالدولار الأمريكي كأساس للحساب، ويحرر الشيك بالعملة المحلية بما يعادلها وقت التحرير، على أن تتم معالجة وتسوية قيمة الشيك عند التسييل وفقاً لسعر الصرف السائد وقت التسييل الفعلي، ويظل الدولار هو المرجع الثابت للقيمة.<br>ج- الطوق المستندي: تقديم ما يثبت أن 100% من الطلبات المحتسبة حقيقية.'],
    ['h', 'الباب السادس: المستندات الحاسمة لإثبات حقيقة الطلبات'],
    ['h2', 'المادة (7)'],
    ['p', 'يعتبر الإثبات مكتملاً فقط بملف موحد يحتوي على:<br>1- صورة من إيصال شراء دفتر الفواتير الرسمي من ديوان الضرائب أو ما يعادله من الخدمية من إيصالات توريد إلكتروني معتمد.<br>2- صورة من الإقرار الضريبي الأخير مختوم ومعتمد مدون به رقم الدفتر.<br>3- صور الفواتير الضريبية بعدد الطلبات الكلي (1000) فاتورة عند الإكتمال (صادرة من ذات الدفتر ومتسلسلة).<br>4- الإشعار البنكي لسداد مبلغ الـ36% + وإبراز كشف حساب بنكي مختوم يظهر تطابق المبلغ.<br>5- شيك الضمان المشار إليه في المادة (6/ب).'],
    ['h2', 'المادة (8)'],
    ['p', 'لا يعتد بأي طلب غير مقترن بفاتورة ضريبية من الدفتر المعتمد، ولا يدخل أي طلب غير موثق في حساب التقييم بمنظومة مؤشر سوق، ويعتبر كأن لم يكن.'],
    ['h', 'الباب السابع: محضر الربط والعواقب'],
    ['h2', 'المادة (9) - محضر الربط المستندي'],
    ['p', 'أقر أنا الموقع أدناه {{a9_name|الاسم|text}} صاحب {{a9_owner|صاحب (اسم البزنس)}} بطاقة هوية رقم {{a9_id|رقم الهوية|num}} بكامل أهليتي القانونية بأن الفواتير الضريبية من رقم {{inv_from|من رقم|num}} إلى رقم {{inv_to|إلى رقم|num}} وعددها {{inv_count|عدد الطلبات|num}} طلب، صادرة من دفتر الفواتير رقم {{book_no|رقم الدفتر|num}} المشترى بالإيصال رقم {{receipt_no|رقم الإيصال|num}} بتاريخ {{receipt_date|تاريخ الإيصال|date}} والمدرج في إقراري الضريبي رقم {{tax_decl_no|رقم الإقرار الضريبي|num}} لسنة {{tax_year|السنة|num}}، وأن المبلغ المسدد وقدره {{paid_usd|المبلغ بالدولار|num}} دولار / ما يعادله بالجنيه السوداني {{paid_local|المعادل بالجنيه|num}}، يمثل نسبة 36% منها بواقع {{orders_count|عدد الطلبات|num}} طلب × $4.275، هو توثيق لحقيقة كامل الطلبات وأنها مبيعات حقيقية مكتملة التسليم في منظومة مؤشر سوق لاڤندرز 120.'],
    ['h2', 'المادة (10) - الصلاحية والعواقب'],
    ['p', 'أ- صلاحية هذا الملف 12 شهر ميلادي من تاريخ التوقيع، ويجب تجديده عند كل دورة استحقاق جديدة للسيولة.<br>ب- يحق للإدارة مهلة 30 يوم عمل للتحقق المتقاطع من صحة المستندات عبر الاتصال بالموردين ومراجعة الدفاتر وإعتماد قيم نظام المؤشر.<br>ج- في حال ثبوت تزوير أو تلاعب أو احتيال، يحق للإدارة تسييل شيك الضمان فورا وفقاً للقيود بهذه اللائحة بعد إخطار البزنس أو البراند كتابياً، واتخاذ الإجراءات القانونية بموجب المادة (123) من القانون الجنائي السوداني لسنة 1991م.'],
    ['h2', 'المادة (11) - فض النزاعات'],
    ['p', 'في حال الاعتراض على قرار الإدارة، يحال النزاع إلى لجنة تحكيم مكونة من 3 أعضاء من البزنسات الـ 120 في منظومة مؤشر السوق يتم اختيارهم بالقرعة، على ألا يكون من بينهم طرف في النزاع، وقرارها ملزم.'],
    ['h', 'الباب الثامن: الملكية'],
    ['h2', 'المادة (12)'],
    ['p', 'كود التطبيق والمنظومة ملكية حصرية للطرف الأول، حق الطرف الثاني انتفاع تشغيلي فقط داخل منظومة لاڤندرز.<br>حماية من الحق الجبري: لا يترتب على هذه الاتفاقية أي شراكة أو تمثيل قانوني أو حق جبري للطرف الثاني أو الثالث على كود أو إدارة لاڤندرز، والعلاقة علاقة انتفاع تشغيلي محددة المدة فقط.'],
    ['h2', 'المادة (13): تنظيم عوائد داتا السوق وحقوق البزنس أو البراند'],
    ['p', '<b>1- المبدأ العام:</b> لا يستحق البزنس أي عائد نقدي مباشر من بيع الداتا. عوائد الداتا الناتجة عن اشتراكات (لافا $1.4 يومي / $249 سنوي، ڤندكس $1287 سنوي، ماقما $100 سنوي) مملوكة حصرياً لمؤسسي المؤشر وهم: إدارة لاڤندرز (مالك المؤشر)، والتايكون (ممول المؤشر)، والامتياز (منفذو التطبيقات 410/41/19 كريتر).<br><b>2- المقابل المستحق للبزنس لقاء مساهمته في توليد الداتا:</b><br>أ. حق المعلومة: يحق للبزنس المشترك الاطلاع المجاني الكامل على داتة الـ 119 بزنس الآخرين داخل ذات المؤشر، وذلك كحق أصيل من حقوق الدخول بعد إمتلاك التطبيق ($429 / $492).<br>ب. حق الصندوق التشغيلي: يحق للبزنس التقدم بطلب إصدار شهادة ذهبية من صندوق المؤشر، والتي تبلغ قيمتها التأسيسية $51,480 وينمو بمقدار $4.275 عن كل طلب (بنسبة تسييل 36% من جملة طلباته)، وتُمنح وفقاً لنقاط تقييم أدائه داخل المؤشر.<br>ج. حق الفرصة الاستثمارية: يحق للبزنسات المتفوقة تقييمياً الحصول على فرصة استثمارية اختيارية غير ملزمة، بنسبة 13.93% من إجمالي عوائد المؤسسين وهم إدارة لاڤندرز والتايكون والكريترز عوائدهم السنوية من داتة السوق، وتمنح هذه الفرصة وفقاً لضوابط البزنس الداخلية الخاصة وحدها، ولا دخل للمؤشر في تقييمها الداخلي، وتعتبر شراكة استثمارية مباشرة وليست توزيعاً لأرباح الداتا.'],
    ['h', 'الباب التاسع: الإقرارات والنماذج'],
    ['h2', 'المقر بما فيه'],
    ['p', 'الاسم: {{signer_name|اسم المقر}}<br>التوقيع: {{sig:sig_business|توقيع البزنس}}<br>الختم: {{stamp_text|الختم (اسم/نص الختم)}}'],
    ['p', '<b>الشاهد الأول</b> — الاسم: {{w1_name|اسم الشاهد الأول}} · رقم الهوية: {{w1_id|هوية الشاهد الأول|num}} · التوقيع: {{sig:sig_witness1|توقيع الشاهد الأول}}<br><b>الشاهد الثاني</b> — الاسم: {{w2_name|اسم الشاهد الثاني}} · رقم الهوية: {{w2_id|هوية الشاهد الثاني|num}} · التوقيع: {{sig:sig_witness2|توقيع الشاهد الثاني}}<br>التاريخ: {{final_date|التاريخ|date}}'],
    ['h2', 'النموذج (2) - إقرار التحقق المتقاطع'],
    ['p', 'أوافق أنا {{m2_name|الاسم}} لإدارة لاڤندرز بالاتصال بموردي ومراجعة دفاتري وسجلات تطبيقي في منظومة مؤشر سوق لاڤندرز 120.<br>التوقيع: {{sig:sig_m2|توقيع إقرار التحقق}}'],
    ['h2', 'النموذج (3) - إيصال استلام شيك الضمان (تعبئة الإدارة)'],
    ['p', 'تم استلام شيك رقم {{m3_cheque_no|رقم الشيك|num}} بنك {{m3_bank|اسم البنك}} بقيمة {{m3_value|القيمة|num}} من السيد {{m3_from|من السيد}} بتاريخ {{m3_date|التاريخ|date}}'],
    ['h2', 'الإقرار النهائي'],
    ['p', 'أقر أنا الطرف الثاني بموافقتي على جميع ما ورد أعلاه، واخترت نوع البزنس المحدد والتزمت بالرسوم والتوثيق في منظومة مؤشر سوق لاڤندرز 120.<br>وأقر أنا الطرف الثالث بتنفيذ التطبيق حسب المواصفات.<br>توقيع الكريتر: {{sig:sig_creator|توقيع الكريتر}}'],
    ['p', '<b>يعتمد — إدارة لاڤندرز — منظومة مؤشر سوق لاڤندرز 120</b><br>الاسم: {{admin_name|اسم المعتمد}}<br>التوقيع: {{sig:sig_admin|توقيع الإدارة}}<br>التاريخ: {{admin_date|تاريخ الاعتماد|date}}']
  ];

  // ── صفحة اعتماد التمويل (التايكون) ──
  var FUND_USER_KEYS = ['currency','pay_method','t_name','t_id','t_phone','t_country','t_date','pay_bank','pay_note'];
  var FUND_ADMIN_KEYS = ['admin_name','admin_date','admin_note'];
  var FUND_USER_SIGS = ['sig_tycoon'];
  var FUND_ADMIN_SIGS = ['sig_admin'];
  var ROADMAP = [
    ['h', 'خارطة مقترح الشراكة والاستثمار — لاڤندرز 120'],
    ['p', '<b>1. لماذا الآن؟</b> الخراب محى السجلات، والنظام اهتز؛ والرجعة تحتاج سوقاً يمكن رؤيته وتنظيمه لحظة بلحظة.<br><b>2. لماذا أنتم؟</b> موارد بشرية ومجتمعية جاهزة، تقابلها منظومة لاڤندرز التقنية والتشغيلية.<br><b>3. ماذا نبني؟</b> لاڤندرز 120: كل 120 بزنس وبراند = مؤشر سوق حي مباشر.<br><b>4. كيف يعمل؟</b> طلبات ← حركة سوق ← لاڤا ← داتا تكشف نبض السوق وسلوك المستهلك.<br><b>5. ماذا تنتج المنظومة؟</b> لاڤا: داتا السوق | ماغما: وصول المستهلك | ڤندكس/أوراكل: التحليل والتنبؤ.<br><b>6. ما الأثر؟</b> من التشتت إلى التنظيم، ومن السوق غير المرئي إلى سوق حي قابل للقياس.<br><b>7. ما حجم الهدف؟</b> 120 بزنس = مؤشر ← 20 مؤشر = مجال ← 400 مؤشر = قطاع ← 48,000 بزنس.<br><b>8. كيف ننفذ؟</b> 10 فرق × 41 قائد = 410 قائد لبناء المؤشرات وتشغيلها.<br><b>9. ما اقتصاد السوق؟</b> لاڤا + ماغما + ڤندكس/أوراكل = اقتصاد قائم على حركة السوق وداتا المستهلك.<br><b>10. ما دور التايكون؟</b> تمويل بناء المؤشرات، استرداد رأس المال، والمشاركة في عوائد السوق وفق النموذج.<br><b>11. ما المطلوب منكم؟</b> قيادة الحراك وبناء مؤشرات سوق القطاع/المجال، بالتعاون مع لاڤندرز.<br><b>المعادلة:</b> 120 بزنس ← مؤشر ← 20 مؤشراً ← مجال ← 400 مؤشر ← قطاع ← 48,000 بزنس. إنك تقود الحراك | لاڤندرز توفر المنظومة | القادة يبنون السوق | السوق يولد الداتا.']
  ];
  function fundDoc(tier) {
    var sec = tier === 'tycoon_sector';
    var nm = sec ? 'تايكون القطاع' : 'تايكون المجال';
    var inv = sec ? '1,029,600' : '51,480', mk = sec ? '400 سوق (48,000 بزنس/براند)' : '20 سوقاً (2,400 بزنس/براند)';
    var rest = sec ? '829,915' : '9,530', p40 = sec ? '331,966' : '3,812', p30 = sec ? '248,975' : '2,859';
    var a1 = sec ? '50' : '10', a2 = sec ? '100' : '20', gain = sec ? '20,592,000' : '1,029,600';
    var due = sec ? '331,966' : '45,762';
    var doc = [
      ['t', 'صفحة اعتماد التمويل — تايكون لاڤندرز 120'],
      ['sub', nm + ' — القيمة $' + inv]
    ];
    doc = doc.concat(ROADMAP);
    doc = doc.concat([
      ['p', 'أقرّ أنا الموقع أدناه باعتمادي لتمويل وتنفيذ فعالية لاڤندرز 120 بعد الاطلاع الكامل على البروبوزال والهيكل والميزانية والاتفاقية.'],
      ['h', 'صفة التايكون'],
      ['p', '<b>' + nm + '</b> — وكالة ' + mk + ' — القيمة $' + inv],
      ['h', 'الميزانية التشغيلية المعتمدة للفعالية'],
      ['p', sec ? 'عشرة فرق — 410 قائد: تشغيل $67,435 + تسويق $132,250 = <b>$199,685</b>' : 'فريق واحد — 41 قائد: تشغيل $28,725 + تسويق $13,225 = <b>$41,950</b>'],
      ['h', 'تنويه محاسبي وقانوني معتمد'],
      ['p', 'إجمالي الاستثمار معلوم، والصافي المتبقي ($' + rest + ') وميزانيات التشغيل والتسويق معلومة ومحددة سلفاً. كل مبلغ تم توجيهه لميزانية التشغيل والتسويق هو في الأصل مستحق بالكامل لإدارة لاڤندرز 120 كقيمة باقة التايكون المختارة، وتم توجيهه للتشغيل والتسويق ضماناً للانطلاقة، ويحق لإدارة لاڤندرز 120 استرداده لاحقاً من عوائد التشغيل. أما الصافي المتبقي فيسدد مباشرة من التايكون لصالح لاڤندرز 120 وفق آلية السداد أدناه.'],
      ['h', 'إقرار والتزام'],
      ['p', 'أقرّ أنا التايكون الممول باطلاعي وموافقتي على كامل البنود أعلاه، وأن الميزانيات المذكورة هي حق أصيل للاڤندرز 120 تم توجيهه للتشغيل ويسترد من التشغيل، وأن الصافي المتبقي هو التزام مباشر عليّ لصالح لاڤندرز 120.'],
      ['h', 'مستحق التايكون'],
      ['p', 'يسترد رأس ماله من رسوم دخول البزنس للمؤشر بواقع رسم قدره $22.58 قبل التشغيل. وربحه الصافي ثلث الداتا = $51,480 للمؤشر = $' + gain + (sec ? ' للقطاع كامل (400 مؤشر)' : ' للمجال كامل (20 مؤشر)') + '.'],
      ['h', 'حق الفرصة الاستثمارية'],
      ['p', 'يحق للبزنسات المتفوقة تقييمياً الحصول على فرصة استثمارية اختيارية غير ملزمة، بنسبة 13.93% من إجمالي عوائد المؤسسين وهم التايكون ولاڤندرز والكريترز عوائدهم السنوية من داتا السوق، وتمنح هذه الفرصة وفقاً لضوابط البزنس الداخلية الخاصة وحدها، ولا دخل للمؤشر في تقييمها الداخلي، وتعتبر شراكة استثمارية مباشرة وليست توزيعاً لأرباح الداتا.'],
      ['h', 'العملة المعتمدة للدفع'],
      ['p', '{{opt:currency:usd|دولار أمريكي}}{{opt:currency:local|العملة المحلية — سعر الصرف حسب البنك المحلي المفضل يوم السداد}}'],
      ['h', 'آلية سداد الصافي المتبقي (اختر واحدة)'],
      ['p', '{{opt:pay_method:direct|تحويل مباشر بالقيمة}}{{opt:pay_method:bank_guarantee|دفعات بضمان بنكي: 40% مع التوقيع = $' + p40 + '؛ 30% عند اكتمال ' + a1 + ' مؤشر = $' + p30 + '؛ 30% عند اكتمال ' + a2 + ' مؤشر = $' + p30 + '}}{{opt:pay_method:cheques|شيكات: سداد 40% = $' + p40 + ' عند التوقيع، وتسليم عدد 2 شيك مصرفي معتمد القبول مربوط بالدولار: الأول 30% = $' + p30 + ' يصرف عند اكتمال ' + a1 + ' مؤشر بمحضر تسليم، والثاني 30% = $' + p30 + ' عند اكتمال ' + a2 + ' مؤشر بمحضر تسليم}}{{opt:pay_method:guarantee_letter|خطاب ضمان دفع دولاري بالقيمة}}'],
      ['p', 'ملاحظات / بيانات الضمان أو الشيك: {{pay_note|ملاحظات آلية السداد}}<br>المستحق مع التوقيع حسب الباقة المختارة: <b>$' + due + '</b>'],
      ['h', 'التايكون الممول'],
      ['p', 'الاسم: {{t_name|الاسم الكامل}}<br>رقم الهوية / الجواز: {{t_id|رقم الهوية / الجواز}}<br>رقم التواصل: {{t_phone|رقم التواصل|tel}}<br>' + (sec ? 'القطاع الجغرافي' : 'المجال') + ': {{t_country|' + (sec ? 'القطاع الجغرافي' : 'المجال') + '}}<br>التوقيع: {{sig:sig_tycoon|توقيع التايكون}}<br>التاريخ: {{t_date|التاريخ|date}}'],
      ['h', 'إدارة لاڤندرز 120'],
      ['p', 'الاسم: {{admin_name|اسم المعتمد}}<br>التوقيع: {{sig:sig_admin|توقيع الإدارة}}<br>التاريخ: {{admin_date|تاريخ الاعتماد|date}}<br>ملاحظة الإدارة: {{admin_note|ملاحظة}}']
    ]);
    return doc;
  }
  function curDoc() { return S.kind === 'funding' ? fundDoc(S.tier) : DOC; }
  function docTitle() { return S.kind === 'funding' ? 'صفحة اعتماد التمويل — ' + (S.name || '') : 'لاڤندرز لإدارة البزنسات — ' + (S.name || ''); }

  var S = { open: false, kind: 'business', tier: '', sheetId: '', name: '', isAdmin: false, fields: {}, sigs: {}, status: 'draft', pending: {}, timer: null };

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(m) { try { if (typeof showToast === 'function') { showToast(m); return; } } catch (e) {} alert(m); }
  function canEditKey(k) {
    var f = S.kind === 'funding';
    var ak = f ? FUND_ADMIN_KEYS : ADMIN_KEYS, as = f ? FUND_ADMIN_SIGS : ADMIN_SIGS, bk = f ? FUND_USER_KEYS : BUSINESS_KEYS, bs = f ? FUND_USER_SIGS : BUSINESS_SIGS;
    return S.isAdmin ? ak.indexOf(k) !== -1 || as.indexOf(k) !== -1 : (bk.indexOf(k) !== -1 || bs.indexOf(k) !== -1);
  }
  function locked() { return !S.isAdmin && S.status === 'received'; }

  function api(method, body, query) {
    var url = WORKER_URL + (query ? '?' + query + '&token=' + encodeURIComponent(AUTH_TOKEN) : '');
    var opt = method === 'GET' ? {} : { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ token: AUTH_TOKEN }, body)) };
    return fetch(url, opt).then(function (r) { return r.json(); });
  }

  // ── بناء المستند
  function renderToken(m) {
    var parts = m.split('|'), head = parts[0], label = parts[1] || '', kind = parts[2] || 'text';
    if (head.indexOf('sig:') === 0) {
      var sk = head.slice(4), img = S.sigs[sk];
      return '<span class="af af-sig' + (canEditKey(sk) && !locked() ? ' af-on' : '') + '" data-sig="' + sk + '" data-label="' + esc(label) + '">' +
        (img ? '<img src="' + esc(img) + '" alt="توقيع">' : '<i>✍️ ' + esc(label) + '</i>') + '</span>';
    }
    if (head.indexOf('opt:') === 0) {
      var o = head.split(':'), ok = o[1], ov = o[2], on = S.fields[ok] === ov;
      return '<span class="af af-opt' + (on ? ' af-checked' : '') + (canEditKey(ok) && !locked() ? ' af-on' : '') + '" data-opt="' + ok + '" data-val="' + ov + '">' + (on ? '☑' : '☐') + ' ' + esc(label) + '</span>';
    }
    var v = S.fields[head];
    return '<span class="af' + (canEditKey(head) && !locked() ? ' af-on' : '') + (v ? '' : ' af-empty') + '" data-k="' + head + '" data-label="' + esc(label) + '" data-kind="' + kind + '">' + (v ? esc(v) : esc(label)) + '</span>';
  }
  function renderDoc() {
    var html = '';
    curDoc().forEach(function (b) {
      var t = b[1].replace(/\{\{([^}]+)\}\}/g, function (_, m) { return renderToken(m); });
      if (b[0] === 't') html += '<h1>' + t + '</h1>';
      else if (b[0] === 'sub') html += '<div class="sub">' + t + '</div>';
      else if (b[0] === 'h') html += '<h2>' + t + '</h2>';
      else if (b[0] === 'h2') html += '<h3>' + t + '</h3>';
      else html += '<p>' + t + '</p>';
    });
    return html;
  }
  var STATUS_AR = { draft: '📝 مسودة', submitted: '⏳ بانتظار مراجعة الإدارة', received: '✅ تم الاستلام والاعتماد', rejected: '❌ غير مقبولة — عدّل وأعد الإرسال' };
  function paint() {
    var body = document.getElementById('agrBody'); if (!body) return;
    var top = body.scrollTop;
    body.innerHTML = renderDoc();
    body.scrollTop = top;
    var st = document.getElementById('agrStatus'); if (st) st.textContent = (STATUS_AR[S.status] || S.status);
    var sb = document.getElementById('agrSubmit'); if (sb) sb.style.display = (!S.isAdmin && S.status !== 'received' && S.status !== 'submitted') ? '' : 'none';
    var hint = document.getElementById('agrHint');
    if (hint) hint.textContent = locked() ? 'الاتفاقية مستلمة ومقفلة.' : (S.isAdmin ? (S.kind === 'funding' ? 'أنت تعبّئ خانات الإدارة فقط (الاسم والتوقيع والتاريخ).' : 'أنت تعبّئ خانات الإدارة فقط (نموذج 3 + اعتماد الإدارة).') : 'المس أي خانة لتعبئتها، والمس خانة التوقيع لترسم توقيعك.');
  }

  // ── الاستجابة للمس
  function onBodyClick(e) {
    if (locked()) return;
    var t = e.target.closest('.af'); if (!t) return;
    if (t.dataset.sig) { if (canEditKey(t.dataset.sig)) openPad(t.dataset.sig, t.dataset.label); else toast('هذه الخانة تعبّئها جهة أخرى'); return; }
    if (t.dataset.opt) { if (!canEditKey(t.dataset.opt)) return; setField(t.dataset.opt, S.fields[t.dataset.opt] === t.dataset.val ? '' : t.dataset.val); return; }
    if (t.dataset.k) { if (canEditKey(t.dataset.k)) openEditor(t.dataset.k, t.dataset.label, t.dataset.kind); else toast('هذه الخانة تعبّئها جهة أخرى'); }
  }
  function setField(k, v) { S.fields[k] = v; S.pending[k] = v; paint(); scheduleSave(); }
  function scheduleSave() { clearTimeout(S.timer); S.timer = setTimeout(flush, 700); }
  function flush() {
    var keys = Object.keys(S.pending); if (!keys.length) return Promise.resolve();
    var payload = S.pending; S.pending = {};
    return api('POST', { action: 'save_agreement_fields', sheetId: S.sheetId, fields: payload }).then(function (d) {
      if (d.error) { toast(d.error); Object.keys(payload).forEach(function (k) { S.pending[k] = payload[k]; }); }
      else { var el = document.getElementById('agrSaved'); if (el) { el.textContent = 'تم الحفظ ✓'; setTimeout(function () { el.textContent = ''; }, 1500); } }
    }).catch(function () { Object.keys(payload).forEach(function (k) { S.pending[k] = payload[k]; }); toast('تعذّر الحفظ — تحقق من الاتصال'); });
  }

  // ── لوحة الكتابة (يفتح الكيبورد المناسب: حروف / أرقام)
  function openEditor(k, label, kind) {
    closeSheets();
    var wrap = document.createElement('div'); wrap.id = 'agrEditor'; wrap.className = 'agr-sheet';
    var mode = kind === 'num' ? 'decimal' : kind === 'tel' ? 'tel' : kind === 'date' ? 'numeric' : 'text';
    wrap.innerHTML = '<div class="agr-sheet-in"><div class="agr-lbl">' + esc(label) + '</div>' +
      '<input id="agrInput" type="text" inputmode="' + mode + '" autocomplete="off" dir="auto" ' + (kind === 'date' ? 'placeholder="مثال: 2026/10/17"' : '') + ' value="' + esc(S.fields[k] || '') + '">' +
      '<div class="agr-row"><button id="agrOk" class="agr-btn gold">حفظ</button><button id="agrCancel" class="agr-btn">إلغاء</button></div></div>';
    document.getElementById('agrOverlay').appendChild(wrap);
    var inp = document.getElementById('agrInput');
    setTimeout(function () { inp.focus(); inp.select(); }, 60);
    function done() { setField(k, inp.value.trim()); closeSheets(); }
    document.getElementById('agrOk').onclick = done;
    document.getElementById('agrCancel').onclick = closeSheets;
    inp.onkeydown = function (ev) { if (ev.key === 'Enter') done(); };
  }

  // ── لوحة الرسم (بدل الكيبورد) للتوقيع
  function openPad(key, label) {
    closeSheets();
    var wrap = document.createElement('div'); wrap.id = 'agrPad'; wrap.className = 'agr-sheet';
    wrap.innerHTML = '<div class="agr-sheet-in"><div class="agr-lbl">✍️ ' + esc(label) + ' — ارسم توقيعك بإصبعك</div>' +
      '<canvas id="agrCanvas" width="300" height="120"></canvas>' +
      '<div class="agr-row"><button id="agrPadOk" class="agr-btn gold">حفظ التوقيع</button><button id="agrPadClear" class="agr-btn">مسح</button><button id="agrPadCancel" class="agr-btn">إلغاء</button></div></div>';
    document.getElementById('agrOverlay').appendChild(wrap);
    var cv = document.getElementById('agrCanvas'), cx = cv.getContext('2d'), drawing = false, dirty = false;
    cx.lineWidth = 2.2; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#111';
    function pos(ev) { var r = cv.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev; return [(p.clientX - r.left) * cv.width / r.width, (p.clientY - r.top) * cv.height / r.height]; }
    function down(ev) { ev.preventDefault(); drawing = true; dirty = true; var p = pos(ev); cx.beginPath(); cx.moveTo(p[0], p[1]); cx.lineTo(p[0] + .1, p[1] + .1); cx.stroke(); }
    function move(ev) { if (!drawing) return; ev.preventDefault(); var p = pos(ev); cx.lineTo(p[0], p[1]); cx.stroke(); }
    function up() { drawing = false; }
    cv.addEventListener('mousedown', down); cv.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    cv.addEventListener('touchstart', down, { passive: false }); cv.addEventListener('touchmove', move, { passive: false }); cv.addEventListener('touchend', up);
    document.getElementById('agrPadClear').onclick = function () { cx.clearRect(0, 0, cv.width, cv.height); dirty = false; };
    document.getElementById('agrPadCancel').onclick = function () { window.removeEventListener('mouseup', up); closeSheets(); };
    document.getElementById('agrPadOk').onclick = function () {
      window.removeEventListener('mouseup', up);
      if (!dirty) { toast('ارسم التوقيع أولاً'); return; }
      var data = exportSmall(cv);
      closeSheets();
      S.sigs[key] = data; paint();
      api('POST', { action: 'save_agreement_sig', sheetId: S.sheetId, key: key, data: data }).then(function (d) {
        if (d.error) { toast(d.error); delete S.sigs[key]; paint(); } else toast('تم حفظ التوقيع ✓');
      }).catch(function () { toast('تعذّر حفظ التوقيع'); });
    };
  }
  // تصغير صورة التوقيع لتبقى ضمن حد الطلب (Worker يرفض > 10KB)
  function exportSmall(cv) {
    var sizes = [[300, 120], [240, 96], [200, 80], [160, 64]], out = '';
    for (var i = 0; i < sizes.length; i++) {
      var c = document.createElement('canvas'); c.width = sizes[i][0]; c.height = sizes[i][1];
      c.getContext('2d').drawImage(cv, 0, 0, c.width, c.height);
      out = c.toDataURL('image/png'); if (out.length <= 8500) return out;
    }
    return out;
  }
  function closeSheets() { ['agrEditor', 'agrPad'].forEach(function (id) { var e = document.getElementById(id); if (e) e.remove(); }); }

  function submit() {
    flush().then(function () {
      if (!confirm('إرسال النموذج للإدارة؟ سيُراجعها الأدمن، ولن تستطيع التعديل أثناء المراجعة.')) return;
      api('POST', { action: 'submit_agreement_form', sheetId: S.sheetId }).then(function (d) {
        if (d.error) { toast(d.error); return; }
        S.status = 'submitted'; paint(); toast('تم الإرسال — بانتظار مراجعة الإدارة');
        try { if (typeof loadPortal === 'function') loadPortal(); } catch (e) {}
      });
    });
  }

  var CSS = '.toast{z-index:10001!important;pointer-events:none!important}#agrOverlay{position:fixed;inset:0;z-index:9999;background:var(--bg,#04040A);color:var(--text,#EDEBE4);display:flex;flex-direction:column;direction:rtl;font-family:inherit}' +
    '#agrOverlay .agr-top{display:flex;align-items:center;gap:8px;padding:10px 14px;border-bottom:1px solid var(--glass-border,rgba(255,255,255,.1));background:rgba(255,255,255,.03)}' +
    '#agrOverlay .agr-top b{flex:1;font-size:13px;color:var(--gold,#C9A84C)}' +
    '#agrOverlay .agr-x{background:none;border:none;color:var(--text-dim,#aaa);font-size:22px;cursor:pointer}' +
    '#agrOverlay .agr-btn{padding:9px 14px;border-radius:10px;border:1px solid var(--glass-border,rgba(255,255,255,.2));background:transparent;color:var(--text,#EDEBE4);font-size:13px;cursor:pointer}' +
    '#agrOverlay .agr-btn.gold{border-color:var(--gold,#C9A84C);color:var(--gold,#C9A84C);font-weight:700}' +
    '#agrBody{flex:1;overflow:auto;padding:16px 16px 90px;line-height:2;font-size:14px;max-width:760px;width:100%;margin:0 auto}' +
    '#agrBody h1{font-size:20px;color:var(--gold,#C9A84C);text-align:center;margin:6px 0}#agrBody .sub{font-size:12px;color:var(--text-dim,#aaa);text-align:center;margin-bottom:14px}' +
    '#agrBody h2{font-size:15px;color:var(--gold,#C9A84C);margin:20px 0 4px}#agrBody h3{font-size:13.5px;margin:14px 0 2px}#agrBody p{margin:6px 0}' +
    '.af{display:inline-block;min-width:60px;padding:0 8px;border-bottom:1px dashed rgba(201,168,76,.6);background:rgba(201,168,76,.07);border-radius:6px;vertical-align:baseline}' +
    '.af-empty{color:var(--text-faint,#777);font-size:12px}.af-on{cursor:pointer}.af-on:active{background:rgba(201,168,76,.25)}' +
    '.af-sig{min-width:110px;min-height:44px;text-align:center;vertical-align:middle}.af-sig img{height:42px;background:#fff;border-radius:4px}.af-opt{display:block;margin:4px 0;padding:6px 10px}.af-checked{background:rgba(201,168,76,.22);border-bottom-style:solid}' +
    '.agr-sheet{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:flex-end;justify-content:center}' +
    '.agr-sheet-in{width:100%;max-width:520px;background:var(--surface,#12121A);border-top:1px solid var(--gold,#C9A84C);border-radius:18px 18px 0 0;padding:16px 16px 22px}' +
    '.agr-lbl{font-size:13px;color:var(--gold,#C9A84C);margin-bottom:10px}#agrInput{width:100%;padding:13px;border-radius:10px;border:1px solid var(--glass-border,rgba(255,255,255,.2));background:rgba(255,255,255,.05);color:var(--text,#EDEBE4);font-size:17px;box-sizing:border-box}' +
    '#agrCanvas{width:100%;height:auto;aspect-ratio:300/120;background:#fff;border-radius:10px;touch-action:none;display:block}.agr-row{display:flex;gap:8px;margin-top:12px}.agr-row .agr-btn{flex:1}' +
    '@media print{body>*:not(#agrOverlay){display:none!important}#agrOverlay{position:static;background:#fff;color:#000}#agrOverlay .agr-top,.agr-sheet{display:none!important}#agrBody{overflow:visible;padding:0}.af{background:none;border-bottom:1px solid #000;color:#000}.af-empty{color:#999}#agrBody h1,#agrBody h2{color:#000}}';

  function build() {
    if (document.getElementById('agrOverlay')) document.getElementById('agrOverlay').remove();
    if (!document.getElementById('agrCss')) { var st = document.createElement('style'); st.id = 'agrCss'; st.textContent = CSS; document.head.appendChild(st); }
    var o = document.createElement('div'); o.id = 'agrOverlay';
    o.innerHTML = '<div class="agr-top"><button class="agr-x" id="agrClose" aria-label="إغلاق">✕</button><b>' + esc(docTitle()) + '</b>' +
      '<span id="agrSaved" style="font-size:11px;color:#6EE7B7"></span><button class="agr-btn" id="agrPrint">🖨 PDF</button></div>' +
      '<div style="padding:6px 14px;font-size:11.5px;color:var(--text-dim,#aaa);display:flex;gap:10px;flex-wrap:wrap"><span id="agrStatus"></span><span id="agrHint"></span></div>' +
      '<div id="agrBody"></div>' +
      '<div style="position:fixed;bottom:0;left:0;right:0;padding:10px 14px;background:linear-gradient(transparent,var(--bg,#04040A) 40%);display:flex;justify-content:center"><button class="agr-btn gold" id="agrSubmit" style="min-width:60%">إرسال للإدارة</button></div>';
    document.body.appendChild(o);
    document.getElementById('agrBody').addEventListener('click', onBodyClick);
    document.getElementById('agrClose').onclick = close;
    document.getElementById('agrPrint').onclick = function () { window.print(); };
    document.getElementById('agrSubmit').onclick = submit;
  }
  function close() {
    flush();
    var o = document.getElementById('agrOverlay'); if (o) o.remove();
    S.open = false;
    if (history.state && history.state.agr) { try { history.back(); } catch (e) {} }
  }

  window.AgreementForm = {
    open: function (opts) {
      var fund = opts.kind === 'funding';
      var owner = String(opts.owner || (function () { try { return sessionStorage.getItem('lavndr_email') || ''; } catch (e) { return ''; } })()).toLowerCase();
      var sid = fund ? 'FUND:' + opts.tier + ':' + owner : opts.sheetId;
      S = { open: true, kind: fund ? 'funding' : 'business', tier: opts.tier || '', sheetId: sid, name: opts.name || '', isAdmin: false, fields: {}, sigs: {}, status: 'draft', pending: {}, timer: null };
      build();
      document.getElementById('agrBody').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim,#aaa)">جاري التحميل...</div>';
      try { history.pushState({ agr: 1 }, ''); } catch (e) {}
      api('GET', null, 'action=agreement_form&sheetId=' + encodeURIComponent(S.sheetId)).then(function (d) {
        if (d.error) { toast(d.error); close(); return; }
        if (d.kind) S.kind = d.kind; if (d.tier) S.tier = d.tier; S.fields = d.fields || {}; S.sigs = d.sigs || {}; S.status = d.status || 'draft'; S.isAdmin = !!d.isAdmin; if (!S.name) S.name = d.businessName || '';
        build(); paint();
      }).catch(function () { toast('تعذّر تحميل النموذج'); close(); });
    },
    close: close
  };
  // زر الرجوع في المتصفح/الجوال يغلق النموذج أولاً
  window.addEventListener('popstate', function () { if (S.open && document.getElementById('agrOverlay')) { flush(); document.getElementById('agrOverlay').remove(); S.open = false; } });
})();
