#!/usr/bin/env python3
"""Lavenders monitor agent.

Runs daily on GitHub Actions. Checks that the public surface is healthy:
site, sitemap URLs, agent files, the MCP server (tools + read-only annotations), the JSON API,
and the official MCP Registry entry. If something is wrong it opens (or updates) ONE GitHub issue
labelled "monitor"; when everything is healthy again it comments and closes that issue.
GitHub emails the repository owner about issues, so no extra service is needed.

Run with --local-report to only print the report (no issue is created).
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request

SITE = os.environ.get("MON_SITE", "https://lavndrs120.github.io")
WORKER = os.environ.get("MON_WORKER", "https://lavndr.omssolutionorders.workers.dev")
REGISTRY = os.environ.get("MON_REGISTRY", "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.lavndrs120/lavenders")
LOCAL = "--local-report" in sys.argv
UA = {"User-Agent": "lavenders-monitor/1.0"}


def get(url, data=None, headers=None, timeout=25):
    h = dict(UA)
    h.update(headers or {})
    req = urllib.request.Request(url, data=data, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:  # noqa
        return 0, str(e)


problems, warnings, oks = [], [], []


def check(name, ok, detail="", warn=False):
    if ok:
        oks.append(name)
    elif warn:
        warnings.append(name + (": " + detail if detail else ""))
    else:
        problems.append(name + (": " + detail if detail else ""))


# 1. site home
st, body = get(SITE + "/")
check("Home page", st == 200 and "LAVNDR120" in body, "status %s" % st)

# 2. sitemap and every URL in it
st, sm = get(SITE + "/sitemap.xml")
urls = re.findall(r"<loc>([^<]+)</loc>", sm) if st == 200 else []
check("sitemap.xml", st == 200 and len(urls) >= 10, "status %s, %d urls" % (st, len(urls)))
bad = []
for u in urls:
    s, _ = get(u)
    if s != 200:
        bad.append("%s (%s)" % (u.replace(SITE, ""), s))
check("Sitemap URLs return 200", not bad, ", ".join(bad[:8]) + (" ..." if len(bad) > 8 else ""))

# 3. agent files
for path in ["/llms.txt", "/llms-full.txt", "/openapi.json", "/.well-known/agent-card.json", "/.well-known/mcp.json", "/insights/", "/robots.txt"]:
    s, _ = get(SITE + path)
    check("File " + path, s == 200, "status %s" % s)

# 4. MCP server: tools/list
payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}).encode()
st, body = get(WORKER + "/mcp", data=payload, headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"})
tools = []
try:
    tools = json.loads(body).get("result", {}).get("tools", [])
except Exception:  # noqa
    pass
check("MCP tools/list", st == 200 and len(tools) == 5, "status %s, %d tools" % (st, len(tools)))
check("MCP tools are read-only annotated", tools and all((t.get("annotations") or {}).get("readOnlyHint") is True for t in tools), "missing readOnlyHint")

# 5. JSON API
st, body = get(WORKER + "/api/index")
ok = False
try:
    j = json.loads(body)
    ok = j.get("available") is True and bool(j.get("netAssetValueUSD"))
except Exception:  # noqa
    pass
check("API /api/index (live card)", st == 200 and ok, "status %s" % st)
st, body = get(WORKER + "/api/packages")
n = 0
try:
    j = json.loads(body)
    n = len(j.get("packages", j if isinstance(j, list) else []))
except Exception:  # noqa
    pass
check("API /api/packages", st == 200 and n == 7, "status %s, %d packages" % (st, n))

# 6. official MCP Registry (warning only: it is a third-party service)
st, body = get(REGISTRY)
found = False
try:
    j = json.loads(body)
    found = "io.github.lavndrs120/lavenders" in json.dumps(j)
except Exception:  # noqa
    pass
check("Official MCP Registry entry", st == 200 and found, "status %s" % st, warn=True)

# ───────── report ─────────
lines = ["Lavenders monitor report", ""]
if problems:
    lines += ["PROBLEMS (%d):" % len(problems)] + ["- " + p for p in problems] + [""]
if warnings:
    lines += ["WARNINGS (%d):" % len(warnings)] + ["- " + w for w in warnings] + [""]
lines += ["OK (%d): %s" % (len(oks), "; ".join(oks))]
report = "\n".join(lines)
print(report)


# ───────── GitHub issue ─────────
def gh(method, path, body=None):
    token = os.environ.get("GITHUB_TOKEN")
    repo = os.environ.get("GITHUB_REPOSITORY")
    req = urllib.request.Request(
        "https://api.github.com/repos/%s%s" % (repo, path),
        data=json.dumps(body).encode() if body is not None else None, method=method,
        headers={"Authorization": "Bearer " + token, "Accept": "application/vnd.github+json", "User-Agent": "lavenders-monitor"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        print("GitHub API error", e.code, e.read()[:200])
        return None


def main():
    if LOCAL or not os.environ.get("GITHUB_TOKEN"):
        return 1 if problems else 0
    issues = gh("GET", "/issues?state=open&labels=monitor&per_page=5") or []
    existing = issues[0] if issues else None
    if problems or warnings:
        title = "Monitor: %d problem(s), %d warning(s)" % (len(problems), len(warnings))
        if not problems and existing is None:
            return 0  # warnings alone never open an issue
        if existing:
            gh("PATCH", "/issues/%d" % existing["number"], {"title": title, "body": report})
        elif problems:
            gh("POST", "/issues", {"title": title, "body": report, "labels": ["monitor"]})
    elif existing:
        gh("POST", "/issues/%d/comments" % existing["number"], {"body": "All checks pass again.\n\n" + report})
        gh("PATCH", "/issues/%d" % existing["number"], {"state": "closed"})
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
