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
            b = "<a href=\"privacy.html\" ' + st + '>Privacy policy</a>';"
            if b in s and 'insights/index.html' not in s:
                s = s.replace(b, "<a href=\"insights/index.html\" ' + st + '>Insights</a> · " + b, 1)
        if s != o:
            open(p, "w", encoding="utf-8").write(s)
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
