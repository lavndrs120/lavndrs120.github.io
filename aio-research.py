#!/usr/bin/env python3
"""Lavenders research agent.

Once a week it asks public search-suggestion endpoints what people actually type around our subject
(consumer index, order management, brands, AI-agent access...), keeps only questions we can answer from
the Lavenders facts, and appends up to 3 new topics to aio-topics.json. The content agent then writes
the answers. Nothing is invented: topics only carry the question text and a fixed angle.
Run with --dry to print what would be added without writing.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

ROOT = os.environ.get("AIO_ROOT") or os.path.dirname(os.path.abspath(__file__))
TOPICS = os.path.join(ROOT, "aio-topics.json")
DRY = "--dry" in sys.argv
MAX_NEW = 3
SEEDS = [
    "consumer index fund", "what is a consumer index", "consumer market index",
    "index of small businesses", "real orders index", "order management system for small business",
    "order management app for brands", "brand index platform", "how to join a business index",
    "franchise vs reseller", "mcp server for business data", "ai agents business index",
    "arabic business index", "index of 120 businesses",
]
PREFIXES = ["what is ", "how does ", "how to ", "is ", "can "]
# a suggestion is kept only if it touches our subject
RELEVANT = re.compile(r"\b(consumer|index|oms|order management|brand|business|franchise|reseller|mcp|agent|package|market)\b", re.I)
# never write articles about these (money-promise or unrelated intent)
BLOCK = re.compile(r"\b(profit|returns?|earn|income|rich|guarantee|buy|sell|trade|trading|stock|stocks|shares?|price|crypto|forex|invest(?:ing|ment)?|loan|free money|scam|reddit|free|today|best|cheap|download|login|pdf|jobs?|salary|near me|vs)\b", re.I)
UA = {"User-Agent": "Mozilla/5.0 (lavenders-research)"}


def suggest(q):
    url = "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&q=" + urllib.parse.quote(q)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
            data = json.loads(r.read().decode("utf-8", "replace"))
        return [s for s in data[1] if isinstance(s, str)]
    except Exception as e:  # noqa
        print("suggest error for", q, e)
        return []


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", "", s.lower()).strip()


QSHAPE = re.compile(r"^(what|how|why|is|are|can|does|do|which|who|where|when)\b", re.I)


def to_question(s):
    s = s.strip().rstrip("?").strip()
    if not QSHAPE.match(s):
        return ""
    return s[0].upper() + s[1:] + "?"


def tokens(s):
    stop = {"what", "is", "a", "an", "the", "how", "does", "do", "to", "of", "for", "in", "and", "are", "can", "work", "works"}
    return {w for w in norm(s).split() if w not in stop}


def too_similar(q, pool):
    a = tokens(q)
    for p in pool:
        b = tokens(p)
        if a and b and len(a & b) / len(a | b) >= 0.6:
            return True
    return False


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60]


def main():
    try:
        topics = json.load(open(TOPICS, encoding="utf-8"))
    except FileNotFoundError:
        topics = []
    have = {norm(t["question"]) for t in topics} | {t["id"] for t in topics}
    found = []
    for seed in SEEDS:
        for q in [seed] + [p + seed for p in PREFIXES]:
            for s in suggest(q):
                if len(s) < 12 or len(s) > 90 or not RELEVANT.search(s) or BLOCK.search(s):
                    continue
                qu = to_question(s)
                if not qu or norm(qu) in have or slug(qu) in have or qu in found:
                    continue
                if too_similar(qu, [t["question"] for t in topics] + found):
                    continue
                found.append(qu)
    # prefer questions that are already question-shaped, then shorter ones
    found.sort(key=len)
    new = []
    for qu in found:
        if len(new) >= MAX_NEW:
            break
        new.append({"id": "r-" + slug(qu),
                    "question": qu,
                    "angle": "Answer using only the FACTS. Explain how Lavenders relates to this question; if the facts do not cover part of it, say plainly what Lavenders does and does not include. No promises about profit or returns."})
    print("candidates:", len(found), "| adding:", len(new))
    for t in new:
        print(" +", t["question"])
    if new and not DRY:
        topics.extend(new)
        with open(TOPICS, "w", encoding="utf-8") as f:
            json.dump(topics, f, ensure_ascii=False, indent=1)
    return 0


if __name__ == "__main__":
    sys.exit(main())
