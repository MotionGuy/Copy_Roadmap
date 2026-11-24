#!/usr/bin/env python3
"""Fill the Projects page from the project notes in the CS Vault (the Obsidian vault kept in Google Drive).

Reads every Projects/<Project>/<Project>.md in the vault and updates the matching entry under works in content/content.js,
or adds one. Projects that are only on the site are left alone, and so are the log and the write-up: only the
facts at the top of the main file, its summary and its bullets are read.

Usage:  python3 scripts/projects_from_vault.py "~/My Drive/CS Vault"            (add --dry to only show what would change)

The main file starts with these facts (unknown ones left empty), then a short summary, then "## Resume Bullets":
  kind (class | personal | work | club), class, status (planned | in progress | finished), start and end (YYYY-MM),
  stack, skills, team, org, role, github, drive, demo, page (its portfolio page), public, roadmap (the id on this site)
"""
import pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import content

MONTHS = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
STATUS = {"in progress": "active", "finished": "done"}
def value(s):
    s = s.split(" #")[0].strip()
    if s.startswith("[") and s.endswith("]"): return [x.strip().strip("\"'") for x in s[1:-1].split(",") if x.strip()]
    return s.strip("\"'")

def read_note(path):
    text = path.read_text(encoding="utf-8")
    m = re.match(r"---\n(.*?)\n---\n?(.*)", text, re.S)
    if not m: return None
    facts = {k.strip(): value(v) for k, v in (line.split(":", 1) for line in m.group(1).splitlines() if ":" in line and not line.startswith("#"))}
    body = m.group(2)
    summary = " ".join(l.strip() for l in body.split("\n## ")[0].splitlines() if l.strip() and not l.startswith("#"))
    sec = re.search(r"^## Resume Bullets\s*\n(.*?)(?=^## |\Z)", body, re.S | re.M)
    bullets = [l.strip()[2:].strip() for l in (sec.group(1) if sec else "").splitlines() if l.strip().startswith(("- ", "* "))]
    return facts, summary, bullets

def month(s): y, m = s.split("-")[:2]; return f"{MONTHS[int(m) - 1]} {y}"
def when(start, end): return "" if not start else f"{month(start)} to {month(end) if end else 'present'}"

def entry(name, facts, summary, bullets, old):
    e = dict(old or {"id": facts.get("roadmap") or "wk-" + re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-"), "org": "", "role": "", "where": ""})
    e.update({"kind": facts.get("kind") or e.get("kind", "personal"), "title": facts.get("title") or name, "status": STATUS[facts["status"]],
              "stack": facts.get("stack") or [], "summary": summary, "bullets": bullets, "public": facts.get("public") == "true"})
    if facts.get("start"): e["start"] = facts["start"][:7] + "-01"; e["when"] = facts.get("when") or when(facts["start"], facts.get("end"))
    for src, dst in [("class", "cls"), ("org", "org"), ("role", "role"), ("team", "team"), ("skills", "skills"), ("github", "github"), ("drive", "drive"), ("demo", "demo"), ("page", "page"), ("plan", "plan")]:
        if facts.get(src): e[dst] = facts[src]
        elif dst in ("github", "drive", "demo", "page", "skills", "team"): e.pop(dst, None)
    return e

def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args: sys.exit(__doc__)
    folder = pathlib.Path(args[0]).expanduser() / "Projects"
    if not folder.is_dir(): sys.exit(f"No Projects folder in {folder.parent}")
    data = content.load(); works = data["works"]
    for d in sorted(p for p in folder.iterdir() if p.is_dir()):
        note = d / f"{d.name}.md"
        got = note.is_file() and read_note(note)
        if not got: print(f"  skipped  {d.name}: no main file with facts at the top"); continue
        facts, summary, bullets = got
        if facts.get("status") not in STATUS: print(f"  skipped  {d.name}: status is {facts.get('status') or 'empty'} (only in progress and finished are listed)"); continue
        old = next((w for w in works if w["id"] == facts.get("roadmap")), None)
        new = entry(d.name, facts, summary, bullets, old)
        if old: works[works.index(old)] = new
        else: works.append(new)
        print(f"  {'updated' if old else 'added  '}  {d.name} ({new['id']})")
    if "--dry" in sys.argv: print("Dry run: content/content.js not changed."); return
    content.save(data)
    print("content/content.js updated. Run python3 scripts/check.py next.")

if __name__ == "__main__": main()
