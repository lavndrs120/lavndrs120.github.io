#!/usr/bin/env python3
"""يحدّث index.html بقيمة الأصول الحالية (للبوتات ومحركات البحث). يُشغَّل من GitHub Action كل 10 دقائق."""
import json, os, re, sys, urllib.request, html
URL = os.environ.get('LIVE_URL', 'https://lavndr.omssolutionorders.workers.dev/?action=public_index')
SITE = 'https://lavndrs120.github.io/'
PATH = os.environ.get('INDEX_PATH', 'index.html')
if os.environ.get('LIVE_JSON'):
    d = json.load(open(os.environ['LIVE_JSON']))
else:
    try:
        req = urllib.request.Request(URL, headers={'User-Agent': 'lavndr-live-card'})
        d = json.load(urllib.request.urlopen(req, timeout=30))
    except Exception as e:
        print('fetch failed:', e); sys.exit(0)
x = d.get('index') if isinstance(d, dict) else None
if not x:
    print('no index in response'); sys.exit(0)
def f(v):
    try: return '%.2f' % float(v)
    except Exception: return '0.00'
def pct(v): return str(v if v is not None else '0.00').lstrip('+-')
nav = f(x.get('NAV')); ch = 0.0
try: ch = float(x.get('change') or 0)
except Exception: pass
cls = 'pos' if ch >= 0 else 'neg'; arrow = '▲' if ch >= 0 else '▼'
chabs = str(x.get('change') if x.get('change') is not None else '0.00').lstrip('+-'); p = pct(x.get('changePercent'))
ts = (d.get('timestamp') or '')[:16].replace('T', ' ')
about = 'لاڤندرز 120 — منظومة سوق من 120 بزنس وبراند لكل سوق. مؤشر استهلاكي حي يتحرك مع طلبات البزنسات الحقيقية، وكل بزنس يمتلك نظام طلباته الخاص ويتابع أداء الـ119 الآخرين.'
title = 'LAVNDR120 · $%s %s %s%% — صافي قيمة الأصول' % (nav, arrow, p)
desc = 'صافي قيمة الأصول الآن $%s (%s %s%%). %s' % (nav, arrow, p, about)
e = lambda t: html.escape(t, quote=True)
ld = json.dumps({'@context': 'https://schema.org', '@type': 'WebPage', 'name': title, 'description': desc, 'url': SITE, 'inLanguage': 'ar',
                 'image': SITE + 'og-card.jpg', 'dateModified': d.get('timestamp') or None}, ensure_ascii=False).replace('<', '\\u003c')
meta = ('<title>%s</title>\n<meta name="description" content="%s">\n<meta property="og:title" content="%s">\n<meta property="og:description" content="%s">\n'
        '<meta name="twitter:title" content="%s">\n<meta name="twitter:description" content="%s">\n<script type="application/ld+json">%s</script>\n') % (e(title), e(desc), e(title), e(desc), e(title), e(desc), ld)
hm = (d.get('timestamp') or '')[11:16]
card = ('<div class="hero"><div class="hero-eyebrow">المؤشر الاستهلاكي</div><div class="hero-ticker">LAVNDR120</div><div class="hero-subtitle" id="lastUpdateText">%s</div></div>\n'
        '<div class="glass nav-card" id="liveCard"><span class="dl-badge dl-live">مباشر · لحظة بلحظة</span><div class="nav-label">صافي قيمة الأصول</div>'
        '<div class="nav-value %s">$%s</div><div class="nav-change %s">%s %s%s (%s%%)</div>'
        '<div class="nav-meta"><div class="nav-meta-item"><div class="nav-meta-label">High</div><div class="nav-meta-val">$%s</div></div>'
        '<div class="nav-meta-item"><div class="nav-meta-label">Low</div><div class="nav-meta-val">$%s</div></div>'
        '<div class="nav-meta-item"><div class="nav-meta-label">Volatility</div><div class="nav-meta-val">%s%%</div></div></div></div>\n'
        '<p class="ab">%s</p>\n') % (('آخر تحديث ' + hm) if hm else '', cls, nav, cls, arrow, '+' if ch >= 0 else '-', e(chabs), e(p),
        f(x.get('dayHigh')), f(x.get('dayLow')), f(x.get('volatility')), e(about))
dash = os.environ.get('DASH_PATH', 'dashboard.html')
if os.path.exists(dash):
    ds = open(dash, encoding='utf-8').read()
    pub = {k: x.get(k) for k in ('NAV', 'change', 'changePercent', 'dayHigh', 'dayLow', 'volatility')}
    last = json.dumps({'index': pub, 'timestamp': d.get('timestamp')}, ensure_ascii=False).replace('</', '<\\/')
    pat = re.compile(r'/\*LIVE_DATA_START\*/.*?/\*LIVE_DATA_END\*/', re.S)
    if pat.search(ds):
        nd = pat.sub(lambda m: '/*LIVE_DATA_START*/window.LAST_PUBLIC_INDEX=' + last + ';/*LIVE_DATA_END*/', ds, count=1)
        if nd != ds:
            open(dash, 'w', encoding='utf-8').write(nd); print('dashboard updated')
s = open(PATH, encoding='utf-8').read()
def rep(s, name, body):
    pat = re.compile(r'(<!--%s_START-->).*?(<!--%s_END-->)' % (name, name), re.S)
    assert pat.search(s), name
    return pat.sub(lambda m: m.group(1) + '\n' + body + m.group(2), s, count=1)
n = rep(rep(s, 'LIVE_META', meta), 'LIVE_CARD', card)
if n != s:
    open(PATH, 'w', encoding='utf-8').write(n); print('updated', nav)
else:
    print('no change')
