---
name: "interactive-exam-study-guide"
description: "Build an interactive exam study guide where laddered practice problems teach the material (analogies and visuals, concept order), plus mixed-concept mastery problems, drills, videos and a cheat sheet, as a flat minimal white/gray/soft-pink HTML page saved to the Study guides page of a roadmap site, with progress synced to the site's database."
---

# Interactive exam study guide

Use this when a student shares course materials (lecture slides, class notes, review slides, sample exams + solutions, discussion slides) and wants a study guide for an exam. The output is one published HTML artifact, completely separate from their own notes (never write into a notes vault), with seven tabs: **Overview · Practice · Mastery · Topics · Drills · Watch · Cheat Sheet**, plus a separate printable cheat sheet artifact.

## How the guide teaches (this drives every section)
- **The practice problems are the lesson.** Most students spend their time in Practice and skip long reading, so the guide must fully teach the exam from the Practice tab alone. Topics is a short reference, not required reading.
- **Analogies and visuals first.** Every new idea arrives as an everyday analogy or a picture before any formula. Pick the form that fits the problem: diagram or plot, interactive demo, everyday analogy, or a step-by-step trace of state changing line by line.
- **No big chunks of text.** Blocks of explanation get skipped. Nothing visible by default runs longer than about 3 lines or 50 words; anything longer is split into more small problems or tucked into a collapsed "Go deeper". (This limits explanation text, not problem size: problems themselves should be meaty.)
- **Ladders.** Problems climb in difficulty: the easy ones teach the core concept, later ones add one thing at a time on top.
- **Every problem takes real thinking.** Meaty problems, not quick recall. No problem may be answerable by copying the intro or repeating the last problem's steps.
- **Why, not just the formula.** After a few similar problems it is easy to catch the pattern, memorize the recipe, and get tripped up when the pattern changes. So every ladder must teach why the formula works and must deliberately break the pattern (section 4): no long runs of same-shaped problems.
- **Exams mix topics.** The hardest moment on an exam is one problem that combines several concepts. The Mastery tab (section 4b) trains exactly that.
- **Concept order, not lecture order.** Before writing anything, build a concept map: list the exam's concepts, note what each one depends on, and order them so each concept only needs earlier ones (foundations first). Merge a concept that was spread over several lectures into one place, and move it earlier if later material leans on it. Use this order everywhere (Practice, Topics, Cheat Sheet, Overview). Lecture numbers appear only as citations ("Lecture 7, slide 14") and in the review-lecture checklist.
- **Their own way of studying wins.** If the student says how they learn best, follow that over these defaults.

## 0. Ask first: overall confidence
Before building, ask ONE question (AskUserQuestion): how confident the student feels about this subject overall, e.g. *Brand new to it / Shaky / Mostly OK / Solid, just need practice*. Use it to set depth for every topic:
- **Brand new / Shaky**: more "Meet it" problems with smaller steps (every term introduced by its own problem, analogy + visual on each), and a longer climb before exam level.
- **Mostly OK**: fewer "Meet it" problems, more "Stretch it" and "Exam it", more remixed class examples, and a bigger Mastery set.
- **Solid**: "Meet it" shrinks to a 2 to 3 problem recap check per concept; most of the bank is exam-level and Mastery.
At every level the in-depth explanation stays available, collapsed under "Go deeper" on the concept card. Also confirm which exam it is if that's unclear. Do not ask about their schedule or build a timed study plan.

## 1. Lock the exam scope
- Find the official topic list (review lecture / "topics for the exam" slide) and logistics (date, time, length, closed book, calculator and note-sheet rules). If sources disagree, trust the most recent official one and flag the conflict.
- **Only include material for THIS exam.** Don't pull problems from other exams unless asked; if you do, mark the source.
- Note the course's notation and how old exams differ; this goes in the notation table on Overview.

## 2. Read the materials (delegate big PDFs)
- `pdftotext -layout` first, then view image-heavy slides visually. Read the exam-defining docs (review lecture, sample exam + solutions) yourself.
- For long files, run parallel subagents: (a) per-topic digest of the notes (notation, formulas, **every worked example from slides/notes with slide or page number**, what's out of scope); (b) extract every in-scope sample problem with official answers; (c) find short YouTube explainers with verified video IDs (StatQuest, 3Blue1Brown, the course's original instructor, similar). Never invent a video ID.
- **Recompute every answer-key value with code** (exact fractions). List slips in "Answer-key mistakes" on Overview with corrected values.
- **Source notes** (optional): if the student keeps class notes in an Obsidian vault and it is reachable, find the lecture/class notes each topic comes from and record their vault paths. If there is no vault or it isn't reachable, use note names they give or skip the links rather than guessing paths.
- **Concept map**: from the digests, write the ordered concept list (id, name, prerequisites, which lectures/slides it draws from, which sample-exam problems use it, and which concepts the exams combine in one problem). Everything below is built from this list, in this order.

## 3. Concept cards (Topics tab): short reference, never dense
This tab stops getting used when it is dense. Make it a quick reference hub. Order: `Start here` (a clickable concept map diagram showing the concepts in order with arrows for "needs", plus a one-line "what this subject is") → one card per concept, in concept order → `No-calculator survival kit` (if no calculators). Math the exam assumes is not an article: it becomes a "Warm-up" ladder at the start of Practice.

Each concept card shows only this by default (about 120 words of prose at most, no paragraph over 3 lines):
1. **The idea in one sentence**, then an everyday **analogy**.
2. **A picture**: a diagram, plot, trace or **interactive demo** (sliders / click canvas) that shows the idea without reading.
3. **Summary box**: the key formulas and 2 to 3 gotchas, each formula with a one-line "why" (same content feeds the Cheat Sheet).
4. **Resources row** (compact links, always visible): **Your notes** (`obsidian://open?vault=CS%20Vault&file=<URL-encoded path without .md>`, one per source note, labeled with the note title), **Lecture** (the lectures and slide ranges this concept comes from), **Videos** (1 to 2 short explainers by title; clicking expands the embed, see section 6).
5. **Needs first** chips linking to the prerequisite concepts, and a **"Start this ladder →"** button to the concept's first Practice problem.

Deeper details are collapsed in `<details>`, closed by default:
- **Go deeper**: why it works, derivations the course expects, pseudocode the exam may ask for, common misconceptions. Short paragraphs, one idea each.
- **From class**: the actual examples from the lecture slides and class notes (cite "Lecture 7, slide 14"), each solved in `<details class="work">`. Include every relevant class example; each one also appears remixed on the ladder.

Then **audit** (subagent), in this direction: for every formula, definition, gotcha and class example on a concept card, and every skill a sample-exam problem needs, find the "Meet it" problem whose `teach` line introduces it and the "why" problem that tests the reasoning behind it. Anything only on a card, or tested but never taught by a problem, is a gap: add a problem for it. Also flag any visible text block over the length limit and any problem answerable by copying its teach line. Map every section of the review lecture to the concept and ladder rung that teaches it (checklist on Overview).

## 4. Practice ladders (Practice tab): the problems teach
This tab is the main lesson and must work for someone who never opens Topics. Build one ladder per concept, in concept order (Warm-up ladder first), as many problems as the material supports and at least ~35 per concept, in four rungs. Keep Meet it lean (only as many as it takes to introduce every idea); the bulk goes to Use it, Stretch it and Exam it.
1. **Meet it** (easy): each problem introduces ONE new idea. A `teach` line of 1 to 3 sentences (analogy or picture first, plain words, then the term or formula) sits above a question that is short to read but cannot be answered by reading the intro back: the student has to predict, apply the idea to a new case, or choose between two plausible answers (about 1 to 3 minutes of real thinking). The solution names the idea, states the rule just used, and says in one line why the rule is true. Enough of these to cover everything on the concept card.
2. **Use it** (easy to medium, 2 to 4 steps each): the same ideas in new setups with no teach line, including the remixed class examples.
3. **Stretch it** (medium, 3 to 5 steps or multi-part): adds one twist at a time (an edge case, a second formula, working backwards from the answer, a concept from earlier in the order) and records in `builds` which problem it extends.
4. **Exam it** (exam): the real sample-exam problems and exam-style multi-part show-work for this concept.

**Source material first**: every worked example from the slides and notes appears remixed on the ladder, every in-scope sample-exam problem appears in Exam it (or Mastery if it mixes concepts), and new problems are written only to fill gaps, modeled on the course's own style and notation. Mark `src` on every problem.

Ladder rules: every problem must take real thinking. None may be answerable by recall, by copying the teach line, or by redoing the previous problem's steps with new numbers. Prefer meaty multi-step and multi-part problems over one-liners; a problem that takes under a minute is too thin. Never introduce two new ideas in one problem; if a teach line needs more than ~50 words, split it into two problems. Every "Meet it" problem and at least a third of the rest carry a visual, in whichever form fits that problem (diagram or plot, mini demo, analogy sketch, step-by-step trace table). Solutions stay in short steps, one line each, with the analogy called back where it helps.

**Understanding over pattern-matching** (a memorized recipe breaks the moment the pattern changes):
- **Why problems** (`type: why`, at least 6 per concept, starting right after the formula is introduced): no plugging in. Examples: "which explanation of this formula is right?", "what happens to the answer if X doubles, and why?", "where does this term come from?", "here is a worked solution with a reasoning error, find it", "rebuild the formula from the analogy" in 2 to 3 guided parts. Answered as mc or show; the solution explains with the picture or analogy, not algebra alone.
- **Pattern breakers** (`twist:` field, at least 8 per concept, spread through Use it and Stretch it): the problem looks like the ones before it, but the memorized recipe gives the wrong answer (an assumption no longer holds, extra or missing information, the question asks for a different quantity, a boundary case, the same idea in an unfamiliar representation). The recipe's wrong answer is one of the options or is caught by the checker with "that is what the usual steps give; what changed here?". The solution starts with "What changed" in one line.
- **No streaks**: never more than 2 same-shaped problems in a row. Vary the surface (wording, representation, which quantity is unknown, numbers vs symbols vs code vs picture) so the only thing that carries over is the idea.
- Every solution's Exam tip says when the rule does NOT apply.

Mix these types on every ladder:
- `mc` multiple choice; `num` numeric (fractions or decimals);
- `show` **exam-style show-work**: multi-part free response like the real exam, with a rubric-style solution (what earns each point);
- `code` **code tracing / pseudocode**: what does this output, fill in the missing line, find the bug (code in `<pre>`; answer is mc, num, or show);
- `tf` **true/false + why**: pick T/F, then reveal the one-paragraph reason;
- **remixed class examples**: take each slide/notes example and change the numbers or setup (`src: Remix of Lecture 7 slide 14`).

Store questions in a plain-text block (`<script type="text/plain" id="qbank">`) so LaTeX needs no escaping:
```
=== id: r1
topic: reg
type: num            # mc | num | show | code | tf | why
level: medium        # easy | medium | exam | mastery
src: Sample midterm P3
rung: meet           # meet | use | stretch | exam | mastery
step: 3              # position on the concept's ladder (ladder order)
builds: r0           # optional: id of the problem this one adds onto
twist: asks for the other class's probability   # pattern breakers only: what changed
trap: 3/8            # optional: the answer the memorized recipe gives (triggers the "what changed?" nudge)
concepts: reg, cv    # mastery only: every concept the problem needs
teach:               # meet rung: 1 to 3 sentences shown above the question
...analogy or picture first, then the term...
fig:                 # optional inline SVG, trace table or demo id shown with the question
answer: 7/8          # mc: 0-based index; num: fraction/decimal; tf: true|false
tol: 0.006           # optional
plot: 1,3; 2,2; 4,1.5   # optional scatter;  line: x,label; ...  for 1-D class data
q:
...HTML + LaTeX...
opt: option text     # mc only, one per line, original order
hint: one-sentence nudge
ex:
What's tested (plain words) → every step → **Final answer** → Exam tip
```
`topic` holds the concept id. Parse at load (keys at line start; values continue until the next key). Default view is one concept at a time in ladder order (not shuffled) with a rung strip (Meet · Use · Stretch · Exam) showing progress and "Next" moving up; the `teach` line and figure sit in a `--panel` box above the question; `twist` is never shown before an answer; a missed problem offers "Step back" to the problem in `builds`; finishing a ladder suggests the next concept and any Mastery problems it unlocks. Card UI: instant MC/TF feedback (wrong pick struck through, correct outlined), numeric input accepting fractions or decimals, Hint toggle, Show solution, filters by concept / type / rung (plus "Why" and "Pattern breakers" chips), "Only missed", shuffle, two-click reset, progress in localStorage (try/catch). Verify every answer parses and matches before publishing.

## 4b. Mastery (Mastery tab): mixed-concept problems
Exams combine concepts in a single problem, and that is where points are lost. Build as many as the material supports, at least ~25, most of them multi-part, each needing two or more concepts (`rung: mastery`, `concepts:` listing them).
- **Sources**: first every multi-concept problem from the sample exams (and remixes of them); then new problems that copy the pairings the real exams use; then other natural chains where one concept's output feeds the next. Mark the source on each.
- **Its own ladder**: two concepts → three or more → full exam-length multi-part problems.
- **Just solve**: like the real exam, the card does not say which concepts it uses and does not ask for them to be named first. Concept tags stay hidden until the problem is answered or the student opens the solution.
- **Solutions** open with "Concepts used" chips (each linking to that concept's ladder), then short steps that label where one concept hands off to the next, then "If this was hard, go back to: <concept, rung>".
- **Mock mixed set**: a button that deals N random Mastery and Exam-it problems across all concepts, shuffled, no hints or solutions until the set is submitted, optional timer (off by default), with a score per concept at the end.
- Never locked: show "best after finishing Use it for: X, Y" as a soft note only.

## 5. Drills (Drills tab)
Unlimited generators for the exam's common hand computations, with an **exact fraction class** so answers are clean (e.g. LOOCV on 3 integer points, 1-D kNN error, logistic score + boundary, Bayes with clean fractions, one gradient step). Build a generator for every computation type that appears in class examples or sample exams. Each has Check + Show steps (steps in LaTeX via `String.raw`) and an easy/exam difficulty toggle. Stress-test 1000 generations for NaN/Infinity/TeX errors.

## 6. Watch tab + embedded videos
- Short YouTube explainers only (roughly under 20 min), grouped by topic, 2–4 per topic, each with a one-line "what this covers / skip to 3:10 for X".
- Embed in the page: `<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/VIDEO_ID" title="..." allow="encrypted-media; picture-in-picture" allowfullscreen>` inside a 16:9 wrapper, with a plain "Open on YouTube" link under each as a fallback. Verify each ID resolves to the right video before publishing.

## 7. Overview tab (no timed schedule)
- Exam logistics + scope notes (what's in, what's out).
- Concept progress in concept order: per concept a four-segment bar (Meet · Use · Stretch · Exam) driven by Practice results, plus one overall Mastery bar and the last mock mixed set score, in localStorage with stable IDs. No "I've read this" checkboxes; reading is optional.
- "Concepts the exam mixes": the pairings found in the sample exams, each linking to its Mastery problems.
- "Most tested" frequency bars from the sample exams (exam sources only).
- Review-lecture checklist (each section → where the guide teaches it).
- Answer-key mistakes with corrected values; notation translation table.

## 8. Cheat sheet
- **Cheat Sheet tab**: every formula, definition and gotcha, grouped by concept in concept order (built from the concept cards' summary boxes).
- **Separate printable cheat sheet**: publish a second artifact (its own file) laid out for print with `@media print` (Letter, ~0.4in margins, two or three columns, small but legible text, no nav, no interactive bits, `break-inside:avoid` per block). If the exam allows a note sheet, fit it to the allowed size and sides. Link it from the Cheat Sheet tab.

## 9. Math rendering (MathJax)
```html
<script>window.MathJax={tex:{inlineMath:[['$','$']],displayMath:[['$$','$$']],processEscapes:true},svg:{fontCache:'global'},options:{enableMenu:false}};</script>
<script defer src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js"></script>
```
Rules: never a raw `<` or `>` in math or text (use `\lt` `\gt`, `&lt;`); never `$` for money; avoid `\boldsymbol`; split very long inline formulas. After injecting content: `MathJax.startup.promise.then(()=>MathJax.typesetPromise([el]))`. CSS:
```css
mjx-container{color:inherit}
mjx-container:not([display="true"]) > svg{max-width:100%;height:auto}
mjx-container[display="true"]{overflow-x:auto;overflow-y:hidden;max-width:100%;margin:14px 0!important}
mjx-assistive-mml{max-width:100%!important;overflow:hidden!important}
figure svg:not(mjx-container svg){width:100%;height:auto;max-width:560px}
select{max-width:100%}
```

## 10. Visual design: flat, minimal, white + gray + soft pink (always)
Light only (`color-scheme:light`). Flat: **no neumorphism, no raised/inset "pillow" shadows, no gradients**. Structure comes from white surfaces, light gray panels, thin 1px borders and spacing. Soft pink is the single accent (selected tab, primary buttons, links, progress fills, focus rings); keep it sparing so it reads as calm, not loud.

Fonts: system fonts only, no Google Fonts.
```css
:root{color-scheme:light;
  --bg:#ffffff; --panel:#f6f6f7; --panel-2:#efeff1; --line:#e4e4e7;
  --ink:#1f2328; --muted:#6b7078;
  --pink:#e891a8; --pink-ink:#b5476a; --pink-soft:#fcedf1;
  --ok:#2e8b57; --ok-soft:#e6f3ec; --bad:#c94f4f; --bad-soft:#f8e8e8;
  --r:12px;
  --f-body:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,system-ui,sans-serif;
  --f-mono:ui-monospace,"SF Mono",Menlo,Consolas,monospace}
body{background:var(--bg);color:var(--ink);font-family:var(--f-body);font-size:16px;line-height:1.65}
h1,h2,h3,h4{line-height:1.2;text-wrap:balance;letter-spacing:-.01em}
h1{font-weight:700;font-size:clamp(1.8rem,5vw,2.6rem)} h2{font-size:1.5rem;font-weight:700}
h3{font-size:1.15rem;font-weight:600} h4{font-size:.75rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
a{color:var(--pink-ink)}
.sheet,.qcard{background:var(--bg);border:1px solid var(--line);border-radius:var(--r);padding:22px clamp(16px,4vw,28px)}
.summary,.deep,.formula,figure,.readout{background:var(--panel);border:1px solid var(--line);border-radius:var(--r)}
.btn,.chip{background:var(--bg);border:1px solid var(--line);border-radius:10px;color:var(--ink)}
.btn:hover,.chip:hover{background:var(--panel)}
.btn.primary{background:var(--pink);border-color:var(--pink);color:#fff}
.chip[aria-pressed="true"]{background:var(--pink-soft);border-color:var(--pink);color:var(--pink-ink)}
nav.tabs{position:sticky;top:0;background:rgba(255,255,255,.92);backdrop-filter:blur(6px);border-bottom:1px solid var(--line)}
nav.tabs button[aria-selected="true"]{color:var(--pink-ink);box-shadow:inset 0 -2px 0 var(--pink)}
input,select{border:1px solid var(--line);border-radius:10px;background:var(--bg)}
:focus-visible{outline:2px solid var(--pink);outline-offset:2px}
.qcard{position:relative} /* status = 3px colored bar on the left via ::before (ok / bad / pink for in progress) */
code,pre,.eyebrow{font-family:var(--f-mono)} pre{background:var(--panel);border:1px solid var(--line);border-radius:10px}
```
Eyebrow labels in small mono uppercase, muted. Charts and demos sit in `--panel` boxes and use only token colors (pink for the highlighted series, grays for the rest). No box-shadow anywhere except a very faint one on hover if needed. 16px side gutter, no horizontal scroll at 400px, `min-width:0` on grid children.

## 11. Verify, then publish
- Headless test (Playwright Chromium at `/opt/pw-browsers/chromium`; route the MathJax CDN to a local `npm i mathjax@3.2.2` copy). Check: zero `mjx-merror`, no leftover `$` in rendered text, every question parses and its answer matches, drills clean over many runs, every concept-card item has a "Meet it" problem that teaches it, the per-concept and Mastery minimums are met, every concept has its why problems and pattern breakers and no run of 3 same-shaped problems, no problem is answerable by copying its teach line, every class example and in-scope sample-exam problem appears in the bank, no `teach` line over ~50 words and no default-visible text block over 3 lines, every `builds` id exists and points earlier on the ladder, every Mastery problem lists 2+ valid concepts, concepts appear in concept-map order in every tab, no horizontal scroll at 400px and 1200px, print preview of the cheat sheet fits the intended pages. Screenshot demos and figures once.
- Publish both artifacts (guide + printable cheat sheet) with the Artifact tool, loading its design guidance first; republish the same file paths for updates. Mention they're private until shared.

## 11b. Save it to the roadmap site (every time)

After publishing, also save the guide to the student's roadmap site so it shows on the Study guides page. Do this without being asked, for every new guide and every update to one. If they have no roadmap site, skip 11b and 11c and deliver the artifacts.

- **Repo**: the site's GitHub repo (ask which one the first time; attach it to the session and clone once). Ask once whether to push straight to the main branch or open a pull request, and keep to that.
- **Files**: copy the finished guide to `study/<class>-<exam>.html` and the cheat sheet to `study/<class>-<exam>-cheatsheet.html`, lowercase with hyphens (for example `study/cs101-midterm.html`). Each must be one self-contained HTML file that works when opened directly: inline CSS and JS, MathJax and video embeds loaded from their normal CDNs.
- **List entry**: add an object to the `study` list in the site's content: `{"id": "sg-<class>-<exam>", "cls": "CS 101", "title": "Midterm: <topics>", "made": "YYYY-MM-DD", "file": "study/<name>.html", "sheetFile": "study/<name>-cheatsheet.html"}`. Write `cls` exactly as the class code appears in the site's academic plan, so the guide lands under that class. Leave out `sheetFile` when there is no cheat sheet. When updating an existing guide, overwrite its files and keep its entry; do not add a second one.
- **Where the content lives**: either the table `public.roadmap_content` (row `part = 'content'`, column `data`) in the site's Supabase project, reached through the Supabase connector, or the file `content/content.js` in the repo when there is no database. Find the project from `supabaseUrl` in the repo's `config.js`, or ask. In the database, change only the `study` section with `jsonb_set`, always `where part = 'content'`; never replace the whole `data` value. In the file, the content is plain JSON inside `const CONTENT = { ... };`, `scripts/content.py` can load and save it, and `python3 scripts/check.py` confirms it is still valid.
- **Publish**: commit the two files (and the content file if that changed) and push.
- **Tell them** in one line that the guide is on the Study guides page, with its path on the site. Guides are built from course materials, so if the repo or site is public when one is saved, say so once: they may want to keep guides out of a public repo.
- If the repo cannot be reached, still deliver the artifacts and say the site copy was not saved.

## 11c. Sync guide progress to the database (site copy)
Guide progress is saved to the same Supabase database the roadmap site uses for checkmarks, so it follows the student across devices. Build this into every guide's site copy (`study/<name>.html`).

- **What syncs**: the guide's whole progress state (per-problem result and attempts for Practice and Mastery, rung progress, mock mixed set scores, "Only missed" data). Keep writing it to localStorage first, exactly as before; the database is a second copy, never the only one.
- **Connection**: do not copy the Supabase address or key into the guide. Load the site's settings with `<script src="../config.js"></script>` before the guide's own script and read them as `const SYNC_URL = typeof CONFIG === "object" ? CONFIG.supabaseUrl : "", SYNC_KEY = typeof CONFIG === "object" ? CONFIG.supabaseKey : "";` (sync stays off when either is empty). Use plain `fetch` against the Supabase REST API the way `js/app.js` does; no SDK.
- **Sign-in is shared**: guides are served from the same site as the roadmap, so read the existing session from localStorage key `roadmap-sync` (`access_token`, `refresh_token`, `uid`, `exp`). Refresh an expired token the same way `js/app.js` does and write the refreshed session back to the same key. No separate sign-in form in the guide: if there is no session, show one muted line, "Saved on this device only. Sign in on the roadmap site to sync.", and work locally.
- **Table**: `study_progress`, one row per guide: `user_id`, `guide_id` (the guide's `STUDY` id, e.g. `sg-cs101-midterm`), `data` (jsonb), `updated_at`. Owner-only read and write, so friends or classmates opening a guide get their own local progress and never see or change the owner's.
- **Pull and push**: on load and when the tab becomes visible, GET the row for `user_id` + `guide_id`, merge, re-render. On every change, save locally then push after a ~600 ms debounce with an upsert (`on_conflict=user_id,guide_id`, `Prefer: resolution=merge-duplicates,return=minimal`).
- **Merge, never overwrite**: stamp each problem's record with the time it changed and merge per problem id, newest wins, so studying on the laptop does not wipe what was done on another device. A two-click reset writes a reset time that clears older records on other devices too.
- **Status line** (small, muted, near the progress bars): "Synced", "Saving", or "Offline: saved on this device only". Sync failures never block the guide or show an error dialog.
- **Artifact copy**: the claude.ai artifact runs on a different origin with no session, so sync stays off there (guard on the session being absent and wrap every call in try/catch). Say once that synced progress lives on the site copy.
- **First-time setup**: before relying on it, check that the table exists (a GET that returns 404 means it does not). The site's `supabase/setup.sql` creates it. If it is missing, create it through the Supabase connector after asking, or give them this SQL to run once in the Supabase SQL editor:
```sql
create table if not exists public.study_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  guide_id text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, guide_id)
);
alter table public.study_progress enable row level security;
create policy "owner reads study progress" on public.study_progress for select using (auth.uid() = user_id);
create policy "owner inserts study progress" on public.study_progress for insert with check (auth.uid() = user_id);
create policy "owner updates study progress" on public.study_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update on public.study_progress to authenticated;
```
- **Verify**: in the headless test, route the Supabase URL to a mock: signed out makes no network calls and works locally; signed in pulls, merges two different device states without losing either, and pushes after a change; a failed request leaves local progress intact.

## 12. Tutoring follow-ups
When the student asks for help on a problem, tutor Socratically: one small question at a time, confirm before moving on, never give the final answer up front. When they make an error, diagnose the exact slip and show a 10-second self-check (plug the answer back in). Answer "why" questions in plain words first, then the math. Respect the course's AI rules (for example, never write graded code or assignment answers for them).
