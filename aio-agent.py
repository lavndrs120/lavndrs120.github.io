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
- body_md: 350 to 600 words of Markdown. Start with a 2-sentence direct answer, then 2 to 4 sections with '## ' headings, then a '## Key facts' bulleted list. No H1 title and no links (links are added automatically)."""


def call_llm(topic, facts):
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
    user = "FACTS:\n" + json.dumps(facts, ensure_ascii=False) + "\n\nQUESTION: " + topic["question"] + "\nANGLE: " + topic["angle"]
    payload = {
        "model": MODEL,
        "temperature": 0.3,
        "response_format": {"type": "json_object"},
        "messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
    }
    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer " + key, "Content-Type": "application/json", "User-Agent": "lavenders-aio-agent"},
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        out = json.load(r)
    return json.loads(out["choices"][0]["message"]["content"])


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
    if not DRY and (words < 200 or words > 900):
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


def site_style():
    try:
        with open(os.path.join(ROOT, "en", "faq.html"), encoding="utf-8") as f:
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


# ───────────────────────── main ─────────────────────────
def main():
    facts = load(FACTS_PATH)
    topics = load(TOPICS_PATH, [])
    state = load(STATE_PATH, {"entries": []})
    if not facts or not topics:
        print("missing facts or topics")
        return 1
    done = {e["id"] for e in state["entries"]}
    todo = [t for t in topics if t["id"] not in done]
    if not todo:
        print("all topics are done")
        return 0
    topic = todo[0]
    draft, errors = None, []
    for attempt in range(1, 4):
        try:
            d = call_llm(topic, facts)
        except Exception as e:  # noqa
            print("LLM error:", e)
            errors = [str(e)]
            continue
        errors = validate(d, facts)
        if not errors:
            draft = d
            break
        print("attempt", attempt, "rejected:", errors)
    if not draft:
        print("no valid draft for", topic["id"], "- nothing published")
        return 1
    today = datetime.date.today().isoformat()
    entry = {"id": topic["id"], "title": draft["title"].strip(), "description": draft["description"].strip(),
             "slug": slugify(draft["title"]) or topic["id"], "date": today}
    style = site_style()
    out_dir = os.path.join(ROOT, "insights")
    if DRY:
        out_dir = os.path.join(ROOT, "insights_dry")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, entry["slug"] + ".html"), "w", encoding="utf-8") as f:
        f.write(page_html(entry, md_to_html(draft["body_md"]), style))
    entry["devto"] = post_devto(entry, draft["body_md"])
    state["entries"].append(entry)
    if not DRY:
        save(STATE_PATH, state)
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html(state["entries"], style))
    if not DRY:
        update_sitemap([SITE + "/insights/index.html"] + [SITE + "/insights/" + e["slug"] + ".html" for e in state["entries"]], today)
    print("published:", entry["title"], "|", entry.get("devto"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
