import re, os, glob, html.parser

pages = sorted(glob.glob("*.html"))
problems = []

for p in pages:
    src = open(p, encoding="utf-8").read()

    # local asset/link references
    for attr, val in re.findall(r'(src|href)="([^"]+)"', src):
        if val.startswith(("http", "mailto:", "tel:", "#", "data:")):
            continue
        target = val.split("#")[0]
        if target and not os.path.exists(target):
            problems.append(f"{p}: missing {attr}={val}")

    # duplicate attributes on the same tag
    for tag in re.findall(r'<[a-zA-Z][^>]*>', src):
        names = re.findall(r'\s([a-zA-Z-]+)=', tag)
        dupes = {n for n in names if names.count(n) > 1}
        if dupes:
            problems.append(f"{p}: duplicate attr {dupes} in {tag[:90]}")

    # in-page anchors resolve
    for a in re.findall(r'href="#([A-Za-z0-9_-]+)"', src):
        if f'id="{a}"' not in src:
            problems.append(f"{p}: dangling anchor #{a}")

    # tag balance
    class Bal(html.parser.HTMLParser):
        VOID = {"area","base","br","col","embed","hr","img","input","link","meta","source","track","wbr"}
        def __init__(s):
            super().__init__(); s.stack=[]; s.err=[]
        def handle_starttag(s, t, a):
            if t not in s.VOID: s.stack.append((t, s.getpos()[0]))
        def handle_endtag(s, t):
            if t in s.VOID: return
            if not s.stack: s.err.append(f"stray </{t}> line {s.getpos()[0]}"); return
            if s.stack[-1][0] != t:
                s.err.append(f"</{t}> line {s.getpos()[0]} but open <{s.stack[-1][0]}> from line {s.stack[-1][1]}")
                for i in range(len(s.stack)-1, -1, -1):
                    if s.stack[i][0] == t: del s.stack[i:]; return
            else:
                s.stack.pop()
    b = Bal(); b.feed(src)
    for e in b.err: problems.append(f"{p}: {e}")
    for t, ln in b.stack: problems.append(f"{p}: unclosed <{t}> line {ln}")

# cross-page nav links present
nav_targets = {"index.html","about.html","services.html","why-velora.html","glimpses.html","contact.html"}
for p in pages:
    src = open(p, encoding="utf-8").read()
    for t in nav_targets:
        if f'href="{t}"' not in src:
            problems.append(f"{p}: nav missing link to {t}")

# CSS: check braces balance and that every class used in HTML that looks custom exists
css = open("style.css", encoding="utf-8").read()
if css.count("{") != css.count("}"):
    problems.append(f"style.css: brace mismatch {css.count('{')} open vs {css.count('}')} close")

css_classes = set(re.findall(r'\.([a-zA-Z][\w-]*)', css))
used = set()
for p in pages:
    for cl in re.findall(r'class="([^"]+)"', open(p, encoding="utf-8").read()):
        used.update(cl.split())
undefined = sorted(c for c in used if c not in css_classes)
if undefined:
    problems.append("classes used but not styled: " + ", ".join(undefined))

# JS selectors that must exist somewhere
js = open("script.js", encoding="utf-8").read()
if js.count("{") != js.count("}"):
    problems.append("script.js: brace mismatch")

print(f"Checked {len(pages)} pages: {', '.join(pages)}")
if problems:
    print(f"\n{len(problems)} PROBLEM(S):")
    for x in problems: print("  -", x)
else:
    print("\nAll checks passed.")
