#!/usr/bin/env python3
"""Check the site's content and code for the mistakes that are easy to make by hand.

Usage:  python3 scripts/check.py        (reads content/content.js, or content/sample.js when there is none)

Content (content/content.js):
  - every id is unique, and dates are real YYYY-MM-DD dates
  - class codes match between TERMS, TODO, LATER and STUDY, and every "pre" points at a known class
  - study guide files exist under study/
  - quarters in TERMS are in order and do not overlap
Code:
  - every script parses
  - styles in css/site.css that no page uses, and functions in the scripts that nothing calls
  - em dashes anywhere (the site avoids them)
Exits with status 1 if anything is wrong, so it can gate a commit.
"""
import datetime, json, pathlib, re, subprocess, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import content

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCRIPTS = ["config.js", "js/data.js", "js/app.js", "js/day.js", "js/work.js", "js/school.js", "js/home.js", "js/scene.js", "js/boot.js", "api/ics.js", "api/weather.js"]
SCRIPTS = [f for f in SCRIPTS if (ROOT / f).is_file() or f not in ("js/scene.js", "api/weather.js")]  # the backdrop and its weather are optional
problems, notes = [], []

def read(rel): return (ROOT / rel).read_text(encoding="utf-8")

def load_data():
    """The content file as plain JSON, with each section under the capital name the scripts use for it."""
    return {k.upper(): v for k, v in content.load().items()}

def is_date(s):
    try: datetime.date.fromisoformat(s); return isinstance(s, str) and len(s) == 10
    except Exception: return False

def walk(x, path=""):
    """Every dict in the data, with a readable path to it."""
    if isinstance(x, dict):
        yield path, x
        for k, v in x.items(): yield from walk(v, f"{path}.{k}" if path else k)
    elif isinstance(x, list):
        for i, v in enumerate(x): yield from walk(v, f"{path}[{i}]")

# ---------- code parses ----------
for f in SCRIPTS:
    r = subprocess.run(["node", "--check", f], cwd=ROOT, capture_output=True, text=True)
    if r.returncode: problems.append(f"{f} does not parse: {r.stderr.strip().splitlines()[0] if r.stderr.strip() else ''}")
if problems: print("\n".join(problems)); sys.exit(1)

D = load_data()

# ---------- ids and dates ----------
seen = {}
for path, d in walk(D):
    for key in ("id", "sun"):
        if isinstance(d.get(key), str):
            if d[key] in seen: problems.append(f"duplicate id \"{d[key]}\" at {path} and {seen[d[key]]}")
            seen[d[key]] = path
    for key in ("due", "start", "end", "made"):
        if key in d and d[key] is not None and not is_date(d[key]) and not (key == "due" and path.startswith("APPS")):
            problems.append(f"{path}.{key} is not a YYYY-MM-DD date: {d[key]!r}")

# ---------- class codes line up ----------
plan = {c["code"]: q["q"] for y in D["LATER"]["years"] for q in y["quarters"] for c in q["courses"]}
dupes = [c["code"] for y in D["LATER"]["years"] for q in y["quarters"] for c in q["courses"]]
for code in sorted({c for c in dupes if dupes.count(c) > 1}): problems.append(f"LATER lists {code} more than once")
for t in D["TERMS"]:
    for c in t["classes"]:
        if c["code"] not in plan: problems.append(f"TERMS {t['name']}: {c['code']} is not in LATER")
        elif plan[c["code"]] != t["name"]: problems.append(f"TERMS {t['name']}: {c['code']} is under {plan[c['code']]} in LATER")
for a, b in zip(D["TERMS"], D["TERMS"][1:]):
    if not a["start"] <= a["end"] < b["start"]: problems.append(f"TERMS: {a['name']} and {b['name']} are out of order or overlap")
term_codes = {c["code"] for t in D["TERMS"] for c in t["classes"]}
for x in D["TODO"]:
    if x.get("cls") and x["cls"] not in term_codes: notes.append(f"TODO {x['id']}: class \"{x['cls']}\" is not in any TERMS quarter, so it gets no card at the top of To-Do")
for y in D["LATER"]["years"]:
    for q in y["quarters"]:
        for c in q["courses"]:
            for pre in c.get("pre") or []:
                if pre not in plan: notes.append(f"LATER {c['code']}: builds on {pre}, which is not in the plan (shown grayed out)")
            for key in ("title", "value", "project", "learn", "desc"):
                if not c.get(key): problems.append(f"LATER {c['code']} has no \"{key}\"")
for g in D["STUDY"]:
    if g["cls"] not in plan: notes.append(f"STUDY {g['id']}: class \"{g['cls']}\" is not in LATER, so it is filed by the date it was made")
    for key in ("file", "sheetFile"):
        if g.get(key) and not (ROOT / g[key]).exists(): problems.append(f"STUDY {g['id']}: {g[key]} does not exist")
    if not (g.get("file") or g.get("url")): problems.append(f"STUDY {g['id']} has neither a file nor a url")
req_codes = {c for grp in D["REQS"]["groups"] for r in grp["rows"] for c in (r.get("all") or [])}
for c in sorted(req_codes - set(plan) - set(D["CREDIT"])): notes.append(f"REQS needs {c}, which is neither in the plan nor in CREDIT (shows as \"Not in your plan\")")

# ---------- unused styles and functions ----------
code = "".join(read(f) for f in ("js/app.js", "js/day.js", "js/work.js", "js/school.js", "js/home.js", "js/scene.js", "js/boot.js") if f in SCRIPTS)
everything = code + read("js/data.js") + content.FILE.read_text(encoding="utf-8") + read("index.html")
css = re.sub(r"/\*.*?\*/", "", read("css/site.css"), flags=re.S)
css = re.sub(r"url\([^)]*\)", "", css)  # an address inside url(...) is not a class name
built = ("st-", "rq-", "fa-")  # class names put together in code, such as st-taken, so they never appear whole
for c in sorted(set(re.findall(r"\.([a-zA-Z][\w-]*)", css))):
    if c.startswith(built) or re.fullmatch(r"\d.*|[0-9a-f]+", c): continue
    if not re.search(r"(?<![\w-])" + re.escape(c) + r"(?![\w-])", everything): notes.append(f"css: .{c} is not used by any page")
for f in ("js/app.js", "js/school.js"):
    for name in re.findall(r"^(?:async )?(?:function|const|let) ([A-Za-z_][\w]*)", read(f), re.M):
        if len(re.findall(r"(?<![\w$.])" + re.escape(name) + r"(?![\w$])", code)) < 2: notes.append(f"{f}: {name} is defined but never used")
for name in D:
    if name != "SCHEMA" and not re.search(r"\b" + name + r"\b", code): notes.append(f"content: {name.lower()} is not read by any script")
for name in re.findall(r"\b([A-Z_]+) = content\.", read("js/data.js")):
    if name not in D: notes.append(f"content: no {name.lower()} section (the page that reads it will be empty)")

# ---------- house style ----------
for f in SCRIPTS + ["css/site.css", "index.html", "README.md", "CLAUDE.md"]:
    n = read(f).count("—")
    if n: problems.append(f"{f} has {n} em dash(es)")

for n in notes: print("note:", n)
for p in problems: print("PROBLEM:", p)
print(f"\n{len(seen)} ids, {len(plan)} classes, {len(D['STUDY'])} study guides checked. " + ("No problems." if not problems else f"{len(problems)} problem(s)."))
sys.exit(1 if problems else 0)
