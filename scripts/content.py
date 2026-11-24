"""Read and write the site's content file (content/content.js) from the helper scripts.

The file is one line of JavaScript around plain JSON:  const CONTENT = { ... };
so it loads in the browser as a script and here as JSON. Every section is described in content/README.md.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FILE = ROOT / "content" / "content.js"
if not FILE.exists(): FILE = ROOT / "content" / "sample.js"   # no content yet: the helper scripts fall back to the sample
HEAD, TAIL = "const CONTENT = ", ";\n"

def load(path=FILE):
    text = pathlib.Path(path).read_text(encoding="utf-8").strip()
    return json.loads(text[len(HEAD):].rstrip(";"))

def _fmt(v, depth, width=150):
    flat = json.dumps(v, ensure_ascii=False)
    if not isinstance(v, (dict, list)) or not v or len(flat) + depth <= width and not any(isinstance(x, dict) for x in (v.values() if isinstance(v, dict) else v)): return flat
    pad, end = "\n" + " " * (depth + 1), "\n" + " " * depth
    if isinstance(v, dict): return "{" + pad + ("," + pad).join(json.dumps(k, ensure_ascii=False) + ": " + _fmt(x, depth + 1, width) for k, x in v.items()) + end + "}"
    return "[" + pad + ("," + pad).join(_fmt(x, depth + 1, width) for x in v) + end + "]"

def save(content, path=FILE):
    pathlib.Path(path).write_text(HEAD + _fmt(content, 0) + TAIL, encoding="utf-8")
