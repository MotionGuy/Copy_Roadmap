# How this site is built

The reference for working on the site's code and content. `README.md` is the short introduction for people; this file is what Claude reads before changing anything.

## Files

| File | What it holds |
|---|---|
| `index.html` | The page skeleton: top bar, one empty section per page, the settings gear, and an empty box for each overlay. |
| `css/site.css` | All styles, including the day and night themes. |
| `config.js` | Settings for this copy of the site: its address and the Supabase project. |
| `skills/` | The Claude skills that go with the site, one folder each with a `SKILL.md`: `career-roadmap-builder` (sets up and updates the plan), `roadmap-checkin` (the To-Do check-in), `roadmap-project-planner` (recommends projects and builds one out), `roadmap-certification-planner` (fills in Certifications) and `interactive-exam-study-guide` (builds a study guide for an exam and saves it to Study guides). They are generic, so anyone running a copy of the site can add them to Claude. |
| `supabase/setup.sql` | The database: the tables and access rules a new Supabase project needs. Not part of the site and not deployed. |
| `content/content.js` | The content: everything personal the site shows. Edit this to change what the site shows. `content/README.md` describes every section. |
| `js/data.js` | Hands the content to the pages: each section becomes one constant in capitals (`todo` is `TODO`). Nothing personal is written here. |
| `js/app.js` | Saved state and sync, tabs, To-Do and its calendar, Applications, Certifications, Portfolio, the Targets and Find overlays, Settings, and click and form handling. |
| `js/day.js` | Day-to-day planning on top of To-Do: repeating tasks, steps inside a task, dragging a task onto a calendar day, and application deadlines as tasks. |
| `js/work.js` | The Projects page. |
| `js/home.js` | The Home page: the greeting, the year trail, the month summary and the four small pictures. |
| `js/school.js` | The School pages (Overview, Academic plan, Study guides) and their overlays: course map, graduation requirements, how the classes fit together, things to watch out for. |
| `js/boot.js` | Startup: draws everything, opens the page in the address, syncs. |
| `api/ics.js` | Small Vercel function that fetches a Canvas calendar feed for the site (browsers cannot read it directly). It accepts instructure.com and canvas.<school>.edu addresses; any other goes in the `CANVAS_HOSTS` setting on Vercel. |
| `study/` | Study guides linked from School > Study guides. |
| `scripts/` | Helpers for working on the site. Not part of the site and not deployed. |

## Working on it

```sh
sh scripts/preview.sh              # serve the site at http://localhost:8000
python3 scripts/check.py           # check content and code (duplicate ids, bad dates, class codes, unused styles)
python3 scripts/smoke.py           # open every page in a headless browser and try the main interactions
python3 scripts/sample.py          # rewrite content/sample.js, a made-up student dated around today
python3 scripts/quarter_from_ics.py "2027 Spring.ics" --id s27 --name "Spring 2027" --year "Year 2 (2026-27)"
python3 scripts/projects_from_vault.py "<path to the vault>"   # refresh the Projects page from the vault's project notes
```

- `check.py` needs Node.js. Run it after editing `content/content.js`.
- `smoke.py` needs Playwright (`pip install playwright && playwright install chromium`). It blocks the network and signs in with a fake session, so it never touches the real saved data.
- `quarter_from_ics.py` reads a schedule exported as an .ics file and prints the `TERMS` entry and final-exam `TODO` entries for that quarter, ready to paste into `content/content.js`.

Pushing to `main` deploys. Vercel's free plan allows 100 deployments a day, so batch small changes into one push.

## Pages

`GROUPS` in `js/app.js` defines the four top tabs and the pages under each. The pages of the open tab are listed to the right of the tabs, in the same row (on a narrow screen they drop to a row of their own). The site opens on Home.

- **Home**: see "Home" below
- **To-Do**: Tasks, Applications
- **School**: Overview, Academic plan, Study guides
- **Projects**: Overview, Portfolio, Certifications

Moving between pages:

- Opening another main tab slides its sub-pages out from the left, past one thin divider (`drawNav` in `js/app.js`, `.subs.slide` in the stylesheet). Each tab reserves the width of its bold label, so switching never nudges the others.
- A page eases in when it opens. Using a filter (the year buttons and the dropdowns) fades the page's blocks up one after another instead of swapping them in at once (`swapIn` in `js/app.js`).

## Home (`js/home.js`)

`rPlan` in `js/app.js` only assembles it. From the top:

- **Links**: a row of small icons under the name, from `SOCIALS` in the content. The icons are Font Awesome Free 6 (`SOCIAL_ICONS` in `js/home.js` maps each link to its character). `fonts/fa-brands-subset.woff2` and `fonts/fa-solid-subset.woff2` hold only the five characters in use, cut from the `@fortawesome/fontawesome-free` package with `pyftsubset <font>.ttf --unicodes=U+F08C,... --flavor=woff2`, so adding an icon means remaking them. The Drive folder only shows when signed in.
- **Greeting**: follows the clock (`ME` in the content is the name; a random hello in another language late at night), set in Instrument Serif with the quarter label above it in Jost. Both fonts are open-license and kept in `fonts/`; Jost is also the body font for the whole site.
- **Year trail**: in the same card, the school year as a timeline, wider than the card so about four months show at once: a line filled in up to today, a dot on today, and a small circle with a label for each term date and open application deadline. Dragging it (or focusing it and using the arrow keys) slides other days under the dot, and a small card shows the date and what is due. Letting go slides it back to today.
- **This month**: the current month from `MONTHS` and `WEEKS`. There is no switching to other months.
- **Four small pictures**: To-Do, Applications, School and Projects at a glance, each a link to its page.

On the first draw the pieces arrive one after another (`.enter`) and the greeting's letters slide up into place.

## Projects (`js/work.js`)

- **Overview** (`rProjects`) is laid out like To-Do. The bar counts what is in progress and planned and how many of the target skills they cover, with a filter by kind. The list has two groups: **In progress** (the active entries of `WORKS`) and **Planned** (the entries of `PROJECTS` that nothing in progress has picked up; one marked `idea` reads "Idea"). A row shows how many target skills it covers and opens in place to its summary, stack, those skills by name, what is done so far, the next steps, links and the "Finished and published" box. Finished projects and roles (`exp`) are not shown; they stay in the content for the portfolio and resumes. Beside the list, a panel lists the skills target postings ask for (`TARGETS`) with a dot per project that covers each, filled for in progress and hollow for planned; clicking a skill filters the list. A project names the skills it covers in `targets` (a list of target ids).
- **Links**: an entry can carry `page` (its page on the portfolio site), `github` (public repos only), `demo`, and, shown only when signed in, `drive` (the Drive folder of pictures and files) and `notes` (its notes in the vault).
- **Where the content comes from**: the project notes can live in a notes vault (an Obsidian vault, for example), one folder per project under `Projects/`. `WORKS` mirrors the facts, summary and bullets at the top of each project's main file, and `python3 scripts/projects_from_vault.py "<path to the vault>"` refreshes it from there (`--dry` to preview). The log and the write-up never come to this site; the write-up is what the separate portfolio site is built from.
- **Certifications** (`rCerts` in `js/app.js`, from `CERTS`, `TRACKS` and `COSTNOTE`) uses the same layout. The bar counts earned and to go, with a filter by track. The list is the certifications still to earn, in the plan's order; a row shows its track, price and target month and opens to what it is, why it fits, cost, time, format, how to prepare, the official page and the "Earned" box. Ticking that clears the row (with Undo) and raises the earned count. Beside the list a card adds up what is left to pay, with the content's cost note under it.
- **Portfolio** (`rPortfolio` in `js/app.js`, from `PORTFOLIO` and `WORKS`) uses the same layout as To-Do and Overview. The bar counts project pages published and still to write up, and setup steps left. The list has **Setup** (the steps not yet ticked, as checkbox rows that clear when ticked), **To write up** and **Published**: one row per project built or in progress (roles left out), saying what may be public for its kind (from `PORTFOLIO.kinds`) and opening to the piece planned for it and its links. A project counts as published once it has `public` or a `page` link. Beside the list are the reference cards: what every project page shows, the monthly routine, and where things live.

A page that has a Claude skill shows the same icon at the right end of its top bar when signed in (`SKILLS` in `js/app.js` maps pages to skills: To-Do, Overview, Academic plan and Study guides under School, and Overview, Portfolio and Certifications under Projects). The icon opens the skill's text over the page, fetched from `skills/<name>/SKILL.md`; the Copy button, or a click on the text, copies it.

The accent color can be changed in Settings > Appearance: five choices (`ACCENTS` in `js/app.js`, with their colors under `html[data-accent]` in the stylesheet, each with a day and a night version). The choice is kept in the browser (`roadmap-accent`) and applied by `js/data.js` before the page draws.

Settings is not a page: the gear in the bottom-right corner opens it over whatever page is showing (`rSettings` in `js/app.js`). Old links to the Settings page open it too.

`UNDER` lists pages stacked on another page (none at the moment). Targets is an overlay (`rTargets`) opened by the target icon in the Projects toolbar. Find internships is an overlay (`rFind`), opened by the magnifier beside the add button on Applications; old links to it still open it. Each page has a function named `r<Page>` that writes its HTML (`rTodo`, `rApps`, `rSchool`, ...), and `renderAll()` runs them all. The Academic plan's section and function are still called `later` and `rLater`, from when that page covered only Years 3 and 4.

## Where the content lives

With a Supabase project in `config.js`, the content is in the database, in the table `roadmap_content`:

- The owner's row `content` holds all of it. Only the owner, signed in, can read or change it.
- The database keeps a second row, `home`, made from the first on every change (`roadmap_home` in `supabase/setup.sql`). It holds only what Home shows: dates, tasks, the month and weeks, application names and stages, and class codes. That is the one row a visitor can read, which is why a visitor gets Home and nothing else.
- The site keeps the copy it fetched last in the browser (`roadmap-content`) and draws from it straight away. Each load then asks when the row last changed and, if the copy is older, fetches it and reloads (`pullContent` in `js/app.js`).
- To change content, change the `content` row. One section at a time is enough, for example `update roadmap_content set data = jsonb_set(data, '{todo}', '[...]') where part = 'content'`. The time stamp and the `home` row follow by themselves.
- `content/content.js` is the same content as a file. A site with no database reads it directly. With a database it is only a starting copy: the first signed-in load saves it to the database when the database has none, and after that the database is what counts.
- `content/content.js` is deployed with the site, so a site with no database has its content. Once the content is in the database, adding `content` to `.vercelignore` keeps the file out of the deployment, and then nothing personal can be downloaded from the site.

## Changing content (`content/content.js`)

The file is plain JSON inside one line of JavaScript (`const CONTENT = { ... };`). Section names are lowercase there and capitals in the scripts, which is how the table below names them. `scripts/content.py` reads and writes the file for the helper scripts, and `content/README.md` has the rules for each section, and `content/SETUP.md` is the guide for filling the file in for someone new (it starts by asking quarter or semester, school and major, and rebuilds the requirements from their own degree audit). Every section is optional: with an empty file each page shows a short note instead of failing.

| Constant | Page |
|---|---|
| `TODO`, `AREAS` | To-Do |
| `TERMS` | One entry per quarter (dates, classes and each class's weekly meeting `times`). Drives the class cards at the top of To-Do and the class schedule in the calendar's week view |
| `LATER` | School: every class by year and quarter (`desc`, `project`, `learn`, `value`, and `pre` for what it builds on). Feeds the Overview grid, Academic plan and the course map. Also `summary` (the big picture paragraphs), `threads` (how the classes fit together) and `watch` (things to watch out for) |
| `REQS`, `CREDIT` | School > Overview: the graduation requirements overlay, and courses satisfied by AP credit |
| `STUDY` | School > Study guides (a guide is filed under the quarter its class is in) |
| `APPS`, `KINDS` | To-Do > Applications (each application has a `kind`: internship, job, scholarship, research, fellowship or other) |
| `FIND` | To-Do > Applications > Find internships (overlay) |
| `WEEKS`, `MONTHS` | Home's month summary, and this week's steps in To-Do |
| `SCHOOL` | The school's name, the degree and major, and `system` (`quarter` or `semester`), which sets the wording, the Overview grid's columns and a term's usual dates |
| `ME`, `SOCIALS` | The name in Home's greeting and the row of small links under it (LinkedIn, GitHub, Handshake, Drive, and the personal website once its address is filled in) |
| `WORKS` | Projects (everything built or done) |
| `PROJECTS`, `CERTS`, `TRACKS`, `TARGETS`, `POSTINGS`, `PORTFOLIO`, `START` | This year's plan on Projects, Certifications, Targets, Portfolio, and the setup checklist in Settings |

**Wording:** the site's text does not address the reader. Write "the plan", "the project", "this quarter", never "you" or "your" (the study guides are the exception, since they are teaching material).

Keep every `id` unchanged once it exists: checkmarks, edits and application stages are saved against them. Write class codes the short way everywhere (`CS 161`, `ICS 53`), the same in `TERMS`, `TODO`, `LATER` and `STUDY`.

**Starting a new quarter:** run `quarter_from_ics.py` on the schedule, paste its two snippets into `TERMS` and `TODO`, and add other dated work (midterms, projects) to `TODO` with the same class codes. The class cards switch over on their own the day after the previous quarter's finals end.

**After a new degree audit:** `REQS` mirrors the degree audit, and `CREDIT` lists AP credit. Update those two by hand.

## School pages (`js/school.js`)

Nothing on these pages is checked off or saved. Whether a class is taken, in session or planned comes from the calendar: a quarter's dates are taken from `TERMS` when it is listed there, and otherwise estimated from its name.

- **Overview**: one container with the four-year grid and, under a thin line, the big picture in three short paragraphs. Beside the title are a puzzle-piece icon (how the classes fit together: each thread of classes, what is good about it and what to watch), a warning icon (things to watch out for, soonest first) and the progress bar, which opens the graduation requirements worked out from the plan (`reqRows`). All three open as overlays.
- **Academic plan**: one year at a time. Each class has a connections icon (what it builds on and leads to) and, when it has any, a study guides icon. The tree icon beside the year buttons opens the course map.
- **Course map**: every class as a node with a curve to each class that builds on it. Hovering one traces its whole chain.
- **Study guides**: the same year, quarter and class layout, with each class's guides listed under it.

## Calendar

The calendar icon in the To-Do toolbar, or the month name on the small calendar, opens a full calendar over the page (`rBigCal` in `js/app.js`). Weeks start on Sunday, here and on the small calendar. The heading is the month with the year set lighter, in both views (in week view, the month most of the week falls in). Month view lists what is due each day as one long list of weeks, a year back and two ahead, that scrolls up and down: the heading names the month in view, the days of other months dim, and Today jumps back. Clicking a day number opens that week. In week view the Due row is the same height every week (three one-line tasks a day; "+N more" opens it up to show them all, "Less" closes it), the hours are tall and scroll under the day names and the Due row, the weekend columns are shaded, a line in the accent color marks the present time across the current week (solid over today, with the time in the hour column), and the weeks sit side by side in a strip that scrolls sideways and settles on a week (three are drawn at a time, and the one it settles on becomes the middle one). The arrows glide a week either way. Week view has a Due row and a time grid with class meetings and exams. Clicking a task closes the calendar and jumps to it in the list.

## Page conventions

Every page is built from the same few parts, so a new one should use them too:

- **Header row**: `<div class="chips todobar studybar">` with the page's `<h2>` on the left and its controls on the right inside `<span class="yearseg">`. To-Do and Applications use the same row without a title, with the stats bar (`.sum`) on the left.
- **Controls**: icon buttons are `.tool` inside `.tools`; a choice between years is a segmented bar (`.yearbar`), and a filter with named options is a dropdown (`select.areasel`, as on Tasks, Applications, Projects and Certifications). Text buttons (`.btn`) are only used inside forms and settings.
- **Sections**: a section heading is `<div class="bucket"><h3>` with an optional small count beside it.
- **Content**: lists of things go in one container, `<div class="tgroup pgroup">`, with a `.card.pcard` per item separated by thin lines. An item's small label is `.pcode` and its title an `<h3>` (or a bold line inside `.wk-top`). Items that fold open use `.wk` with `data-wk` (Projects, This year's plan, Certifications); `workOpen` in `js/work.js` remembers which are open.
- **Overlays**: add the empty box to `index.html`, register its drawing function (`OVERLAYS.<id> = r<Name>` in the file that draws it), and give its buttons the ids `<id>-open` and `<id>-close`; `overlay(id, on)` in `js/app.js` does the rest. The box holds a `.mapbox` (the `.mapover` is the dimmed backdrop), with a `.maphead` title row and a close `.tool`. Two-column detail lists reuse the `.rq*` classes (graduation requirements, targets, how the classes fit together, things to watch out for). Escape or a click on the dimmed backdrop closes one.

## Day planning (`js/day.js`)

- **Repeating tasks**: the add form and the pencil (for tasks added on the site) have a repeat choice. Ticking one moves it to its next date and unticks its steps.
- **Steps**: the list icon beside the pencil breaks a task into steps with their own checkboxes.
- **Drag to reschedule**: drag a task row onto a day of the small calendar, or a task inside the full calendar onto another day (month view) or another Due cell (week view). Touch screens use the pencil.
- **Application deadlines**: every application in "To start" with a deadline appears as an "Apply: ..." task, unless a task on the same date already names it. Ticking it moves the application to Applied.
- **Units**: a class in `LATER` counts as 4 units unless it has a `units` field. Academic plan shows the total per quarter and the Overview grid per year.

## Settings

The gear in the bottom-right corner opens Settings: a full-screen blur with the settings on top. It holds the appearance (theme and accent color), the backup download and upload, the Canvas connection, and the setup checklist while any of it is unchecked. It closes with the X, Escape, or a click on the blur beside the text.

## Saved data

Everything saved per user is in `state.checks` (see `js/app.js`): `id -> time checked`, plus these extra keys.

- `_added`: tasks added with the plus button on To-Do
- `_edits`: wording or date changes made to built-in tasks with the pencil on a To-Do row, kept by task id
- `_appsAdded`: applications added on the board (with their kind)
- `_apps`: which stage each application is in (changed by dragging it to another column)
- `_notes`: the scratch pad under the calendar on To-Do. The note icon beside the sync label (any page, signed in only) or a double click on the small pad opens the same text in a big overlay (`rNotesBig` in `js/app.js`)
- `_subs`: steps inside a task, as `{task id: [{t, d}]}` (`d` is set once the step is ticked)
- `_prio`: tasks starred as a priority on To-Do, as `{task id: 1}`; they show in a Priority group at the top whatever their due date

A task in `_added` can also carry `rep` (`d`, `w`, `2w` or `m`): ticking it moves its due date to the next round instead of clearing it.

It is stored in the browser and in the Supabase table `roadmap_progress`, which is publicly readable, so nothing private belongs in a task name or the notes.

A few things are kept only in the browser they were set in: the Canvas link and its last result, whether focus mode is on, whether Later is folded open on To-Do.

## Canvas calendar

Settings (the gear, signed in only) takes a Canvas calendar feed link. The link works like a password, so it is kept in that browser's storage only: never in the synced data and never in this repo. On each page load the site posts it to `/api/ics`, keeps upcoming assignments, skips ones already on the list, and shows the rest in To-Do under Classes with a "Canvas" note.

## Visitors

Anyone who is not signed in sees the Home page only (`show` in `js/app.js` keeps them on it): the greeting, the trail, the month summary and the four small pictures, with no tabs and no links into the other pages. On the trail, a visitor's date card shows the flags but not task names. This is a simpler view, not a privacy wall: the saved data and the site's files can still be read by anyone with the link.

## Finals mode

During the weeks tagged `Finals` in `WEEKS`, To-Do narrows to exams and coursework due that week (with a button to show everything).
