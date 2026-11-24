#!/usr/bin/env python3
"""Turn a class schedule exported as an .ics file (AntAlmanac and most schedule planners can) into the two snippets a new quarter needs in content/content.js.

Usage:  python3 scripts/quarter_from_ics.py "2027 Spring.ics" --id s27 --name "Spring 2027" --year "Year 2 (2026-27)"

Prints:
  1. a TERMS entry (the quarter's dates and classes, with instructor and meeting times), and
  2. TODO entries for the final exams.
Paste each where the comment on it says. Nothing is written to the site by this script.

The start date is the first class meeting and the end date is the last final. Course titles in the export are
abbreviated ("DES&ANALYS OF ALGOR"), so the script uses the full title from LATER when the class is already in the plan.
"""
import argparse, json, pathlib, re, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import content
DEPT = [(re.escape(k), v) for k, v in (content.load().get("school", {}).get("depts") or {}).items()]  # how the registrar's names are shortened: school.depts in the content
DAYS = {"MO": "Mon", "TU": "Tue", "WE": "Wed", "TH": "Thu", "FR": "Fri", "SA": "Sat", "SU": "Sun"}

def short(name):
    for long, s in DEPT: name = re.sub("^" + long + r"\b", s, name)
    return name

def clock(hhmm):
    h, m = int(hhmm[:2]), hhmm[2:4]
    return f"{(h + 11) % 12 + 1}:{m}", ("AM" if h < 12 else "PM")

def span(a, b):
    (t1, p1), (t2, p2) = clock(a), clock(b)
    return f"{t1} to {t2} {p2}" if p1 == p2 else f"{t1} {p1} to {t2} {p2}"

def events(text):
    text = re.sub(r"\r?\n[ \t]", "", text)
    for block in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", text, re.S):
        get = lambda k: (re.search(r"^" + k + r"[^:\n]*:(.*)$", block, re.M) or [None, ""])[1].strip().replace("\\,", ",").replace("\\n", "\n")
        yield {"summary": get("SUMMARY"), "start": get("DTSTART"), "end": get("DTEND"), "desc": get("DESCRIPTION"), "where": get("LOCATION"), "rule": get("RRULE")}

def plan_titles():
    try:
        import sys; sys.path.insert(0, str(ROOT / "scripts")); import content
        later = content.load()["later"]
    except Exception: return {}
    return {c["code"]: c["title"] for y in later["years"] for q in y["quarters"] for c in q["courses"]}

ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
ap.add_argument("ics"); ap.add_argument("--id", required=True, help='short id, such as s27'); ap.add_argument("--name", required=True, help='such as "Spring 2027"'); ap.add_argument("--year", required=True, help='such as "Year 2 (2026-27)"')
a = ap.parse_args()

titles, classes, finals, first, last = plan_titles(), {}, [], None, None
for e in events(pathlib.Path(a.ics).read_text(encoding="utf-8")):
    m = re.match(r"(.+?) (Final Exam|Lec|Dis|Lab|Sem|Stu|Tut|Act|Res|Fld|Col|Qiz)$", e["summary"])
    if not m: continue
    code, kind, day, t1, t2 = short(m[1]), m[2], e["start"][:8], e["start"][9:13], e["end"][9:13]
    iso = f"{day[:4]}-{day[4:6]}-{day[6:]}"
    c = classes.setdefault(code, {"code": code, "title": titles.get(code) or e["desc"].split("\n")[0].replace("Final Exam for ", "").title(), "meets": [], "times": []})
    if kind == "Final Exam":
        t, p = clock(t1); finals.append((iso, t1, code, f"{t} {p}")); last = max(last or iso, iso)
    else:
        first = min(first or iso, iso)
        order = list(DAYS)  # Monday first
        byday = sorted((d for d in (re.search(r"BYDAY=([A-Z,]+)", e["rule"]) or [None, ""])[1].split(",") if d), key=order.index)
        days = " ".join(DAYS[d] for d in byday)
        c["meets"].append(f"{kind} {days} {span(t1, t2)}" + (f", {e['where']}" if e["where"] else "") + ".")
        nums = [["SU", "MO", "TU", "WE", "TH", "FR", "SA"].index(d) for d in byday]
        c["times"].append([kind, nums, f"{t1[:2]}:{t1[2:]}", f"{t2[:2]}:{t2[2:]}", e["where"]])
        prof = re.search(r"Taught by (?:STAFF/)*([A-Z' -]+?),", e["desc"])
        if prof and kind == "Lec": c["prof"] = prof[1].title()

import datetime
_f = datetime.date.fromisoformat(min(f[0] for f in finals)) if finals else datetime.date.fromisoformat(last)
last_class = (_f - datetime.timedelta(days=(_f.weekday() - 4) % 7 or 7)).isoformat()  # the Friday before the first final
print(f"/* 1. Add to terms in content/content.js, after the previous quarter. */")
print(f' {{"id":{json.dumps(a.id)},"name":{json.dumps(a.name)},"year":{json.dumps(a.year)},"start":"{first}","end":"{last}","lastClass":"{last_class}","classes":[')
rows = []
for c in sorted(classes.values(), key=lambda c: c["code"]):
    row = {"code": c["code"], "title": c["title"]}
    if c.get("prof"): row["prof"] = c["prof"]
    if c["meets"]: row["meets"] = " ".join(c["meets"])
    if c["times"]: row["times"] = c["times"]
    rows.append("  " + json.dumps(row, ensure_ascii=False, separators=(",", ":")))
print(",\n".join(rows) + "\n ]}")
print(f"\n/* 2. Add to todo in content/content.js. */")
for iso, _, code, when in sorted(finals):
    slug = re.sub(r"[^a-z0-9]+", "", code.lower())
    print(" " + json.dumps({"id": f"td-{slug}-final-{a.id}", "a": "classes", "cls": code, "t": "Final exam", "due": iso, "time": when}, separators=(",", ":")) + ",")
missing = [c for c in classes if c not in titles]
if missing: print(f"\n/* Not in LATER yet, so add them there too (title, value, project, learn, desc, pre): {', '.join(sorted(missing))} */")
