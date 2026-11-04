#!/usr/bin/env python3
"""Adds the Cloudflare Web Analytics beacon (cookie-free) to every public HTML page that does not have it yet.
Idempotent: pages that already carry the beacon are left untouched. The token is public by design."""
import os
import sys

TOKEN = "d361bba7041d4a1bbc4d5aba1003356b"
SNIPPET = ("<!-- Cloudflare Web Analytics --><script defer src='https://static.cloudflareinsights.com/beacon.min.js' "
           "data-cf-beacon='{\"token\": \"%s\"}'></script><!-- End Cloudflare Web Analytics -->\n" % TOKEN)
ROOT = os.environ.get("AIO_ROOT") or os.path.dirname(os.path.abspath(__file__))
SKIP_DIRS = {".git", ".github", "node_modules", "insights_dry"}
SKIP_FILES = {"admin.html"}
changed = 0
for d, dirs, files in os.walk(ROOT):
    dirs[:] = [x for x in dirs if x not in SKIP_DIRS]
    for f in files:
        if not f.endswith(".html") or f in SKIP_FILES:
            continue
        p = os.path.join(d, f)
        try:
            s = open(p, encoding="utf-8").read()
        except Exception:  # noqa
            continue
        if "cloudflareinsights.com" in s or "</body>" not in s:
            continue
        i = s.rindex("</body>")
        open(p, "w", encoding="utf-8").write(s[:i] + SNIPPET + s[i:])
        changed += 1
print("analytics beacon added to", changed, "page(s)")
sys.exit(0)
