# Setting the site up for someone new

This is the guide Claude follows to fill in `content.js` for a new person. The site's code does not change; only `content/content.js` and `config.js` do.

## 1. Ask first

Ask these before writing anything, as multiple-choice questions where there are choices:

1. **Name** for the greeting.
2. **School, degree and major** (for example: State University, B.S., Computer Science).
3. **Quarter system or semester system.** Always ask; never guess it from the school's name.
4. **Which year they are in**, and when they expect to graduate.
5. **What they want tracked**: classes only, or also applications, projects, certifications and a weekly plan. Sections they do not want are left out, and those pages stay empty.
6. **Links** for Home: LinkedIn, GitHub, Handshake, a Drive folder, a personal website. Any of them can be skipped.

## 2. Build the school sections from their school and major

Requirements are different for every school and major, so they are rebuilt each time, never copied from another person's file.

1. Ask for their **degree audit** (a PDF or screenshot from the school's audit tool) or, failing that, the catalogue page for their major and catalogue year. Do not write requirements from memory: look the catalogue up and say which year it is for.
2. Write `school`: `{"name", "degree", "major", "system"}` with `system` set to `quarter` or `semester` from the answer above.
3. Write `reqs`: a `note` saying where the requirements came from and on what date, then `groups` of `rows`. A row that needs every course has `all`; a row that needs some has `need` and `from`. Use the audit's own group names.
4. Write `credit`: courses already satisfied outside the plan (AP, IB, transfer).
5. Write `later`: one entry per year, each with its terms under `quarters` (three per year on quarters, two on semesters, plus summer when they take classes then). Name a term by season and year ("Fall 2026"). For each course give `code`, `title`, `units` and, when known, `pre` for what it builds on.
6. Write `terms` for the term in session and the next one: dates from the school's academic calendar, and the classes with their meeting times if the person has a schedule to share.
7. Check that every course in `reqs` is either in `later` or in `credit`, and tell the person about any that is in neither.

## 3. Fill in the rest

Only the sections they asked for: `todo` and `areas`, `apps` and `kinds`, `works` and `projects`, `certs` and `tracks`, `months` and `weeks`. `README.md` in this folder describes each one. Write text that does not address the reader ("the plan", never "your plan").

## 4. Settings

`config.js` holds the site's address and the Supabase project. With a project: run `supabase/setup.sql` once in its SQL editor, create the owner's account (the database lets only the first account that saves anything keep data; turning off new sign-ups in the project's Authentication settings is a good extra step), and put the project's address and publishable key in `config.js`. The first time the owner signs in on the site, `content.js` is saved to the database, and from then on content is changed there. Once the content is in the database, add `content` to `.vercelignore` so the file is no longer deployed. Leave the two Supabase lines empty to keep everything in the browser and the content in `content.js`.

## 5. Check

Run `python3 scripts/check.py`, then open the site and look at every page.
