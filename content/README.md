# Content

The content is everything personal the site shows. It is one object, kept either in this folder as `content.js` or, when the site has a Supabase project, in the database (`CLAUDE.md`'s "Where the content lives" has the details). The layout below is the same in both places.

`content.js` holds that object as a file. The scripts hold none of it, so a different person's site is the same code with a different `content.js` (and their own `config.js`).

Every section is optional: the site draws with an empty file, and each page shows a short "nothing yet" note until its section has something in it. One term in `terms` is enough for Home and To-Do to follow the school calendar. `SETUP.md` is the guide for filling the file in for a new person.

The file is one object of plain JSON: `const CONTENT = { ... };`. No comments, no code. `python3 scripts/check.py` checks it after an edit.

## Rules

- Keep every `id` unchanged once it exists. Checkmarks, edits and application stages are saved against ids.
- Class codes are written the short way everywhere ("CS 161", "ICS 53") and must match between `terms`, `todo`, `later` and `study`.
- Dates are `YYYY-MM-DD`.
- Text does not address the reader: "the plan", never "you" or "your".

## Sections

| Section | Page | What it holds |
|---|---|---|
| `schema` | | The layout version of this file. Currently 1. |
| `me` | Home | The name in the greeting. |
| `school` | School, Home | `name`, `degree` and `major` (shown over the graduation requirements), and `system`: `quarter` or `semester`. Optional `depts` maps the long department names a registrar or Canvas uses to the short ones the site shows (`{"COMPSCI": "CS"}`), so Canvas assignments land under the right class. The system sets the word the pages use, the columns of the Overview grid (Fall, Winter, Spring or Fall, Spring) and the usual dates of a term that is not in `terms` yet. |
| `socials` | Home | The small links under the name, in order: `[icon, label, address]`. Icons: `linkedin`, `github`, `handshake`, `drive`, `site`. One with no address is left out. The Drive link only shows when signed in. |
| `terms` | To-Do, calendar | One entry per quarter or semester, oldest first. An entry needs only `id`, `name`, `start` and `end`. `end` is the last day of finals and `lastClass` the last day of instruction. A class's `times` are its weekly meetings: `[kind, weekdays (0 Sunday to 6 Saturday), start, end, room]`. |
| `areas` | To-Do | The filters of the list. Three ids mean something to the site and should be kept: `classes` (coursework, including what the Canvas feed adds), `career` (weekly plan steps and application deadlines) and `life` (the Sunday check-in). Any others are free. Each area gets a dot color by its position; an optional `color` (`"#7fbfb0"`) sets one. |
| `todo` | To-Do | Dated tasks. A finished task is deleted, not kept. |
| `done` | | Ids that count as checked for everyone. |
| `start` | Settings | The setup checklist, in groups. |
| `kinds` | Applications | Kinds of application, in the order the filter lists them. |
| `apps` | Applications | Live applications. `status` is one of To start, Deciding, In progress, Applied, Interview, Offer. Closed ones are deleted. |
| `find` | Applications | Places to look for internships. `track` puts a Track button on the card. |
| `months`, `weeks` | Home, To-Do | The focus of each month, and each week's goal and steps. |
| `checkin` | To-Do | The wording of the weekly check-in task that appears each Sunday. Leave it out for no check-in. |
| `works` | Projects | Everything built or done. The Projects page lists the active ones; finished ones and roles (`exp: true`, for a job, club or leadership role) are kept for the portfolio and resumes but not shown there. `targets` is the list of `targets` ids (skills) it covers. `kind` is work, club, personal or class; `status` is active or done; `start` sets the order and `when` is what is shown. `summary` is two or three sentences and `bullets` the lines that sum it up. `plan` names the `projects` entry it continues, `cls` a class. Optional links: `github` (public repos only), `demo`, `page` (its portfolio page), and, shown only when signed in, `drive` (its folder of files) and `notes` (its notes, such as an `obsidian://` link). `public` is true once it is on the portfolio. Mirrors the project notes in the vault; `scripts/projects_from_vault.py` refreshes it. |
| `projects` | Projects | Planned projects: `monthName` (when), `kind`, `title`, `skill`, `why`, `steps` and `portfolio` (what gets published). One that a `works` entry names in `plan` shows inside that card, not under Planned. `idea: true` marks a suggestion that has not been agreed to. `targets` is the list of `targets` ids (skills) it will cover. |
| `portfolio` | Portfolio | `setup` (checklist), `where` (what lives where), `kinds` (what can be public), `parts` (what a project page shows) and `sunday` (the monthly routine). |
| `certs`, `tracks`, `costnote` | Certifications | Certifications, the tracks they belong to, and the line under the cost table. |
| `targets`, `postings` | Targets | The skills target postings ask for, and the postings they were counted from. A target with `soft: true` goes in the non-technical column. |
| `study` | Study guides | Guides, newest first. One saved on the site has `file` (and optional `sheetFile`) under `study/`; one that lives elsewhere has `url` (and optional `sheet`). |
| `later` | School | Every class by year and term (a year's terms are listed under `quarters`, for semester schools too) (`desc`, `project`, `learn`, `value`, and `pre` for what it builds on), plus `summary`, `threads` and `watch`. A quarter's status (taken, now, planned) comes from its dates. |
| `reqs`, `credit` | School | Graduation requirements as the degree audit lists them: `all` rows need every course, `need` rows need that many from `from`. A `need` row with `electives: true` also counts any class inside its `ranges`, each `[department, first number, last number]` (`["CS", 111, 122]`). `credit` lists courses satisfied outside the plan (AP exams). |
