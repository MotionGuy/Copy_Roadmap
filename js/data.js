/* The accent color picked in Settings, kept in this browser. Set before anything draws so the page never flashes the default. */
try { const a = localStorage.getItem("roadmap-accent"); if (a) document.documentElement.dataset.accent = a; } catch(e) {}

/* Hands the content to the rest of the site. Nothing personal is written in this file or in any other script:
   what the site shows is one object of content (described in content/README.md) plus the settings in config.js.
   Each section of the content becomes one constant here, named in capitals, which is what the pages read.

   Where the content comes from, in this order:
     1. the database, when config.js names a Supabase project. The copy fetched last time is kept in this browser and used
        straight away, so the page draws without waiting; js/app.js (pullContent) then checks for a newer one and reloads
        the page if there is. The owner, signed in, gets everything. A visitor gets only the part Home shows.
     2. content/content.js, when that file is there (a site with no database, or one whose content has not been moved yet)
     3. nothing: every page shows its "nothing yet" note
   A section that is missing gets the empty value below. */
const CONTENT_EMPTY = {
  me: "", socials: [], school: {name: "", degree: "", major: "", system: "quarter", depts: {}},
  terms: [], areas: [], todo: [], done: [], start: [],
  kinds: [], apps: [], find: [],
  months: [], weeks: [], checkin: "",
  works: [], projects: [], portfolio: {setup: [], where: [], kinds: [], parts: [], sunday: []},
  certs: [], tracks: [], costnote: "", targets: [], postings: [],
  study: [], later: {years: [], sources: [], summary: [], threads: [], watch: []}, credit: [], reqs: {note: "", groups: []}
};
const CONTENT_KEY = "roadmap-content", CONTENT_FILE = typeof CONTENT === "object" && CONTENT ? CONTENT : null;
const CONTENT_REMOTE = !!(CONFIG.supabaseUrl && CONFIG.supabaseKey);
/* the copy of the database's content kept in this browser: {who: the signed-in user's id or "public", at: when it last changed, data} */
let CONTENT_KEPT = null;
try {
  const me = JSON.parse(localStorage.getItem("roadmap-sync") || "null"), kept = JSON.parse(localStorage.getItem(CONTENT_KEY) || "null");
  if (CONTENT_REMOTE && kept && kept.data && kept.who === (me && me.uid ? me.uid : "public")) CONTENT_KEPT = kept;
} catch(e) {}
/* "database", "file" or "none" */
const CONTENT_FROM = CONTENT_KEPT ? "database" : CONTENT_FILE ? "file" : "none";
/* nothing to show yet, but the database may have it: keep the page blank until pullContent has looked */
if (CONTENT_FROM === "none" && CONTENT_REMOTE) document.documentElement.classList.add("waiting");
const content = Object.assign({}, CONTENT_EMPTY, CONTENT_KEPT ? CONTENT_KEPT.data : CONTENT_FILE || {});
content.portfolio = Object.assign({}, CONTENT_EMPTY.portfolio, content.portfolio);
content.later = Object.assign({}, CONTENT_EMPTY.later, content.later);
content.reqs = Object.assign({}, CONTENT_EMPTY.reqs, content.reqs);
content.school = Object.assign({}, CONTENT_EMPTY.school, content.school);
/* a term can be as little as an id, a name and its two dates */
content.terms = content.terms.map(t => Object.assign({classes: []}, t));
/* likewise a project: the Home-only copy a visitor gets carries just ids and status */
content.works = content.works.map(w => Object.assign({title: "", kind: "", start: "", when: "", status: "", stack: [], bullets: []}, w));
content.projects = content.projects.map(p => Object.assign({title: "", monthName: "", kind: "", skill: "", why: "", portfolio: "", steps: []}, p));

const SITE = CONFIG.site;
const ME = content.me, SOCIALS = content.socials;
/* The school: its name, the degree and major, and whether its year runs on quarters or semesters. TERM_WORD is the word the pages use. */
const SCHOOL = content.school, SEMESTERS = SCHOOL.system === "semester", TERM_WORD = SEMESTERS ? "semester" : "quarter";
const TERMS = content.terms, AREAS = content.areas, TODO = content.todo, DONE = content.done, START = content.start;
const KINDS = content.kinds, APPS = content.apps, FIND = content.find;
const MONTHS = content.months, WEEKS = content.weeks, CHECKIN = content.checkin;
const WORKS = content.works, PROJECTS = content.projects, PORTFOLIO = content.portfolio;
const CERTS = content.certs, TRACKS = content.tracks, COSTNOTE = content.costnote, TARGETS = content.targets, POSTINGS = content.postings;
const STUDY = content.study, LATER = content.later, CREDIT = content.credit, REQS = content.reqs;
