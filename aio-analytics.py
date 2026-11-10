#!/usr/bin/env python3
"""Site maintenance, idempotent and safe to run daily:
1. adds the Cloudflare Web Analytics beacon (cookie-free, public token) to every public HTML page;
2. adds a visible link to the Insights articles to the navigation of every public page
   (Arabic pages -> /insights/ar/, English pages -> /insights/) and to the home page footer."""
import os
import re
import sys

TOKEN = "d361bba7041d4a1bbc4d5aba1003356b"
SNIPPET = ("<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' "
           "data-cf-beacon='{\"token\": \"%s\"}'></script><!-- End Cloudflare Web Analytics -->\n" % TOKEN)
ROOT = os.environ.get("AIO_ROOT") or os.path.dirname(os.path.abspath(__file__))
SKIP_DIRS = {".git", ".github", "node_modules", "insights_dry", "insights"}
SKIP_FILES = {"admin.html"}
NAV_AR = re.compile(r'(<nav aria-label="التنقل">)(.*?)(</nav>)', re.S)
NAV_EN = re.compile(r'(<nav aria-label="Navigation">)(.*?)(</nav>)', re.S)
beacon = nav = 0

for d, dirs, files in os.walk(ROOT):
    dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
    rel = os.path.relpath(d, ROOT)
    for f in files:
        if not f.endswith(".html") or f in SKIP_FILES:
            continue
        p = os.path.join(d, f)
        try:
            s = open(p, encoding="utf-8").read()
        except Exception:  # noqa
            continue
        o = s
        if "cloudflareinsights.com" not in s and "</body>" in s:
            i = s.rindex("</body>")
            s = s[:i] + SNIPPET + s[i:]
            beacon += 1
        if rel == ".":
            if "insights/ar/" not in NAV_AR.sub(lambda m: m.group(2), s) and NAV_AR.search(s):
                s = NAV_AR.sub(lambda m: m.group(1) + m.group(2) + '<a href="insights/ar/index.html">مقالات</a>' + m.group(3), s, count=1)
                nav += 1
            m2 = NAV_AR.search(s)
            if m2 and "embed.html" not in m2.group(2):
                s = NAV_AR.sub(lambda m: m.group(1) + m.group(2) + '<a href="embed.html">ودجت</a>' + m.group(3), s, count=1)
                nav += 1
        elif rel == "en":
            m = NAV_EN.search(s)
            if m and "insights/" not in m.group(2):
                s = NAV_EN.sub(lambda m: m.group(1) + m.group(2) + '<a href="../insights/index.html">Insights</a>' + m.group(3), s, count=1)
                nav += 1
        if f == "index.html" and rel == ".":
            st = 'style="color:rgba(255,255,255,.45);text-decoration:underline"'
            a = '<a href="privacy.html" ' + st + '>سياسة الخصوصية</a></span>'
            if a in s and 'insights/ar/' not in s:
                s = s.replace(a, '<a href="insights/ar/index.html" ' + st + '>مقالات</a> · ' + a, 1)
                nav += 1
            a2 = '<a href="insights/ar/index.html" ' + st + '>مقالات</a> · '
            if a2 in s and '>ودجت</a>' not in s:
                s = s.replace(a2, a2 + '<a href="embed.html" ' + st + '>ودجت</a> · ', 1)
                nav += 1
            b = "<a href=\"privacy.html\" ' + st + '>Privacy policy</a>';"
            if b in s and 'insights/index.html' not in s:
                s = s.replace(b, "<a href=\"insights/index.html\" ' + st + '>Insights</a> · " + b, 1)
            b3 = "<a href=\"insights/index.html\" ' + st + '>Insights</a> · "
            if b3 in s and '>Widget</a>' not in s:
                s = s.replace(b3, b3 + "<a href=\"embed.html\" ' + st + '>Widget</a> · ", 1)
        if s != o:
            open(p, "w", encoding="utf-8").write(s)
# link the Instagram profile from the site's entity data (idempotent)
IG = "https://www.instagram.com/lavenders120/"
WD = "https://www.wikidata.org/wiki/Q141990047"
for fn in ("index.html", "about.html", "llms.txt"):
    pth = os.path.join(ROOT, fn)
    try:
        t = open(pth, encoding="utf-8").read()
    except Exception:  # noqa
        continue
    if IG in t:
        continue
    if fn.endswith(".html"):
        if '"' + WD + '"' not in t:
            continue
        t = t.replace('"' + WD + '"', '"' + WD + '", "' + IG + '"', 1)
    else:
        if "- Wikidata item: " + WD not in t:
            continue
        t = t.replace("- Wikidata item: " + WD, "- Wikidata item: " + WD + "\n- Instagram: " + IG, 1)
    open(pth, "w", encoding="utf-8").write(t)
    nav += 1
# core message: consumer behaviour, applied to the main static pages (idempotent exact-text replacements)
CORE_AR = "لاڤندرز تكشف سلوك المستهلك: ماذا يطلب الناس فعلاً، ومتى، ومن أي بزنس، من الطلبات الحقيقية لـ120 بزنس وبراند، وتحوّل ذلك إلى مؤشر حي LAVNDR120 وتقارير للبزنسات والبراندات."
CORE_EN = "Lavenders reveals consumer behaviour: what people actually order, when, and from which businesses, drawn from the real orders of 120 businesses and brands, turned into a live index (LAVNDR120) and reports for businesses and brands."
CORE_FILES = {
    "about.html": [
        ("لاڤندرز (Lavenders) منظومة سوق رقمية تجمع 120 بزنس وبراند، لكل بزنس نظام طلباته الخاص، ومؤشرها الاستهلاكي LAVNDR120 يتحرك لحظة بلحظة مع طلباتهم الفعلية.", CORE_AR),
        ("لاڤندرز منظومة سوق رقمية تجمع 120 بزنس وبراند في سوق واحد، لكل بزنس نظام طلباته الخاص، ومؤشرها الاستهلاكي LAVNDR120 يتحرك لحظة بلحظة مع طلباتهم الفعلية.", CORE_AR),
        ("منظومة سوق رقمية تجمع 120 بزنس وبراند ومؤشر استهلاكي حي يتحرك مع طلباتهم الفعلية.", "تكشف سلوك المستهلك من الطلبات الحقيقية لـ120 بزنس وبراند، ومؤشرها الحي LAVNDR120."),
        ("<h2>ما هي لاڤندرز؟</h2>\n    <p><strong>لاڤندرز (Lavenders)</strong> منظومة", "<h2>ما هي لاڤندرز؟</h2>\n    <p><strong>الجوهر: كشف سلوك المستهلك.</strong> " + CORE_AR + "</p>\n    <p><strong>لاڤندرز (Lavenders)</strong> منظومة"),
    ],
    "en/about.html": [
        ("Lavenders is a digital market system of 120 businesses and brands, each with its own order system, feeding a live consumer index called LAVNDR120.", CORE_EN),
        ("<h2>What is Lavenders?</h2>\n    <p><strong>Lavenders</strong> (Arabic", "<h2>What is Lavenders?</h2>\n    <p><strong>The core: revealing consumer behaviour.</strong> " + CORE_EN + "</p>\n    <p><strong>Lavenders</strong> (Arabic"),
    ],
    "consumer-index.html": [
        ("وLAVNDR120 مؤشر استهلاكي حي يتحرك مع الطلبات الفعلية لـ120 بزنس وبراند. تعرّف على كيفية قراءته", "وLAVNDR120 مؤشر استهلاكي حي يكشف سلوك المستهلك من الطلبات الفعلية لـ120 بزنس وبراند: ماذا يطلب الناس ومن أي بزنس. تعرّف على كيفية قراءته"),
        ("يقيس حركة الطلبات الفعلية لـ120 بزنس وبراند في سوق واحد، ويُحدَّث لحظة بلحظة.", "يقيس حركة الطلبات الفعلية لـ120 بزنس وبراند في سوق واحد، ويُحدَّث لحظة بلحظة، ويُستخدم لكشف سلوك المستهلك: ماذا يطلب الناس فعلاً ومن أي بزنس."),
    ],
    "en/consumer-index.html": [
        ("LAVNDR120 is a live consumer index that moves with the real orders of 120 businesses and brands.", "LAVNDR120 is a live consumer index that reveals consumer behaviour from the real orders of 120 businesses and brands: what people actually order and from which businesses."),
        ("it measures the real order activity of 120 businesses and brands in one market, updated moment by moment.", "it measures the real order activity of 120 businesses and brands in one market, updated moment by moment, and is used to reveal consumer behaviour: what people actually order and from which businesses."),
    ],
    "llms-full.txt": [
        ("# Lavenders (LAVNDR120) — full reference for AI assistants\n\n", "# Lavenders (LAVNDR120) — full reference for AI assistants\n\n" + CORE_EN + "\n\n"),
    ],
}
for fn, pairs in CORE_FILES.items():
    pth = os.path.join(ROOT, fn)
    try:
        t = open(pth, encoding="utf-8").read()
    except Exception:  # noqa
        continue
    o = t
    for old, new in pairs:
        if old in t and new not in t:
            t = t.replace(old, new)
    if t != o:
        open(pth, "w", encoding="utf-8").write(t)
        nav += 1
# keep sitemap.xml complete for key static pages (idempotent)
try:
    sm = open("sitemap.xml", encoding="utf-8").read()
    for page, freq, pr in (("en/terms.html", "yearly", "0.4"), ("embed.html", "monthly", "0.7")):
        loc = "https://lavndrs120.github.io/" + page
        if os.path.exists(page) and loc not in sm and "</urlset>" in sm:
            ent = ("  <url>\n    <loc>" + loc + "</loc>\n    <lastmod>2026-11-05</lastmod>\n    <changefreq>" + freq +
                   "</changefreq>\n    <priority>" + pr + "</priority>\n  </url>\n")
            sm = sm.replace("</urlset>", ent + "</urlset>")
            open("sitemap.xml", "w", encoding="utf-8").write(sm)
            print("sitemap: added", page)
except Exception as e:  # noqa
    print("sitemap step skipped:", e)
print("beacon added to", beacon, "page(s); insights link added to", nav, "page(s)")
sys.exit(0)
