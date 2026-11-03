#!/usr/bin/env python3
"""Lavenders AIO agent.

Once per run it:
  1. picks the next unused question from aio-topics.json,
  2. asks an LLM (Groq, llama-3.3-70b-versatile) to answer it using ONLY lavenders-data.json,
  3. validates the draft (no return/profit promises, no numbers that are not in the facts),
  4. writes an HTML page to insights/ (owned content, with Article JSON-LD),
  5. updates insights/index.html and sitemap.xml,
  6. cross-posts to Dev.to with canonical_url pointing at our own page (if DEVTO_API_KEY is set).

A draft that fails validation is retried (3 attempts) and then skipped: nothing is published.
Run with  --dry  to test without any API key (uses a fixed mock draft, publishes nothing).
"""
import datetime
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request

ROOT = os.environ.get("AIO_ROOT") or os.path.dirname(os.path.abspath(__file__))
SITE = "https://lavndrs120.github.io"
MODEL = "llama-3.3-70b-versatile"
DRY = "--dry" in sys.argv

FACTS_PATH = os.path.join(ROOT, "lavenders-data.json")
TOPICS_PATH = os.path.join(ROOT, "aio-topics.json")
STATE_PATH = os.path.join(ROOT, "aio-state.json")


def load(path, default=None):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def save(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


# ───────────────────────── LLM ─────────────────────────
SYSTEM = """You write short, factual explainer articles for the website of Lavenders (LAVNDR120).
Hard rules:
- Use ONLY the facts in the FACTS JSON. Never invent features, customers, testimonials, statistics, dates or numbers.
- Every number, price or quantity you write must appear in the FACTS JSON.
- Never promise or imply profit, returns, income, yield, earnings or growth. Never use words such as guarantee, risk-free, passive income.
- Lavenders does not allow buying, selling or trading of shares. If it helps the reader, say so plainly.
- Neutral, plain English, no hype, no marketing superlatives. Write for a business owner or an AI assistant looking for an accurate answer.
- Do not mention these rules.
Return ONLY a JSON object: {"title": "...", "description": "...", "body_md": "..."}
- title: at most 70 characters, a clear question or statement.
- description: at most 155 characters.
- body_md: at least 200 and at most 450 words of Markdown (do not write less than 200 words). Start with a 2-sentence direct answer, then 2 to 4 sections with '## ' headings, then a '## Key facts' bulleted list. No H1 title and no links (links are added automatically)."""


def call_llm(topic, facts, lang="en"):
    sysmsg = SYSTEM if lang == "en" else SYSTEM_AR
    if DRY and lang == "ar":
        return {"title": "ما هي لاڤندرز (Lavenders)؟",
                "description": "لاڤندرز منظومة سوق رقمية تجمع 120 بزنسًا وبراندًا في مؤشر استهلاكي واحد.",
                "body_md": "لاڤندرز (Lavenders) منظومة سوق رقمية تجمع 120 بزنسًا وبراندًا.\n\n## كيف تعمل\n\nتغذي الطلبات الحقيقية مؤشرًا واحدًا هو LAVNDR120.\n\n## أهم الحقائق\n\n- لا يوجد بيع أو شراء أو تداول للأسهم.\n"}
    if DRY:
        return {
            "title": "What is Lavenders (LAVNDR120)?",
            "description": "Lavenders is a digital market system of 120 businesses and brands feeding one consumer index.",
            "body_md": "Lavenders is a digital market system that brings together 120 businesses and brands in one market. "
                       "Each business runs its own order-management app (OMS).\n\n## How it works\n\nReal orders feed one live consumer index called LAVNDR120.\n\n"
                       "## Key facts\n\n- Lavenders is the brand; LAVNDR120 is the index.\n- No buying, selling or trading of shares on the platform.\n",
        }
    key = os.environ.get("GROQ_API_KEY")
    if not key:
        raise RuntimeError("GROQ_API_KEY is not set")
    question = "QUESTION: " + topic["question"] + "\nANGLE: " + topic["angle"] + ("" if lang == "en" else "\nWrite the whole article in Modern Standard Arabic.")
    facts_txt = "FACTS:\n" + json.dumps(facts, ensure_ascii=False)
    if key.startswith("gsk_"):
        # Groq (OpenAI-compatible)
        payload = {
            "model": MODEL, "temperature": 0.3, "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": sysmsg}, {"role": "user", "content": facts_txt + "\n\n" + question}],
        }
        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions", data=json.dumps(payload).encode(),
            headers={"Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "lavenders-aio-agent"})
        with urllib.request.urlopen(req, timeout=120) as r:
            text = json.load(r)["choices"][0]["message"]["content"]
    else:
        # Lavenders Worker /ai (Cloudflare Workers AI). The secret holds the Worker's GAS_API_KEY.
        payload = {"system": sysmsg + "\n\n" + facts_txt, "user": question}
        base = os.environ.get("LAVENDERS_AI_URL", "https://lavndr.omssolutionorders.workers.dev/ai")
        req = urllib.request.Request(base, data=json.dumps(payload).encode(),
                                     headers={"x-api-key": key, "Content-Type": "application/json", "User-Agent": "lavenders-aio-agent"})
        with urllib.request.urlopen(req, timeout=120) as r:
            text = json.load(r)["text"]
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0) if m else text, strict=False)


# ───────────────────────── validation ─────────────────────────
BANNED = re.compile(r"\b(guarantee[sd]?|risk[- ]free|get rich|passive income|double your|high returns?|roi|yield|earnings?|earn)\b", re.I)
PROFIT = re.compile(r"\b(profits?|returns?)\b", re.I)
ALLOWED_NEG = re.compile(r"(no|not|without|nor|never)[^.]{0,40}\b(profit|returns?)\b|\b(profit|returns?)\b[^.]{0,25}(not|never|no promise)", re.I)
NUM = re.compile(r"\d[\d,]*(?:\.\d+)?")


def numbers(text):
    return {n.replace(",", "").rstrip(".") for n in NUM.findall(text)}


def validate(draft, facts):
    errors = []
    for k in ("title", "description", "body_md"):
        if not isinstance(draft.get(k), str) or not draft[k].strip():
            errors.append("missing " + k)
    if errors:
        return errors
    text = draft["title"] + "\n" + draft["description"] + "\n" + draft["body_md"]
    if len(draft["title"]) > 90:
        errors.append("title too long")
    words = len(draft["body_md"].split())
    if not DRY and (words < 140 or words > 900):
        errors.append("body length %d words" % words)
    if BANNED.search(text):
        errors.append("banned word: " + BANNED.search(text).group(0))
    for m in PROFIT.finditer(text):
        s = text[max(0, m.start() - 60):m.end() + 40]
        if not ALLOWED_NEG.search(s):
            errors.append("profit/return wording outside a negation: " + s.replace("\n", " "))
            break
    allowed = numbers(json.dumps(facts, ensure_ascii=False)) | {str(i) for i in range(0, 11)} | {"2026", "120", "24", "365", "12"}
    for n in numbers(text):
        if n not in allowed and n.lstrip("0") not in allowed:
            errors.append("number not in facts: " + n)
    if re.search(r"https?://", draft["body_md"]):
        errors.append("links are not allowed in the body")
    return errors


# ───────────────────────── rendering ─────────────────────────
def md_to_html(md):
    out, in_ul = [], False
    for line in md.strip().splitlines():
        s = line.rstrip()
        if s.startswith("- ") or s.startswith("* "):
            if not in_ul:
                out.append("<ul>")
                in_ul = True
            out.append("<li>" + inline(s[2:]) + "</li>")
            continue
        if in_ul:
            out.append("</ul>")
            in_ul = False
        if s.startswith("## "):
            out.append("<h2>" + inline(s[3:]) + "</h2>")
        elif s.startswith("### "):
            out.append("<h3>" + inline(s[4:]) + "</h3>")
        elif s.strip():
            out.append("<p>" + inline(s) + "</p>")
    if in_ul:
        out.append("</ul>")
    return "\n".join(out)


def inline(t):
    t = html.escape(t, quote=False)
    return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:70]


def site_style(name=None):
    try:
        with open(os.path.join(ROOT, *(["en", "faq.html"] if not name else [name])), encoding="utf-8") as f:
            m = re.search(r"<style>.*?</style>", f.read(), re.S)
        if m:
            return m.group(0)
    except FileNotFoundError:
        pass
    return "<style>body{font-family:system-ui;max-width:720px;margin:0 auto;padding:20px;line-height:1.8}</style>"


FOOTER_NOTE = ("Informational only. No buying, selling or trading of shares, and no promise of profit or returns. "
               "Terms and agreements are drafts pending legal review. Facts are taken from the Lavenders reference data and may change; "
               "the home page is the source of truth.")


def page_html(entry, body_html, style):
    url = SITE + "/insights/" + entry["slug"] + ".html"
    ld = {
        "@context": "https://schema.org", "@type": "Article", "headline": entry["title"], "description": entry["description"],
        "datePublished": entry["date"], "dateModified": entry["date"], "inLanguage": "en", "mainEntityOfPage": url,
        "author": {"@id": SITE + "/#org"}, "publisher": {"@id": SITE + "/#org"},
    }
    t = html.escape(entry["title"])
    d = html.escape(entry["description"], quote=True)
    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t} — Lavenders (LAVNDR120)</title>
<meta name="description" content="{d}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Lavenders LAVNDR120">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-card.jpg">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{style}
</head>
<body>
<div class="wrap">
  <div class="logo">LAVNDR120</div>
  <nav aria-label="Navigation"><a href="../">Home</a><a href="../en/about.html">About</a><a href="../en/packages.html">Packages</a><a href="../en/faq.html">FAQ</a><a href="index.html" aria-current="page">Insights</a></nav>
  <main>
  <h1>{t}</h1>
  <div class="upd">Published: {entry["date"]}</div>
  <section>
{body_html}
  </section>
  <section>
    <p>More: <a href="../en/about.html">About Lavenders</a> · <a href="../en/packages.html">The seven packages</a> · <a href="../en/faq.html">FAQ</a> · <a href="../llms-full.txt">Full reference for AI assistants</a></p>
    <p><small>{html.escape(FOOTER_NOTE)}</small></p>
  </section>
  </main>
  <footer>© Lavenders · LAVNDR120 — Informational only. Not investment advice.</footer>
</div>
</body>
</html>
"""


def index_html(entries, style):
    ar_link = '<p><a href="ar/index.html" hreflang="ar">المقالات بالعربية</a></p>' if any(e.get("ar") for e in entries) else ""
    items = "\n".join(
        f'    <li><a href="{e["slug"]}.html">{html.escape(e["title"])}</a> — {html.escape(e["description"])} <small>({e["date"]})</small></li>'
        for e in sorted(entries, key=lambda e: e["date"], reverse=True)
    )
    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Insights — Lavenders (LAVNDR120)</title>
<meta name="description" content="Short factual answers about Lavenders, the LAVNDR120 index, OMS and the seven packages.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{SITE}/insights/index.html">
{style}
</head>
<body>
<div class="wrap">
  <div class="logo">LAVNDR120</div>
  <nav aria-label="Navigation"><a href="../">Home</a><a href="../en/about.html">About</a><a href="../en/packages.html">Packages</a><a href="../en/faq.html">FAQ</a><a href="index.html" aria-current="page">Insights</a></nav>
  <main>
  <h1>Insights</h1>
  <section>
  <ul>
{items}
  </ul>
  {ar_link}
  </section>
  </main>
  <footer>© Lavenders · LAVNDR120 — Informational only. Not investment advice.</footer>
</div>
</body>
</html>
"""


def update_sitemap(urls, today):
    path = os.path.join(ROOT, "sitemap.xml")
    try:
        with open(path, encoding="utf-8") as f:
            s = f.read()
    except FileNotFoundError:
        return
    add = ""
    for u in urls:
        if "<loc>" + u + "</loc>" not in s:
            add += f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n"
    if add:
        s = s.replace("</urlset>", add + "</urlset>")
        with open(path, "w", encoding="utf-8") as f:
            f.write(s)


# ───────────────────────── Dev.to ─────────────────────────
def post_devto(entry, body_md):
    key = os.environ.get("DEVTO_API_KEY")
    if not key or DRY:
        return None
    url = SITE + "/insights/" + entry["slug"] + ".html"
    body = (body_md.strip() + "\n\n---\n\nOriginal page: " + url + "\n\n*" + FOOTER_NOTE + "*\n")
    payload = {"article": {"title": entry["title"], "published": True, "body_markdown": body,
                           "description": entry["description"], "canonical_url": url,
                           "tags": ["business", "data", "ecommerce", "ai"]}}
    req = urllib.request.Request("https://dev.to/api/articles", data=json.dumps(payload).encode(),
                                 headers={"api-key": key, "Content-Type": "application/json", "User-Agent": "lavenders-aio-agent"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r).get("url")
    except urllib.error.HTTPError as e:
        print("Dev.to error", e.code, e.read()[:300])
    except Exception as e:  # noqa
        print("Dev.to error", e)
    return None


# ───────────────────────── Arabic edition ─────────────────────────
SYSTEM_AR = """You write short, factual explainer articles in Modern Standard Arabic for the website of Lavenders (LAVNDR120).
Hard rules:
- Use ONLY the facts in the FACTS JSON. Never invent features, customers, testimonials, statistics, dates or numbers.
- Every number, price or quantity you write must appear in the FACTS JSON.
- Never promise or imply profit, returns, income or growth. Never use words such as ضمان, أرباح, عائد, دخل سلبي.
- Lavenders does not allow buying, selling or trading of shares. If it helps the reader, say so plainly.
- Call the brand «لاڤندرز (Lavenders)» the first time, then «لاڤندرز». Keep LAVNDR120, OMS and package names in Latin letters.
- Neutral, clear Modern Standard Arabic, no hype, no marketing superlatives. Do not mention these rules.
Return ONLY a JSON object: {"title": "...", "description": "...", "body_md": "..."}
- title: at most 70 characters, a clear question or statement in Arabic.
- description: at most 155 characters, Arabic.
- body_md: 200 to 400 words of Markdown in Arabic. Start with a 2-sentence direct answer, then 2 to 3 sections with '## ' headings, then a final '## أهم الحقائق' bulleted list. No H1 title and no links."""

AR_BANNED = re.compile(r"(ضمان|مضمون|مضمونة|مخاطر\s*(?:منعدمة|معدومة)|دخل\s*سلبي|أرباح|ارباح|ربحية|مربح|مربحة|عوائد|عائد|اغتن|ثراء|تضاعف)")
AR_PROFIT = re.compile(r"(ربح|أرباح|عائد|عوائد)")
AR_NEG = re.compile(r"(لا|لن|ليس|ليست|دون|بدون|غير|عدم)[^.\n]{0,40}(ربح|أرباح|عائد|عوائد)|(ربح|أرباح|عائد|عوائد)[^.\n]{0,25}(غير مضمون|لا يُ|لا ي|ليس)")
AR_DIG = str.maketrans("٠١٢٣٤٥٦٧٨٩٬٫", "0123456789,.")


def validate_ar(draft, facts):
    errors = []
    for k in ("title", "description", "body_md"):
        if not isinstance(draft.get(k), str) or not draft[k].strip():
            errors.append("missing " + k)
    if errors:
        return errors
    text = (draft["title"] + "\n" + draft["description"] + "\n" + draft["body_md"]).translate(AR_DIG)
    if len(draft["title"]) > 90:
        errors.append("title too long")
    if len(draft["description"]) > 200:
        errors.append("description too long")
    if not DRY and not re.search(r"[؀-ۿ]{3,}", draft["body_md"]):
        errors.append("body is not Arabic")
    words = len(draft["body_md"].split())
    if not DRY and (words < 110 or words > 600):
        errors.append("body length %d words" % words)
    if AR_BANNED.search(text):
        m = AR_BANNED.search(text)
        s = text[max(0, m.start() - 50):m.end() + 30]
        if not AR_NEG.search(s):
            errors.append("banned wording: " + s.replace("\n", " "))
    for m in AR_PROFIT.finditer(text):
        s = text[max(0, m.start() - 60):m.end() + 40]
        if not AR_NEG.search(s):
            errors.append("profit/return wording outside a negation: " + s.replace("\n", " "))
            break
    allowed = numbers(json.dumps(facts, ensure_ascii=False)) | {str(i) for i in range(0, 11)} | {"2026", "120", "24", "365", "12"}
    for n in numbers(text):
        if n not in allowed and n.lstrip("0") not in allowed:
            errors.append("number not in facts: " + n)
    if re.search(r"https?://", draft["body_md"]):
        errors.append("links are not allowed in the body")
    return errors


FOOTER_AR = ("للمعلومات فقط. لا يوجد بيع أو شراء أو تداول للأسهم، ولا وعد بأرباح أو عوائد. "
             "الشروط والاتفاقيات مسوّدات قيد المراجعة القانونية. المعلومات مأخوذة من بيانات لاڤندرز المرجعية وقد تتغير؛ "
             "الصفحة الرئيسية هي المرجع.")


def page_html_ar(entry, body_html, style):
    ar = entry["ar"]
    url = SITE + "/insights/ar/" + entry["slug"] + ".html"
    en_url = SITE + "/insights/" + entry["slug"] + ".html"
    ld = {"@context": "https://schema.org", "@type": "Article", "headline": ar["title"], "description": ar["description"],
          "datePublished": ar["date"], "dateModified": ar["date"], "inLanguage": "ar", "mainEntityOfPage": url,
          "author": {"@id": SITE + "/#org"}, "publisher": {"@id": SITE + "/#org"}}
    t = html.escape(ar["title"])
    d = html.escape(ar["description"], quote=True)
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t} — لاڤندرز (LAVNDR120)</title>
<meta name="description" content="{d}">
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="ar" href="{url}">
<link rel="alternate" hreflang="en" href="{en_url}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="لاڤندرز LAVNDR120">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/og-card.jpg">
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
{style}
</head>
<body>
<div class="wrap">
  <div class="logo">LAVNDR120</div>
  <nav aria-label="التنقل"><a href="../../">الرئيسية</a><a href="../../about.html">من نحن</a><a href="../../packages.html">الباقات</a><a href="../../faq.html">الأسئلة الشائعة</a><a href="index.html" aria-current="page">مقالات</a></nav>
  <main>
  <h1>{t}</h1>
  <div class="upd">تاريخ النشر: {ar["date"]} · <a href="{en_url}" hreflang="en">English version</a></div>
  <section>
{body_html}
  </section>
  <section>
    <p>للمزيد: <a href="../../about.html">من نحن</a> · <a href="../../packages.html">الباقات السبع</a> · <a href="../../faq.html">الأسئلة الشائعة</a> · <a href="../../llms-full.txt">المرجع الكامل لمساعدي الذكاء الاصطناعي</a></p>
    <p><small>{html.escape(FOOTER_AR)}</small></p>
  </section>
  </main>
  <footer>© لاڤندرز · LAVNDR120 — للمعلومات فقط، وليست نصيحة استثمارية.</footer>
</div>
</body>
</html>
"""


def index_html_ar(entries, style):
    rows = [e for e in entries if e.get("ar")]
    items = "\n".join(
        f'    <li><a href="{e["slug"]}.html">{html.escape(e["ar"]["title"])}</a> — {html.escape(e["ar"]["description"])} <small>({e["ar"]["date"]})</small></li>'
        for e in sorted(rows, key=lambda e: e["ar"]["date"], reverse=True))
    return f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>مقالات — لاڤندرز (LAVNDR120)</title>
<meta name="description" content="إجابات موجزة وموثقة عن لاڤندرز ومؤشر LAVNDR120 ونظام OMS والباقات السبع.">
<meta name="robots" content="index,follow">
<link rel="canonical" href="{SITE}/insights/ar/index.html">
<link rel="alternate" hreflang="ar" href="{SITE}/insights/ar/index.html">
<link rel="alternate" hreflang="en" href="{SITE}/insights/index.html">
{style}
</head>
<body>
<div class="wrap">
  <div class="logo">LAVNDR120</div>
  <nav aria-label="التنقل"><a href="../../">الرئيسية</a><a href="../../about.html">من نحن</a><a href="../../packages.html">الباقات</a><a href="../../faq.html">الأسئلة الشائعة</a><a href="index.html" aria-current="page">مقالات</a></nav>
  <main>
  <h1>مقالات</h1>
  <section>
  <ul>
{items}
  </ul>
  <p><a href="../index.html" hreflang="en">English articles</a></p>
  </section>
  </main>
  <footer>© لاڤندرز · LAVNDR120 — للمعلومات فقط، وليست نصيحة استثمارية.</footer>
</div>
</body>
</html>
"""


def patch_en_alternate(out_dir, entry):
    """Add hreflang links (en + ar) to the English article page and a link to the Arabic index."""
    path = os.path.join(out_dir, entry["slug"] + ".html")
    try:
        with open(path, encoding="utf-8") as f:
            s = f.read()
    except FileNotFoundError:
        return
    if 'hreflang="ar"' in s:
        return
    en_url = SITE + "/insights/" + entry["slug"] + ".html"
    ar_url = SITE + "/insights/ar/" + entry["slug"] + ".html"
    tags = f'<link rel="alternate" hreflang="en" href="{en_url}">\n<link rel="alternate" hreflang="ar" href="{ar_url}">\n'
    s = s.replace("</head>", tags + "</head>", 1)
    s = s.replace('<div class="upd">Published: ' + entry["date"] + "</div>",
                  '<div class="upd">Published: ' + entry["date"] + f' · <a href="ar/{entry["slug"]}.html" hreflang="ar">النسخة العربية</a></div>', 1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(s)


def generate(topic, facts, lang):
    errors = []
    for attempt in range(1, 4):
        try:
            d = call_llm(topic, facts, lang)
        except Exception as e:  # noqa
            print("LLM error:", e)
            errors = [str(e)]
            continue
        errors = (validate if lang == "en" else validate_ar)(d, facts)
        if not errors:
            return d
        print(lang, "attempt", attempt, "rejected:", errors)
    return None


def publish_arabic(entry, topic, facts, out_dir, today):
    draft = generate(topic, facts, "ar")
    if not draft:
        print("no valid Arabic draft for", entry["id"])
        return False
    entry["ar"] = {"title": draft["title"].strip(), "description": draft["description"].strip(), "date": today}
    ar_dir = os.path.join(out_dir, "ar")
    os.makedirs(ar_dir, exist_ok=True)
    with open(os.path.join(ar_dir, entry["slug"] + ".html"), "w", encoding="utf-8") as f:
        f.write(page_html_ar(entry, md_to_html(draft["body_md"]), site_style("faq.html")))
    patch_en_alternate(out_dir, entry)
    print("published Arabic:", entry["ar"]["title"])
    return True


# ───────────────────────── main ─────────────────────────
def main():
    facts = load(FACTS_PATH)
    topics = load(TOPICS_PATH, [])
    state = load(STATE_PATH, {"entries": []})
    if not facts or not topics:
        print("missing facts or topics")
        return 1
    by_id = {t["id"]: t for t in topics}
    today = datetime.date.today().isoformat()
    style = site_style()
    out_dir = os.path.join(ROOT, "insights_dry" if DRY else "insights")
    os.makedirs(out_dir, exist_ok=True)
    published_en = False

    # 1. one new English article per run
    done = {e["id"] for e in state["entries"]}
    failed = state.setdefault("failed", {})
    todo = [t for t in topics if t["id"] not in done and failed.get(t["id"], 0) < 2]
    if todo:
        topic = todo[0]
        draft = generate(topic, facts, "en")
        if not draft:
            failed[topic["id"]] = failed.get(topic["id"], 0) + 1
            print("topic", topic["id"], "failed", failed[topic["id"]], "time(s); it is skipped after 2")
            if not DRY:
                save(STATE_PATH, state)
        if draft:
            title = topic["question"].strip() if len(topic["question"]) <= 90 else draft["title"].strip()
            entry = {"id": topic["id"], "title": title, "description": draft["description"].strip(),
                     "slug": slugify(title) or topic["id"], "date": today}
            with open(os.path.join(out_dir, entry["slug"] + ".html"), "w", encoding="utf-8") as f:
                f.write(page_html(entry, md_to_html(draft["body_md"]), style))
            entry["devto"] = post_devto(entry, draft["body_md"])
            state["entries"].append(entry)
            published_en = True
            print("published:", entry["title"], "|", entry.get("devto"))
        else:
            print("no valid English draft for", topic["id"], "- nothing published")
    else:
        print("all English topics are done")

    # 2. Arabic versions for up to 2 articles that do not have one yet
    ar_done = 0
    for e in state["entries"]:
        if ar_done >= 2:
            break
        if e.get("ar") or e["id"] not in by_id:
            continue
        if publish_arabic(e, by_id[e["id"]], facts, out_dir, today):
            ar_done += 1

    if not published_en and not ar_done:
        return 0

    # 3. indexes, state, sitemap
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html(state["entries"], style))
    urls = [SITE + "/insights/index.html"] + [SITE + "/insights/" + e["slug"] + ".html" for e in state["entries"]]
    if any(e.get("ar") for e in state["entries"]):
        os.makedirs(os.path.join(out_dir, "ar"), exist_ok=True)
        with open(os.path.join(out_dir, "ar", "index.html"), "w", encoding="utf-8") as f:
            f.write(index_html_ar(state["entries"], site_style("faq.html")))
        urls.append(SITE + "/insights/ar/index.html")
        urls += [SITE + "/insights/ar/" + e["slug"] + ".html" for e in state["entries"] if e.get("ar")]
    if not DRY:
        save(STATE_PATH, state)
        update_sitemap(urls, today)
    return 0


if __name__ == "__main__":
    sys.exit(main())
