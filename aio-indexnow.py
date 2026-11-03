#!/usr/bin/env python3
"""Tell IndexNow (Bing, Yandex, etc.) about every URL in sitemap.xml. No secrets: the key is public by design."""
import json, re, urllib.request
SITE = "https://lavndrs120.github.io"
KEY = "ed02c39817ff05d7819e745d9befdf8c"
sm = open("sitemap.xml", encoding="utf-8").read()
urls = re.findall(r"<loc>([^<]+)</loc>", sm)
payload = {"host": "lavndrs120.github.io", "key": KEY, "keyLocation": SITE + "/" + KEY + ".txt", "urlList": urls}
req = urllib.request.Request("https://api.indexnow.org/indexnow", data=json.dumps(payload).encode(),
                             headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "lavenders-indexnow"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print("IndexNow status", r.status, "urls", len(urls))
except Exception as e:
    print("IndexNow notice:", e)
