/* The core of the site. Other files hold Home (js/home.js), day planning (js/day.js), Projects (js/work.js),
   the School pages (js/school.js) and the backdrop (js/scene.js).
   Needs config.js, content/content.js and js/data.js loaded first. In this order:
     saved state        what is checked off, added or edited, kept in the browser
     cloud sync         the same state in Supabase, so every device matches; signing in and out
     helpers            dates, escaping, the toast, jumping to a row
     tabs               the four groups in the top bar, their sub-pages, and which page is showing
     to-do              building the list, the Canvas feed, the calendar, finals mode, the To-Do page itself
     quarters           which quarter it is, and the class cards at the top of To-Do
     other pages        applications, find, settings, certifications, targets, portfolio
     filters            the fade-in after a filter changes what a page shows
     events             every click, checkbox and form on those pages
   How a page gets drawn: each has a function named r<Page> that writes its HTML into that page's <section>.
   renderAll() runs them all, and rerender() does that while keeping the scroll position.
   Nothing here talks to the page any other way, so to change what a page shows, change its r function. */
/* ---------- saved state ---------- */
/* state.checks maps an id to the time it was checked off, plus a few keys starting with "_" for things typed in on the site (see CLAUDE.md). */
const KEY = "roadmap-plan-v1";
let state = {checks:{}};
try { const raw = localStorage.getItem(KEY); if (raw) { const s = JSON.parse(raw); if (s && s.checks) state = s; } } catch(e) {}
for (const id of DONE) state.checks[id] = true;
function localSave(){ try { localStorage.setItem(KEY, JSON.stringify(state)); } catch(e) {} }
/* Housekeeping before each save: forget tasks added on the site a week after they were finished, and edits to tasks that no longer exist. */
function tidy(){
  const ed = state.checks._edits;
  if (ed && typeof ed === "object"){ const live = new Set(TODO.map(x => x.id).concat(WEEKS.flatMap(w => w.steps.map(s => s.id).concat([w.sun])))); for (const id of Object.keys(ed)) if (!live.has(id) && !id.startsWith("cv-")) delete ed[id]; if (!Object.keys(ed).length) delete state.checks._edits; }
  const sb = state.checks._subs;
  if (sb && typeof sb === "object"){ const live = new Set(TODO.map(x => x.id).concat(WEEKS.flatMap(w => w.steps.map(s => s.id).concat([w.sun])), added().map(x => x.id))); for (const id of Object.keys(sb)) if (!live.has(id) && !id.startsWith("cv-")) delete sb[id]; if (!Object.keys(sb).length) delete state.checks._subs; }
  const pr = state.checks._prio;
  if (pr && typeof pr === "object"){ const live = new Set(TODO.map(x => x.id).concat(WEEKS.flatMap(w => w.steps.map(s => s.id).concat([w.sun])), added().map(x => x.id))); for (const id of Object.keys(pr)) if (!live.has(id) && !/^(cv|apd)-/.test(id)) delete pr[id]; if (!Object.keys(pr).length) delete state.checks._prio; }

  const old = Date.now() - 7 * 86400000, gone = added().filter(x => typeof state.checks[x.id] === "number" && state.checks[x.id] < old);
  if (!gone.length) return;
  for (const x of gone) delete state.checks[x.id];
  state.checks._added = added().filter(x => !gone.includes(x));
}
function save(){ tidy(); localSave(); queuePush(); }

/* ---------- cloud sync (Supabase): keeps checkmarks the same on every device ---------- */
const SYNC_URL = CONFIG.supabaseUrl, SYNC_KEY = CONFIG.supabaseKey;
const SKEY = "roadmap-sync";
let sess = null; try { sess = JSON.parse(localStorage.getItem(SKEY)); } catch(e) {}
let pushT = null, notesT = 0, syncMsg = "", syncForm = false;
const syncOn = () => !!(SYNC_URL && SYNC_KEY);
/* Visitors who are not signed in see the owner's progress, read-only. */
const viewOnly = () => syncOn() && !sess;
async function pullPublic(){
  try {
    const rows = await api("/rest/v1/roadmap_progress?select=checks&limit=1", {}, false);
    if (rows && rows[0]) { state = {checks: rows[0].checks || {}}; for (const id of DONE) if (!state.checks[id]) state.checks[id] = true; }
  } catch(e) {}
  syncMsg = "";
  rerender();
}
function setSess(s){ sess = s; try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch(e) {} }
async function api(path, opt, auth){
  opt = opt || {};
  const hd = Object.assign({"apikey": SYNC_KEY, "Content-Type": "application/json"}, opt.headers || {});
  if (auth !== false && sess) hd.Authorization = "Bearer " + sess.access_token;
  const r = await fetch(SYNC_URL + path, Object.assign({}, opt, {headers: hd}));
  if (!r.ok) throw new Error("HTTP " + r.status);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}
function keepSess(d){ setSess({access_token: d.access_token, refresh_token: d.refresh_token, uid: d.user.id, email: d.user.email, exp: Date.now() + (d.expires_in - 60) * 1000}); }
async function freshSess(){
  if (!sess) return false;
  if (Date.now() < sess.exp) return true;
  try { keepSess(await api("/auth/v1/token?grant_type=refresh_token", {method: "POST", body: JSON.stringify({refresh_token: sess.refresh_token})}, false)); return true; }
  catch(e){ setSess(null); return false; }
}
/* Redraw everything in place. Keeps the scroll position, and anything half-typed in an add form, since a background sync can land mid-keystroke. */
function rerender(){
  const y = window.scrollY, tab = location.hash.slice(1) || "plan";
  const typed = [...document.querySelectorAll(".addrow input, .addrow select")].map(el => [el.id, el.value]), focus = document.activeElement && document.activeElement.closest(".addrow") ? document.activeElement.id : "";
  const pad = document.activeElement && document.activeElement.id === "notes" ? document.activeElement : null, caret = pad ? [pad.selectionStart, pad.selectionEnd, pad.scrollTop, pad.value] : null;
  renderAll(); show(tab);
  const big = document.getElementById("notes-big"); if (big && document.activeElement !== big) big.value = typeof state.checks._notes === "string" ? state.checks._notes : "";
  if (caret){ const el = document.getElementById("notes"); if (el){ el.value = caret[3]; el.focus(); el.setSelectionRange(caret[0], caret[1]); el.scrollTop = caret[2]; } }
  for (const [id, v] of typed){ const el = document.getElementById(id); if (el) el.value = v; }
  if (focus){ const el = document.getElementById(focus); if (el) el.focus(); }
  window.scrollTo(0, y);
}
async function pull(){
  if (!syncOn()) return;
  if (pushT || notesT) return; /* something typed here has not been sent yet: do not overwrite it */
  if (!(await freshSess())) { await pullPublic(); drawSync(); return; }
  try {
    const rows = await api("/rest/v1/roadmap_progress?select=checks&user_id=eq." + sess.uid);
    if (rows && rows[0]) {
      state = {checks: rows[0].checks || {}};
      for (const id of DONE) if (!state.checks[id]) state.checks[id] = true;
      localSave(); rerender();
      syncMsg = "Synced";
    } else { await push(); }
  } catch(e){ syncMsg = "Offline: saved on this device only"; }
  drawSync();
}
async function push(){
  pushT = null;
  if (!syncOn() || !(await freshSess())) { drawSync(); return; }
  try {
    await api("/rest/v1/roadmap_progress?on_conflict=user_id", {method: "POST", headers: {"Prefer": "resolution=merge-duplicates,return=minimal"}, body: JSON.stringify({user_id: sess.uid, checks: state.checks, updated_at: new Date().toISOString()})});
    syncMsg = "Synced";
  } catch(e){ syncMsg = "Couldn't sync: saved on this device only"; }
  drawSync();
}
/* ---------- Claude skills ----------
   Some pages have a Claude skill that fills them in or keeps them up to date. Those pages carry the same small icon at the
   right end of their top bar; it opens the skill's text over the page, ready to copy and save as a skill in Claude.
   The text is the file skills/<name>/SKILL.md, fetched the first time it is asked for. */
const SKILLS = {
  school: "career-roadmap-builder", later: "career-roadmap-builder",
  projects: "roadmap-project-planner", portfolio: "roadmap-project-planner", certs: "roadmap-certification-planner",
  study: "interactive-exam-study-guide",
  todo: "roadmap-checkin"
};
const SKILL_ICON = `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2.500l1.700 4.300a2 2 0 0 0 1.100 1.100l4.300 1.700-4.300 1.700a2 2 0 0 0-1.100 1.100L10 16.700l-1.700-4.300a2 2 0 0 0-1.100-1.100L2.900 9.600l4.300-1.700a2 2 0 0 0 1.100-1.100z"/><path d="M16 14.500v3M14.500 16h3"/></svg>`;
/* the icon for a page's bar, or nothing when the page has no skill (or for a visitor) */
const skillTool = page => SKILLS[page] && !viewOnly() ? `<button class="tool skilltool" data-skill="${SKILLS[page]}" aria-label="Claude skill for this page" title="Claude skill for this page">${SKILL_ICON}</button>` : "";
let skillNow = "", skillText = {};
function rSkill(){
  const el = $("#skill"); if (!el || el.hidden) return;
  const text = skillText[skillNow], desc = text ? ((/^description:\s*"?(.*?)"?\s*$/m.exec(text) || [])[1] || "").replace(/\\"/g, '"') : "";
  el.innerHTML = `<div class="mapbox skillbox" role="dialog" aria-modal="true" aria-label="Claude skill"><div class="maphead">
      <h2>Claude skill <span class="bc-yr">${esc(skillNow)}</span></h2><button class="tool" id="skill-close" aria-label="Close">${X_ICON}</button></div>
    ${text == null ? `<p class="sk-note">Loading.</p>` : text === false ? `<p class="sk-note">The skill could not be loaded.</p>` : `
    ${desc ? `<p class="sk-desc">${esc(desc)}</p>` : ""}
    <div class="sk-bar"><span class="small muted">Copy it, then ask Claude to save it as a skill.</span><button class="btn pink" id="skill-copy">Copy</button></div>
    <pre class="sk-pre" id="skill-text" tabindex="0" title="Click to copy">${esc(text)}</pre>`}</div>`;
}
async function skillCopy(){
  const text = skillText[skillNow]; if (!text) return;
  try { await navigator.clipboard.writeText(text); }
  catch(e){ const t = document.createElement("textarea"); t.value = text; t.style.position = "fixed"; t.style.opacity = "0"; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); } catch(e2) {} t.remove(); }
  toast("Copied");
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-skill]");
  if (b){
    skillNow = b.dataset.skill; overlay("skill", true); rSkill();
    if (skillText[skillNow] == null) fetch("skills/" + skillNow + "/SKILL.md").then(r => r.ok ? r.text() : Promise.reject()).then(t => { skillText[skillNow] = t; }, () => { skillText[skillNow] = false; }).then(rSkill);
    return;
  }
  if (e.target.closest && e.target.closest("#skill-copy, #skill-text")) skillCopy();
});

/* ---------- content from the database ----------
   The content lives in the table roadmap_content: the owner's row "content" holds all of it, and the database keeps a second
   row, "home", with only what Home shows, which is the one row a visitor may read (supabase/setup.sql). This asks when the
   right row last changed and, if this browser's copy is older or belongs to someone else, fetches it, keeps it and reloads
   the page so every script starts from the new content. Nothing is reloaded while something typed here is still unsent. */
async function pullContent(){
  const done = () => document.documentElement.classList.remove("waiting");
  if (!syncOn()) return done();
  try {
    const signed = await freshSess(), who = signed ? sess.uid : "public";
    const q = "/rest/v1/roadmap_content?part=eq." + (signed ? "content&user_id=eq." + sess.uid : "home") + "&limit=1&select=";
    const head = await api(q + "updated_at", {}, signed), at = head && head[0] && head[0].updated_at;
    if (!at){
      /* nothing saved yet: the first signed-in load puts this copy's content file into the database */
      if (signed && CONTENT_FROM === "file"){
        await api("/rest/v1/roadmap_content?on_conflict=user_id,part", {method: "POST", headers: {"Prefer": "resolution=merge-duplicates,return=minimal"}, body: JSON.stringify({user_id: sess.uid, part: "content", data: CONTENT_FILE})});
        toast("Content saved to the database");
      }
      return done();
    }
    if (CONTENT_KEPT && CONTENT_KEPT.who === who && CONTENT_KEPT.at === at) return done();
    if (pushT || notesT) return done();
    const rows = await api(q + "data,updated_at", {}, signed);
    if (!rows || !rows[0]) return done();
    const kept = JSON.stringify({who, at: rows[0].updated_at, data: rows[0].data});
    localStorage.setItem(CONTENT_KEY, kept);
    if (localStorage.getItem(CONTENT_KEY) === kept){ location.reload(); return; }
  } catch(e) {}
  done();
}
function queuePush(){ if (!syncOn() || !sess) return; clearTimeout(pushT); syncMsg = "Saving"; drawSync(); pushT = setTimeout(push, 600); }
async function signIn(email, pw){
  try { keepSess(await api("/auth/v1/token?grant_type=password", {method: "POST", body: JSON.stringify({email: email, password: pw})}, false)); syncForm = false; syncMsg = ""; await pull(); pullContent(); }
  catch(e){ syncMsg = "Sign-in failed. Check the email and password."; drawSync(); }
}
function drawSync(){
  const el = document.getElementById("sync"); if (!el) return;
  if (!syncOn()) { el.innerHTML = ""; return; }
  if (sess) { el.innerHTML = `<button class="tool" id="notes-open" aria-label="Notes" title="Notes">${NOTE_ICON}</button><span title="Signed in as ${esc(sess.email)}">${esc(syncMsg || "Sync on")}</span> · <button class="btn" id="sync-out" title="Signed in as ${esc(sess.email)}">Sign out</button>`; return; }
  if (!syncForm) { el.innerHTML = `Read-only view${syncMsg ? " · " + esc(syncMsg) : ""} · <button class="btn" id="sync-open">Owner sign in</button>`; return; }
  el.innerHTML = `<form id="sync-form" class="row"><input type="email" id="sync-email" placeholder="Email" autocomplete="username" required style="font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:8px"><input type="password" id="sync-pw" placeholder="Password" autocomplete="current-password" required style="font:inherit;padding:6px 10px;border:1px solid var(--line);border-radius:8px"><button class="btn pink" type="submit">Sign in</button><button class="btn" type="button" id="sync-cancel">Cancel</button></form>${syncMsg ? `<div>${esc(syncMsg)}</div>` : ""}`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("#sync button"); if (!b) return;
  if (b.id === "sync-open") { syncForm = true; syncMsg = ""; drawSync(); const i = document.getElementById("sync-email"); if (i) i.focus(); }
  if (b.id === "sync-cancel") { syncForm = false; syncMsg = ""; drawSync(); }
  if (b.id === "sync-out") { setSess(null); syncMsg = ""; pull().then(pullContent); }
});
/* ---------- overlays ---------- */
/* Overlays (settings, calendar, course map, graduation requirements and the rest). Each file adds its own to OVERLAYS as id -> the function that draws it.
   While one is open the page behind stops scrolling and, being covered, stops drawing its frosted glass (html.covered in the stylesheet).
   Escape, or a click on the dimmed space around the box, closes whatever is open. */
const OVERLAYS = {};
OVERLAYS.skill = rSkill; /* drawn by the Claude skills code above */
function overlay(id, on){
  const m = $("#" + id); if (m.hidden === !on) return;
  m.hidden = !on;
  const root = document.documentElement, covered = !!$(".mapover:not([hidden]), .setover:not([hidden])");
  root.style.overflow = covered ? "hidden" : ""; root.classList.toggle("covered", covered);
  if (on){ OVERLAYS[id](); const c = m.querySelector(".maphead .tool, .sethead .tool"); if (c) c.focus(); }
}
const closeOverlays = () => { for (const id in OVERLAYS) overlay(id, false); };
document.addEventListener("keydown", e => { if (e.key === "Escape") closeOverlays(); });
/* A button whose id is an overlay's id plus "-open" or "-close" (map-open, settings-close) opens or closes it with nothing else to wire up. */
document.addEventListener("click", e => {
  if (Object.hasOwn(OVERLAYS, e.target.id)){ overlay(e.target.id, false); return; }
  const b = e.target.closest && e.target.closest('[id$="-open"], [id$="-close"]'), m = b && /^(.+)-(open|close)$/.exec(b.id);
  if (m && Object.hasOwn(OVERLAYS, m[1])) overlay(m[1], m[2] === "open");
});

/* ---------- notes (overlay) ---------- */
/* The same scratch pad as the small one on To-Do, at full size. The note icon beside the sync label opens it from any page,
   and so does a double click on the small pad. Only shown when signed in. */
const NOTE_ICON = `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.500 3h8.300L15.500 5.700V17h-11z"/><path d="M12.500 3v3h3M7 9.500h6M7 12.500h6M7 15h3.500"/></svg>`;
function rNotesBig(){
  $("#notesbig").innerHTML = `<div class="mapbox notesbox" role="dialog" aria-modal="true" aria-label="Notes"><div class="maphead"><h2>Notes</h2><button class="tool" id="notesbig-close" aria-label="Close">${X_ICON}</button></div>
    <textarea id="notes-big" spellcheck="false" aria-label="Notes" placeholder="Anything worth keeping in view.">${esc(typeof state.checks._notes === "string" ? state.checks._notes : "")}</textarea>
    <p class="rqnote">Saved while typing and synced to every device. The saved data is publicly readable, so nothing private belongs here.</p></div>`;
}
OVERLAYS.notesbig = rNotesBig;
const notesShow = on => { if (on && viewOnly()) return; overlay("notesbig", on); if (on){ const t = $("#notes-big"); t.focus(); t.setSelectionRange(t.value.length, t.value.length); } };
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#notes-open")) notesShow(true); });
document.addEventListener("dblclick", e => { if (e.target.id === "notes") notesShow(true); });
/* The scratch pad saves on every keystroke: straight to this device, and to the synced data a moment after typing stops. */
document.addEventListener("input", e => {
  if (e.target.id !== "notes" && e.target.id !== "notes-big") return;
  state.checks._notes = e.target.value.slice(0, 20000); localSave();
  /* the small pad on To-Do and the big one in the overlay hold the same text */
  const other = document.getElementById(e.target.id === "notes" ? "notes-big" : "notes"); if (other) other.value = e.target.value;
  clearTimeout(notesT); notesT = setTimeout(() => { notesT = 0; save(); }, 700);
});
document.addEventListener("change", e => { if (e.target.id === "kind-sel"){ appKind = e.target.value; rApps(); const k = $("#kind-sel"); if (k) k.focus(); }
  if (e.target.id === "cert-track"){ certFilter = e.target.value; rCerts(); const c = $("#cert-track"); if (c) c.focus(); }
  if (e.target.id === "area-sel"){ todoFilter = e.target.value; rTodo(); const s = $("#area-sel"); if (s) s.focus(); } });
document.addEventListener("submit", e => {
  if (e.target.id === "add-form"){
    e.preventDefault();
    const t = $("#add-t").value.trim(); if (!t) return;
    const item = {id: "u-" + Date.now().toString(36), a: $("#add-a").value, t};
    if ($("#add-cls").value.trim()) item.cls = $("#add-cls").value.trim();
    if ($("#add-d").value) item.due = $("#add-d").value;
    if ($("#add-rep").value){ item.rep = $("#add-rep").value; if (!item.due) item.due = isoOf(today()); }
    state.checks._added = added().concat([item]);
    e.target.reset();
    save(); rerender(); toast("Added"); const i = $("#add-t"); if (i) i.focus();
    return;
  }
  if (e.target.id === "ed-form"){
    e.preventDefault();
    const id = e.target.dataset.id, t = $("#ed-t").value.trim(), due = $("#ed-d").value, cur = openItems().find(i => i.id === id), mine = added().find(x => x.id === id);
    editId = null;
    if (!t || !cur){ rerender(); return; }
    if (mine){ mine.t = t; if (due) mine.due = due; else delete mine.due; const r = $("#ed-rep"); if (r && r.value){ mine.rep = r.value; if (!mine.due) mine.due = isoOf(today()); } else delete mine.rep; state.checks._added = added().slice(); }
    else if (t !== cur.t || due !== (cur.due || "")){
      const e2 = Object.assign({}, edits()[id]);
      if (t !== cur.t) e2.t = t;
      if (due !== (cur.due || "")) e2.due = due;
      state.checks._edits = Object.assign({}, edits(), {[id]: e2});
    }
    save(); rerender(); toast("Saved");
    return;
  }
  if (e.target.id === "cv-form"){
    e.preventDefault();
    const u = $("#cv-url").value.trim();
    if (!/^https:\/\/[\w.-]+\/feeds\/calendars\/[\w.-]+\.ics$/.test(u)){ canvasMsg = "That does not look like a Canvas calendar feed link."; rerender(); return; }
    lsSet(CV_URL, u); canvasMsg = "Connecting..."; rerender(); canvasPull(true);
    return;
  }
  if (e.target.id === "app-form"){
    e.preventDefault();
    const org = $("#app-org").value.trim(); if (!org) return;
    trackApp(org, $("#app-role").value.trim(), $("#app-url").value.trim(), $("#app-due").value, $("#app-kind").value, $("#app-loc").value.trim()); appAddOpen = false; rApps(); toast("Added to the board");
    return;
  }
  if (e.target.id !== "sync-form") return;
  e.preventDefault();
  signIn(document.getElementById("sync-email").value.trim(), document.getElementById("sync-pw").value);
});
document.addEventListener("visibilitychange", () => { if (!document.hidden) pull().then(pullContent); });
const isOn = id => !!state.checks[id];
/* Things added on the site itself are saved alongside the checkmarks, so they sync the same way. */
const added = () => Array.isArray(state.checks._added) ? state.checks._added : [];
/* Changes made to a task's wording or date from the To-Do page, kept by task id. Tasks added on the site are edited in place instead. */
/* state.checks._prio is {task id: 1} for tasks starred as a priority: they sit in their own group at the top of To-Do whatever their due date. */
const prios = () => state.checks._prio && typeof state.checks._prio === "object" ? state.checks._prio : {};
const edits = () => state.checks._edits && typeof state.checks._edits === "object" ? state.checks._edits : {};
const appsAdded = () => Array.isArray(state.checks._appsAdded) ? state.checks._appsAdded : [];
const appStage = a => (state.checks._apps && state.checks._apps[a.id]) || (/Applied/.test(a.status) ? "Applied" : /Interview/.test(a.status) ? "Interview" : /Offer/.test(a.status) ? "Offer" : "To start");

/* ---------- helpers ---------- */
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const MS = 86400000;
function parseD(s){ const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); }
function fmt(d){ return d.toLocaleDateString("en-US",{month:"short", day:"numeric"}); }
function weekRange(w){ const a = parseD(w.start); return fmt(a) + " to " + fmt(new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6)); }
function today(){ const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
function currentWeek(){
  const t = today(), w = WEEKS.find(w => { const d = daysBetween(parseD(w.start), t); return d >= 0 && d < 7; });
  if (w || WEEKS.length) return w || (t < parseD(WEEKS[0].start) ? WEEKS[0] : WEEKS[WEEKS.length - 1]);
  /* no weekly plan in the content: a blank week starting this Monday, so the pages that ask for the week still draw */
  return {id: "", start: isoOf(new Date(t.getFullYear(), t.getMonth(), t.getDate() - (t.getDay() + 6) % 7)), goal: "", steps: []};
}
/* A week's open steps (finished ones are cleared), then its Sunday check-in. */
function ck(id, text, extra){
  return `<label class="ck${isOn(id)?" done":""}"><input type="checkbox" data-id="${id}"${isOn(id)?" checked":""}${viewOnly()?" disabled":""}><span>${text}${extra||""}</span></label>`;
}
/* Whole days from one local date to another. Rounded, so a 23 or 25 hour day at a clock change still counts as one. */
const daysBetween = (a, b) => Math.round((b.getTime() - a.getTime()) / MS);
/* Scroll an element (or several) to just under the top bar and outline it for a moment. */
function jumpTo(els, gap){
  els = [].concat(els || []).filter(Boolean); if (!els.length) return;
  els[0].scrollIntoView({block: "start"}); window.scrollBy(0, -navH() - (gap || 16));
  for (const el of els){ el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1600); }
}
/* Tell the backdrop how busy the list is: due today, overdue, and due today or tomorrow. */
function sceneLoad(){
  if (!window.scene) return;
  const open = openItems();
  scene.load(open.filter(i => i.bucket === "today" || (i.prio && i.bucket !== "late")).length, open.filter(i => i.bucket === "late").length, open.filter(i => i.days === 0 || i.days === 1 || (i.prio && !(i.days < 0))).length);
}
const X_ICON = `<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>`;
let toastT;
let undoFn = null;
function toast(msg, undoId){ const t = $("#toast"); t.textContent = msg; t.classList.toggle("act", !!undoId); if (undoId){ const b = document.createElement("button"); b.textContent = "Undo"; if (typeof undoId === "function"){ undoFn = undoId; b.dataset.undo = "fn"; } else b.dataset.undo = undoId; t.appendChild(b); } t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("show", "act"), undoId ? 6000 : 1900); }

/* ---------- tabs ---------- */
/* Four groups keep the top bar short: home (the roadmap), the list, school, and projects. A group's pages sit to the right of the groups, in the same row. */
const GROUPS = [
  {id:"g-home", name:"Home", tabs:[["plan","Roadmap"]]},
  {id:"g-todo", name:"To-Do", tabs:[["todo","Tasks"],["apps","Applications"]]},
  {id:"g-school", name:"School", tabs:[["school","Overview"],["later","Academic plan"],["study","Study guides"]]},
  {id:"g-projects", name:"Projects", tabs:[["projects","Overview"],["portfolio","Portfolio"],["certs","Certifications"]]}
];
/* Pages that share a tab: they are stacked on their parent's page, and a link to one opens the parent and scrolls down to it. */
const UNDER = {};
const TABS = GROUPS.flatMap(g => g.tabs);
const groupOf = id => GROUPS.find(g => g.tabs.some(t => t[0] === id));
const lastTab = {};
const navH = () => $("nav.tabs").offsetHeight;
const ARRIVE_MS = 460; /* long enough for the page's ease-in (section.tab.on) and the scene coming into focus (#sky) in the stylesheet */
let navGroup = "", navWas = 0;
function drawNav(id){
  const g = groupOf(id);
  lastTab[g.id] = id;
  sceneLoad(); if (window.scene) scene.quiet(finalsOn());
  $("#grouplist").innerHTML = GROUPS.map(x => `<button data-group="${x.id}" data-name="${esc(x.name)}" aria-pressed="${x === g}">${esc(x.name)}</button>`).join("");
  $("#tablist").innerHTML = g.tabs.length > 1 ? g.tabs.map(([t, name]) => `<button role="tab" data-tab="${t}" aria-selected="${t === id}">${esc(name)}</button>`).join("") : "";
  /* moving to another main page slides its sub-pages out from the left; switching between sub-pages does not */
  const tl = $("#tablist"); tl.classList.remove("slide"); if (navGroup && navGroup !== g.id){ void tl.offsetWidth; tl.classList.add("slide"); } navGroup = g.id;
  const on = $('#tablist [aria-selected="true"]'); if (on) on.scrollIntoView({block:"nearest", inline:"nearest"});
  const h = navH(); if (h !== navWas){ navWas = h; document.documentElement.style.setProperty("--navh", h + "px"); }
}
/* Which pages are showing. Home softens the scene behind it. A page that has just opened is marked "arriving" while it eases in:
   it is see-through for that moment, so its frosted glass has nothing to blur and the stylesheet leaves it out until the page has settled. */
let arriveT = 0;
function openPages(on, home){
  let fresh = null;
  document.querySelectorAll("section.tab").forEach(s => { const now = on(s); if (now && !s.classList.contains("on")) fresh = fresh || s; s.classList.toggle("on", now); s.classList.remove("arriving"); });
  document.documentElement.classList.toggle("athome", home);
  if (window.scene) scene.blurred(home);
  clearTimeout(arriveT);
  if (fresh && !home){ fresh.classList.add("arriving"); arriveT = setTimeout(() => fresh.classList.remove("arriving"), ARRIVE_MS); }
}
function show(id){
  /* Visitors get the Home page only, with no tabs and nothing to click through to. */
  if (viewOnly()){
    openPages(s => s.id === "plan", true);
    $("#grouplist").innerHTML = ""; $("#tablist").innerHTML = "";
    sceneLoad();
    return;
  }
  /* Settings used to be a page; old links to it open the overlay instead */
  if (id === "overview" || id === "start" || id === "settings"){ setTimeout(() => overlay("settings", true), 0); id = lastTab["g-todo"] || "todo"; }
  let jump = UNDER[id] ? id : "";
  if (UNDER[id]) id = UNDER[id];
  if (id === "map") id = "later"; /* the course map used to be its own page */
  if (id === "targets"){ id = "projects"; setTimeout(() => overlay("targets", true), 0); } /* targets used to be a page */
  if (id === "find"){ id = "apps"; setTimeout(() => overlay("find", true), 0); } /* the postings list used to sit under Applications */
  if (!TABS.some(t => t[0] === id)) id = "plan"; /* the roadmap is the home page */
  openPages(s => s.id === id || UNDER[s.id] === id, id === "plan");
  drawNav(id); alignSide();
  window.scrollTo(0,0);
  if (jump){ const el = document.getElementById(jump); if (el){ el.scrollIntoView({block:"start"}); window.scrollBy(0, -navH() - 10); } }
}
window.addEventListener("hashchange", () => show(location.hash.slice(1)));


/* ---------- to-do: one current list; done things are cleared, not crossed out ---------- */
/* A step from the weekly plan with no "a" is internship-search work. */
const stepArea = s => s.a || "career";
/* Open items: every unfinished TODO task, plus unfinished weekly-plan steps from this week and earlier, plus later steps that carry a due date. */
function openItems(){
  const cw = currentWeek(), cwT = parseD(cw.start).getTime(), out = [];
  for (const x of TODO.concat(added(), canvasItems())) if (!isOn(x.id)) out.push({id:x.id, a:x.a, cls:x.cls, t:x.t, due:x.due, time:x.time, note:x.note, rep:x.rep, soft: x.due ? null : "No date"});
  for (const x of appTasks(out)) out.push(x);
  for (const w of WEEKS){
    const wT = parseD(w.start).getTime();
    for (const st of w.steps){
      if (isOn(st.id)) continue;
      if (wT <= cwT) out.push({id:st.id, a:stepArea(st), t:st.t, due:st.due, soft: st.due ? null : (wT < cwT ? "Carried over" : "This week"), sort: st.due ? null : (wT < cwT ? -0.5 : 6.5)});
      else if (st.due) out.push({id:st.id, a:stepArea(st), t:st.t, due:st.due});
    }
  }
  /* the weekly Sunday check-in, due on the Sunday of the current week */
  if (CHECKIN && cw.sun && !isOn(cw.sun)){ const m = parseD(cw.start), d = new Date(m.getFullYear(), m.getMonth(), m.getDate() + 6), p2 = n => String(n).padStart(2, "0"); out.push({id: cw.sun, a: "life", t: CHECKIN, due: d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate())}); }
  const t0 = today().getTime(), sun = (7 - ((today().getDay() + 6) % 7)) - 1, ed = edits(), pr = prios();
  for (const i of out){
    const e = ed[i.id];
    i.prio = !!pr[i.id];
    if (e){ if (e.t) i.t = e.t; if ("due" in e){ i.due = e.due || undefined; if (i.due){ i.soft = null; i.sort = null; } else if (!i.soft) i.soft = "No date"; } }
    i.days = i.due ? daysBetween(today(), parseD(i.due)) : null;
    i.key = i.due ? i.days : (i.sort === -0.5 ? -0.5 : sun + 0.5);
    i.bucket = i.due ? (i.days < 0 ? "late" : i.days === 0 ? "today" : i.days <= sun ? "week" : i.days <= sun + 7 ? "next" : "later") : "week";
  }
  return out.sort((x, y) => x.key - y.key);
}
function whenText(i){
  if (!i.due) return `<b>${esc(i.soft)}</b>`;
  const d = parseD(i.due), rel = i.days < 0 ? (i.days === -1 ? "1 day late" : -i.days + " days late") : i.days === 0 ? "Today" : i.days === 1 ? "Tomorrow" : "In " + i.days + " days";
  return `<b>${rel}</b>${d.toLocaleDateString("en-US",{weekday:"short", month:"short", day:"numeric"})}${i.time ? ", " + esc(i.time) : ""}`;
}
const STAR = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.800l2.200 4.500 5 .700-3.600 3.500.850 4.900L10 14.100l-4.450 2.300.850-4.900L2.800 8l5-.700z"/></svg>`;
const PENCIL = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13.6 3.4l3 3L7 16l-3.8.8L4 13z"/><path d="M11.8 5.2l3 3"/></svg>`;
function todoRow(i, bare){
  const area = AREAS.find(x => x.id === i.a);
  if (!bare && editId === i.id && !viewOnly()) return `<form class="addrow edrow" id="ed-form" data-id="${esc(i.id)}"><input type="text" id="ed-t" value="${esc(i.t)}" aria-label="Task" required><input type="date" id="ed-d" value="${esc(i.due || "")}" aria-label="Due date">${added().some(x => x.id === i.id) ? repSelect("ed-rep", i.rep) : ""}<button class="btn pink" type="submit">Save</button><button class="btn" type="button" id="ed-cancel">Cancel</button><button class="btn del" type="button" id="ed-del">Delete</button></form>`;
  if (bare) return `<label class="todo${i.days !== null && i.days <= 1 ? " soon" : ""}"><input type="checkbox" data-id="${i.id}"${viewOnly()?" disabled":""}><span class="tx">${esc(i.t)}${i.note ? `<span class="meta"><span class="small muted">${esc(i.note)}</span></span>` : ""}</span><span class="when">${whenText(i)}</span></label>`;
  const app = i.id.startsWith("apd-"), ro = viewOnly(), subs = subsOf(i.id);
  return `<label class="todo${i.days !== null && i.days <= 1 ? " soon" : ""}${i.prio ? " prio" : ""}" data-due="${i.due || ""}"${ro || app ? "" : ` draggable="true" data-drag="${esc(i.id)}"`}><input type="checkbox" data-id="${i.id}"${ro?" disabled":""}><span class="tx">${i.cls ? `<b>${esc(i.cls)}</b> ` : ""}${esc(i.t)}<span class="meta"><span class="chip"><i class="dot ${esc(i.a)}"></i>${esc(area ? area.name : i.a)}</span>${i.rep ? `<span class="small muted repmark" title="Repeats ${repName(i.rep)}">${REP_ICON}${repName(i.rep)}</span>` : ""}${subs.length ? `<span class="small muted">${subs.filter(s => s.d).length} of ${subs.length} steps</span>` : ""}${i.note ? `<span class="small muted">${esc(i.note)}</span>` : ""}${ro ? (i.prio ? `<span class="starmark" title="Priority">${STAR}</span>` : "") : `<button class="rowed star${i.prio ? " on" : ""}" type="button" data-prio="${esc(i.id)}" aria-pressed="${i.prio}" aria-label="Priority" title="${i.prio ? "Take off the priority list" : "Make it a priority: working on it today"}">${STAR}</button>${app ? "" : `<button class="rowed" type="button" data-edit="${esc(i.id)}" aria-label="Edit task" title="Edit, reschedule or delete">${PENCIL}</button>`}<button class="rowed" type="button" data-subadd="${esc(i.id)}" aria-label="Add steps" title="Break it into steps">${STEP_ICON}</button>`}</span></span><span class="when">${whenText(i)}</span></label>${subsHtml(i)}`;
}
/* Each area's dot color: its own "color" when the content gives one, otherwise the next of five by the order of the areas. */
{ const st = document.createElement("style"), five = ["#6f9fe6", "#b79be0", "#7fbfb0", "#e0b36a", "#b9b9c2"];
  st.textContent = AREAS.map((x, n) => `.dot.${CSS.escape(String(x.id))}{background:${/^#[0-9a-f]{3,8}$/i.test(x.color || "") ? x.color : five[n % 5]}}`).join("");
  document.head.appendChild(st); }

/* ---------- Examples ----------
   What a section shows while it has never had anything in it: one faded sample of what belongs there and a line on what it is
   for. The sample is drawn, not saved: it cannot be clicked, and it goes away as soon as the section has real content. */
const exRow = (title, chip, extra, when) => `<div class="tgroup"><div class="pjrow"><div class="pjrow-top"><i class="pj-dot"></i><span class="tx"><b>${title}</b><span class="meta"><span class="chip">${chip}</span>${extra ? `<span class="small muted">${extra}</span>` : ""}</span></span><span class="when">${when}</span></div></div></div>`;
const EXAMPLES = {
  todo: ["Tasks go here, grouped by how soon they are due. Checking one off removes it.",
    () => `<div class="tgroup"><label class="todo"><input type="checkbox" disabled><span class="tx"><b>CS 101</b> Problem set 3<span class="meta"><span class="chip">Classes</span></span></span><span class="when">Fri</span></label></div>`],
  apps: ["Each application is a card that moves across the stages, with its deadline counted down.",
    () => `<div class="app"><div class="app-top"><h3>Acme Robotics</h3></div><p class="app-desc">Software Engineering Intern</p><p class="app-due">Jan 15<em>55 days left</em></p></div>`],
  school: ["Every class in the degree, laid out by year and term, with graduation requirements checked against it.",
    () => { const tile = (st, code, title) => `<span class="ptile st-${st}"><span><b>${code}:</b> ${title}</span></span>`, cells = SEMESTERS
        ? [["Fall", tile("taken", "CS 101", "Introduction to Programming") + tile("taken", "MATH 120", "Calculus I")], ["Spring", tile("now", "CS 201", "Data Structures") + tile("now", "MATH 121", "Calculus II")]]
        : [["Fall", tile("taken", "CS 101", "Introduction to Programming") + tile("taken", "MATH 120", "Calculus I")], ["Winter", tile("now", "CS 201", "Data Structures") + tile("now", "MATH 121", "Calculus II")], ["Spring", tile("later", "CS 210", "Computer Organization") + tile("later", "STAT 200", "Statistics")]];
      return `<div class="card schoolbox"><div class="pgrid" style="--cols:${cells.length}"><div></div>${cells.map(c => `<div class="pg-h">${c[0]}</div>`).join("")}<div class="pg-y"><em><b>Year 1</b><span>24 units</span></em></div>${cells.map((c, n) => `<div class="pg-c${n === 1 ? " now" : ""}">${c[1]}</div>`).join("")}</div></div>`; }],
  later: ["One card per class, term by term: what it covers, what gets built in it and what it leads to.",
    () => `<div class="card pcard"><div class="phead"><div><span class="pcode">CS 201</span><h3>Data Structures</h3></div><span class="ptags"><span class="chip">4 units</span></span></div><p class="pdesc">Lists, trees, hash tables and graphs, and how to pick between them.</p></div>`],
  study: ["Study guides are listed under the class they are for, newest first.",
    () => `<div class="card pcard sgcard"><div class="phead"><div><span class="pcode">CS 201</span><h3>Data Structures</h3></div></div><ul class="sglist"><li><span class="sg-t">Midterm: trees and hashing</span><i class="sg-l"></i><span class="sg-d">Oct 28</span></li></ul></div>`],
  projects: ["Projects in progress and planned. Opening one shows what it is, the skills it covers and what comes next.",
    () => exRow("Weather station dashboard", "Personal", "3 skills", "Since Sep")],
  portfolio: ["One row per project page to write up, with what may be public and what the page still needs.",
    () => exRow("Weather station dashboard", "Personal", "To write up", "")],
  certs: ["Certifications to earn, each with its cost, how long it takes and the steps to prepare.",
    () => exRow("Cloud Practitioner", "Cloud", "$100", "March")]
};
const exLine = k => `<p class="ex-line"><span class="chip">Example</span>${EXAMPLES[k][0]}</p>`, exItem = k => `<div class="ex-item" inert aria-hidden="true">${EXAMPLES[k][1]()}</div>`;
const example = k => `<div class="example">${exLine(k)}${exItem(k)}</div>`;

/* ---------- Canvas calendar ----------
   The feed link is private, so it is kept only in this browser (never in the synced data or the site's files). On each page load the
   site asks /api/ics to fetch it, keeps the upcoming assignments, and lists them in To-Do under Classes. */
const CV_URL = "roadmap-canvas-url", CV_DATA = "roadmap-canvas-items";
let canvasMsg = "", canvasCache = null;
const lsGet = k => { try { return localStorage.getItem(k) || ""; } catch(e) { return ""; } };
const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch(e) {} };
const canvasUrl = () => lsGet(CV_URL);
/* A class code from the course name Canvas puts on an assignment ("COMPSCI 121 LEC A"). Long department names are shortened the
   way the content says (school.depts), then the name is matched to a class in the terms or the plan; failing that, the
   department and number the name starts with are used as written. */
function courseOf(s){
  let t = String(s || ""); if (!t.trim()) return "";
  const rx = x => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s*");
  for (const [long, short] of Object.entries(SCHOOL.depts || {})) t = t.replace(new RegExp(rx(long) + "(?=\\s*\\d)", "gi"), short + " ");
  const codes = [...new Set(TERMS.flatMap(q => (q.classes || []).map(c => c.code)).concat(LATER.years.flatMap(y => y.quarters.flatMap(q => q.courses.map(c => c.code)))))].filter(Boolean).sort((a, b) => b.length - a.length);
  for (const c of codes) if (new RegExp("(^|[^A-Za-z0-9])" + rx(c) + "(?![A-Za-z0-9])", "i").test(t)) return c;
  const m = /^\s*([A-Za-z][A-Za-z&]*(?: [A-Za-z&]+)?)\s*(\d+[A-Za-z]*)\b/.exec(t);
  return m ? m[1].toUpperCase() + " " + m[2].toUpperCase() : "";
}
const normT = s => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function parseIcs(text){
  const unfolded = text.replace(/\r?\n[ \t]/g, ""), out = [], pad = n => String(n).padStart(2, "0");
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)){
    const get = k => { const m = new RegExp("^" + k + "(?:;[^:\\r\\n]*)?:(.*)$", "m").exec(block); return m ? m[1].trim() : ""; };
    const uid = get("UID"), raw = get("DTSTART"), sum = get("SUMMARY").replace(/\\([,;])/g, "$1").replace(/\\n/gi, " ").replace(/\\\\/g, "\\");
    if (!/assignment/i.test(uid) || !raw || !sum) continue;
    const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(raw); if (!m) continue;
    let due, time = "";
    if (m[4] != null){
      const d = m[7] ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      due = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
      time = ((d.getHours() + 11) % 12 + 1) + ":" + pad(d.getMinutes()) + " " + (d.getHours() < 12 ? "AM" : "PM");
    } else due = m[1] + "-" + m[2] + "-" + m[3];
    const br = /\s*\[([^\]]*)\]\s*$/.exec(sum), cls = courseOf(br ? br[1] : ""), t = (br ? sum.slice(0, br.index) : sum).trim();
    const item = {id: "cv-" + uid.replace(/[^\w-]/g, "").slice(-40), a: "classes", t, due, note: "Canvas"}; if (cls) item.cls = cls; if (time) item.time = time;
    out.push(item);
  }
  return out;
}
/* Upcoming Canvas assignments that are not already on the list (same class, same day, and one title contains the other). */
function canvasItems(){
  if (!canvasUrl()) return [];
  if (!canvasCache){ try { canvasCache = JSON.parse(lsGet(CV_DATA) || "[]"); } catch(e) { canvasCache = []; } }
  const t0 = today().getTime(), mine = TODO.concat(added());
  return canvasCache.filter(c => parseD(c.due).getTime() >= t0 && !mine.some(x => x.due === c.due && (x.cls || "") === (c.cls || "") && (normT(x.t).includes(normT(c.t)) || normT(c.t).includes(normT(x.t)))));
}
async function canvasPull(loud){
  const url = canvasUrl(); if (!url || viewOnly()) return;
  try {
    const r = await fetch("/api/ics", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({url})});
    if (!r.ok){ let why = ""; try { why = (await r.json()).error; } catch(e) {} throw new Error(why || "error " + r.status); }
    canvasCache = parseIcs(await r.text()); lsSet(CV_DATA, JSON.stringify(canvasCache));
    canvasMsg = "Connected. Last updated " + new Date().toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"}) + ", " + canvasItems().length + " upcoming.";
  } catch(e) { canvasMsg = "Could not refresh from Canvas (" + (e.message || "offline") + "). Showing the last saved copy."; }
  rerender(); if (loud) toast(canvasMsg);
}
let todoFilter = "all", calMonth = null, addOpen = false, focusOn = false, finalsOff = false, editId = null, laterOpen = false;
/* Finals mode switches itself on during the weeks tagged "Finals" in WEEKS (or with ?finals=1 on the address): the list narrows to exams and coursework due that week, and the scene quiets down. */
const inFinals = () => new URLSearchParams(location.search).get("finals") === "1" || currentWeek().tag === "Finals";
const finalsOn = () => inFinals() && !finalsOff;
function finalsItem(i){
  if (/final|exam/i.test(i.t)) return true;
  const end = parseD(currentWeek().start).getTime() + 7 * MS;
  return i.a === "classes" && i.due && parseD(i.due).getTime() < end;
}
try { focusOn = localStorage.getItem("roadmap-focus") === "1"; laterOpen = localStorage.getItem("roadmap-later") === "1"; } catch(e) {}
/* Download every open item that has a date as a calendar file. */
function exportIcs(){
  const pad = n => String(n).padStart(2, "0"), ymd = d => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
  const clean = t => String(t).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, " ");
  const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Roadmap//To-Do//EN", "CALSCALE:GREGORIAN"];
  for (const i of openItems()){
    if (!i.due) continue;
    const d = parseD(i.due), m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(i.time || "");
    L.push("BEGIN:VEVENT", "UID:" + i.id + "@roadmap", "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d+/g, ""));
    if (m){ const h = (Number(m[1]) % 12) + (/p/i.test(m[3]) ? 12 : 0), at = ymd(d) + "T" + pad(h) + m[2] + "00"; L.push("DTSTART:" + at, "DTEND:" + at); }
    else L.push("DTSTART;VALUE=DATE:" + ymd(d), "DTEND;VALUE=DATE:" + ymd(new Date(d.getTime() + MS)));
    L.push("SUMMARY:" + clean((i.cls ? i.cls + " " : "") + i.t), "END:VEVENT");
  }
  L.push("END:VCALENDAR");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([L.join("\r\n")], {type: "text/calendar"})); a.download = "roadmap-due-dates.ics"; document.body.appendChild(a); a.click(); a.remove();
  toast("Calendar file downloaded");
}
/* Month grid beside the list: one dot per open item on its due date, colored by area. Clicking a day jumps to it in the list. */
function calHtml(list){
  const t = today(); if (!calMonth) calMonth = new Date(t.getFullYear(), t.getMonth(), 1);
  const y = calMonth.getFullYear(), m = calMonth.getMonth(), days = new Date(y, m + 1, 0).getDate(), lead = new Date(y, m, 1).getDay(); /* weeks start on Sunday */
  const by = {}; for (const i of list) if (i.due) (by[i.due] = by[i.due] || []).push(i);
  let cells = "SMTWTFS".split("").map(d => `<i>${d}</i>`).join("") + "<span></span>".repeat(lead);
  for (let d = 1; d <= days; d++){
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`, xs = by[key] || [];
    const isToday = t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
    cells += `<button data-day="${key}" data-drop="${key}"${xs.length ? ` title="${xs.length} due"` : ""} class="${xs.length ? "" : "none"}${isToday ? " today" : ""}">${d}<span class="dots">${xs.slice(0, 4).map(i => `<i class="dot ${esc(i.a)}"></i>`).join("")}${xs.length > 4 ? `<span class="more">+${xs.length - 4}</span>` : ""}</span></button>`;
  }
  return `<div class="side"><aside class="cal" aria-label="Calendar"><div class="cal-h"><button data-cal="-1" aria-label="Previous month">‹</button><button class="cal-title" id="cal-big" title="Open the full calendar">${calMonth.toLocaleDateString("en-US", {month: "long", year: "numeric"})}</button><button data-cal="1" aria-label="Next month">›</button></div><div class="cal-g">${cells}</div><button class="btn cal-x" id="ics">Export due dates (.ics)</button></aside>${viewOnly() ? "" : `<div class="notes"><label for="notes">Notes</label><textarea id="notes" rows="6" spellcheck="false">${esc(typeof state.checks._notes === "string" ? state.checks._notes : "")}</textarea></div>`}</div>`;
}
/* Line the calendar up with the top of the first box of tasks, not with the section heading above it. Needs the page to be showing, so it runs after every draw and every tab change. */
function alignSide(){
  const wrap = $("#todo .tdwrap"), first = wrap && wrap.querySelector(".tgroup, .clear"), side = wrap && wrap.querySelector(".side");
  if (!first || !side || !wrap.offsetParent) return;
  side.style.setProperty("--side-top", Math.max(0, Math.round(first.getBoundingClientRect().top - wrap.getBoundingClientRect().top)) + "px");
}
function rTodo(){
  const fin = finalsOn(), all = openItems().filter(i => !fin || finalsItem(i)), byArea = all.filter(i => todoFilter === "all" || i.a === todoFilter);
  const list = focusOn ? byArea.filter(i => i.prio || (i.days !== null && i.days <= 1)) : byArea;
  const B = [["prio","Priority"]].concat(focusOn ? [["late","Overdue"],["today","Today"],["tom","Tomorrow"]] : [["late","Overdue"],["today","Today"],["week","This week"],["next","Next week"],["later","Later"]]);
  const inB = (i, k) => k === "prio" ? i.prio : i.prio ? false : focusOn ? (k === "late" ? i.days < 0 : k === "today" ? i.days === 0 : i.days === 1) : i.bucket === k;
  const rows = list.length ? B.map(([k, name]) => { const xs = list.filter(i => inB(i, k)); if (!xs.length) return ""; const fold = k === "later", shut = fold && !laterOpen && !xs.some(i => i.id === editId); return `<div class="bucket${k==="late"?" late":""}${k==="prio"?" prio":""}">${fold ? `<button class="fold" id="later-tog" aria-expanded="${!shut}"><svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 2l4 4-4 4"/></svg><h3>${name}</h3></button>` : `<h3>${name}</h3>`}<span class="small muted">${xs.length}</span></div>` + (fold ? `<div class="foldwrap${shut ? " shut" : ""}" id="later-wrap"><div class="tgroup">${xs.map(i => todoRow(i)).join("")}</div></div>` : `<div class="tgroup">${xs.map(i => todoRow(i)).join("")}</div>`); }).join("") : (!all.length && !TODO.length && !WEEKS.length && !TERMS.length ? example("todo") : `<div class="clear"><div><b>All clear</b><span>${focusOn ? "Nothing due today or tomorrow." : "Nothing open here."}</span></div></div>`);
  $("#todo").innerHTML = `
    ${inFinals() ? `<div class="finals"><b>Finals week.</b>${fin ? "Showing only exams and coursework due this week." : "Showing everything."}<button class="btn" id="finals-tog">${fin ? "Show everything" : "Back to exams only"}</button></div>` : ""}
    <div class="chips todobar">
      ${focusOn ? "" : `<div class="sum">${[["late","overdue"],["today","today"],["week","this week"],["next","next week"]].map(([k, name]) => { const c = all.filter(i => i.bucket === k).length; return `<div class="${c && (k === "late" || k === "today") ? "hot" : ""}"><b>${c}</b><span>${name}</span></div>`; }).join("")}</div>`}
      <select id="area-sel" class="areasel${todoFilter === "all" ? "" : " on"}" aria-label="Filter by area">
        <option value="all"${todoFilter === "all" ? " selected" : ""}>All areas · ${all.length}</option>
        ${AREAS.map(x => `<option value="${x.id}"${todoFilter === x.id ? " selected" : ""}>${esc(x.name)} · ${all.filter(i => i.a === x.id).length}</option>`).join("")}
      </select>
      <span class="tools"><button class="tool" id="cal-open" aria-label="Calendar" title="Calendar: month and week views"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8.500h14M7 2.800v3M13 2.800v3"/></svg></button><button class="tool" id="focus" aria-pressed="${focusOn}" aria-label="Focus" title="Focus: show only today and tomorrow"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="6.2"/><circle cx="10" cy="10" r="1.6" fill="currentColor" stroke="none"/><path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3"/></svg></button>${viewOnly() ? "" : `<button class="tool" id="add-open" aria-pressed="${addOpen}" aria-label="Add a task" title="Add a task"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 3.5v13M3.5 10h13"/></svg></button>`}${skillTool("todo")}</span>
    </div>
    ${addOpen && !viewOnly() ? `<form class="addrow" id="add-form"><input type="text" id="add-t" placeholder="What needs doing?" required><input type="text" id="add-cls" placeholder="Class (optional)" style="flex:0 1 130px"><select id="add-a">${AREAS.map(a => `<option value="${a.id}"${(todoFilter === a.id) ? " selected" : ""}>${esc(a.name)}</option>`).join("")}</select><input type="date" id="add-d">${repSelect("add-rep", "")}<button class="btn pink" type="submit">Add</button></form>` : ""}
    ${focusOn || (todoFilter !== "all" && todoFilter !== "classes") ? "" : countCards(all)}
    ${focusOn ? `<div>${rows}</div>` : `<div class="tdwrap"><div>${rows}</div>${calHtml(byArea)}</div>`}`;
  alignSide();
}
/* ---------- calendar overlay ---------- */
/* Opened from the calendar icon in the To-Do toolbar or the small calendar's month name. Weeks start on Sunday.
   Month view is one long list of weeks that scrolls up and down, a year back and two ahead: the heading names the month in view and the days
   of the other months dim. Week view adds a time grid with class meetings (from TERMS "times") and exams, with the weekend shaded and the
   hours tall enough to read, so the grid scrolls under the day names and the Due row; it also scrolls sideways, week by week. bigGo is the day to bring into view on the next draw; without it a redraw keeps the scroll where it was. */
let bigView = "month", bigAt = null, bigGo = null, bigRaf = 0, bigSettleT = 0, bigDueAll = false; /* bigDueAll: the week view's Due row is opened up to show every task */
const isoOf = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sundayOf = d => addDays(d, -d.getDay());
const BIG_MONTHS = "January February March April May June July August September October November December".split(" ");
/* the calendar's heading, the same in both views: the month, then the year set lighter */
const bigTitle = d => `${BIG_MONTHS[d.getMonth()]} <span class="bc-yr">${d.getFullYear()}</span>`;
/* "4:00 PM" or "16:00" as minutes since midnight, or null */
function minsOf(t){
  let m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(t || ""); if (m) return (m[1] % 12 + (/p/i.test(m[3]) ? 12 : 0)) * 60 + +m[2];
  m = /^(\d{2}):(\d{2})$/.exec(t || ""); return m ? m[1] * 60 + +m[2] : null;
}
const clockOf = n => ((Math.floor(n / 60) + 11) % 12 + 1) + (n % 60 ? ":" + String(n % 60).padStart(2, "0") : "") + (n < 720 ? " AM" : " PM");
const isExam = i => minsOf(i.time) != null && /final|midterm|exam|quiz/i.test(i.t);
function rBigCal(){
  const el = $("#bigcal"); if (!el || el.hidden) return;
  const t = today(); if (!bigAt) bigAt = t;
  const by = {}; for (const i of openItems()) if (i.due) (by[i.due] = by[i.due] || []).push(i);
  const drag = i => viewOnly() || i.id.startsWith("apd-") ? "" : ` draggable="true" data-drag="${esc(i.id)}"`;
  const item = i => `<button class="bc-item" data-jump="${esc(i.id)}"${drag(i)} title="${esc((i.cls ? i.cls + " " : "") + i.t + (i.time ? ", " + i.time : ""))}"><i class="dot ${esc(i.a)}"></i><span>${i.cls ? `<b>${esc(i.cls)}</b> ` : ""}${esc(i.t)}</span></button>`;
  let title, body;
  const keep = el.querySelector(".bc-scroll"), keepTop = keep && !bigGo ? keep.scrollTop : null;
  const wk = el.querySelector(".bc-wk"), wkHour = wk && bigView === "week" ? Number(wk.dataset.h0) + wk.scrollTop / Number(wk.dataset.px) : null; /* the hours scroll inside the week view; a redraw or a change of week keeps the same hour at the top */
  if (bigView === "month"){
    const first = sundayOf(new Date(t.getFullYear() - 1, t.getMonth(), 1)), last = new Date(t.getFullYear() + 2, t.getMonth() + 1, 0), weeks = Math.ceil((Math.round((last - first) / 864e5) + 1) / 7);
    title = bigTitle(bigAt);
    body = `<div class="bc-month"><div class="bc-dow">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => `<span>${d}</span>`).join("")}</div><div class="bc-scroll" tabindex="0">${Array.from({length: weeks}, (_, w) => `<div class="bc-week" data-w="${isoOf(addDays(first, w * 7))}">${Array.from({length: 7}, (_, k) => {
      const d = addDays(first, w * 7 + k), key = isoOf(d), xs = by[key] || [];
      return `<div class="bc-day${key === isoOf(t) ? " today" : ""}" data-ym="${key.slice(0, 7)}" data-drop="${key}"><button class="bc-num" data-bcweek="${key}" title="Open this week">${d.getDate() === 1 ? BIG_MONTHS[d.getMonth()].slice(0, 3) + " " : ""}${d.getDate()}</button>${xs.slice(0, 3).map(item).join("")}${xs.length > 3 ? `<button class="bc-more" data-bcweek="${key}">+${xs.length - 3} more</button>` : ""}</div>`;
    }).join("")}</div>`).join("")}</div></div>`;
  } else {
    /* Three weeks side by side, the one asked for in the middle, in a strip that scrolls sideways and settles on a week.
       When it settles on a neighbour that week becomes the middle one (bigSettle), so the strip never runs out. */
    const PX = 68, mid = sundayOf(bigAt), weeks = [-7, 0, 7].map(n => Array.from({length: 7}, (_, k) => addDays(mid, n + k))), days = weeks[1]; /* PX is the height of an hour */
    title = bigTitle(days[3]); /* the month most of the week falls in */
    /* timed blocks per day: class meetings while the quarter is in session, and exams */
    const blocks = weeks.map(w => w.map(d => dayEvents(d, by[isoOf(d)] || [])));
    const all = blocks.flat(2), nowAt = new Date(), nowMin = nowAt.getHours() * 60 + nowAt.getMinutes(), nowIn = weeks.some(w => w.some(d => isoOf(d) === isoOf(nowAt)));
    /* the hours shown: 7 in the morning to 10 at night, stretched to fit every block in the three weeks and, when today is among them, the present hour */
    const h0 = Math.min(7, ...all.map(b => Math.floor(b.a / 60)), nowIn ? Math.floor(nowMin / 60) : 7), h1 = Math.max(22, ...all.map(b => Math.ceil(b.b / 60)), nowIn ? Math.min(24, Math.floor(nowMin / 60) + 1) : 22);
    const anyClass = blocks[1].flat().some(b => b.cls === "meet"), inTerm = TERMS.find(q => q.start <= isoOf(days[6]) && isoOf(mid) <= (q.lastClass || q.end));
    const wkend = d => d.getDay() % 6 ? "" : " wkend";
    body = `<div class="bc-wk${bigDueAll ? " dueall" : ""}" data-h0="${h0}" data-px="${PX}"><div class="bc-wkin">
      <div class="bc-corner"><span>Due</span>${bigDueAll ? `<button class="bc-more" data-bcdue="0" title="Back to three tasks a day">Less</button>` : ""}</div>
      ${weeks.map(w => `<div class="bc-wktop" data-wk="${isoOf(w[0])}"><div class="bc-wkhead">${w.map(d => `<div class="${isoOf(d) === isoOf(t) ? "today" : ""}"><span>${d.toLocaleDateString("en-US", {weekday: "short"})}</span><b>${d.getDate()}</b></div>`).join("")}</div>
        <div class="bc-due">${w.map(d => { const xs = (by[isoOf(d)] || []).filter(i => !isExam(i)), cut = !bigDueAll && xs.length > 3; return `<div data-drop="${isoOf(d)}">${(cut ? xs.slice(0, 2) : xs).map(item).join("")}${cut ? `<button class="bc-more" data-bcdue="1" title="Show every task due this week">+${xs.length - 2} more</button>` : ""}</div>`; }).join("")}</div></div>`).join("")}
      <div class="bc-hours" style="height:${(h1 - h0) * PX}px">${Array.from({length: h1 - h0}, (_, k) => `<span data-h="${h0 + k}" style="top:${k * PX}px">${h0 + k === 12 ? "<b>Noon</b>" : clockOf((h0 + k) * 60).replace(/^(\S+) /, "<b>$1</b> ")}</span>`).join("")}${days.some(d => isoOf(d) === isoOf(nowAt)) ? `<b class="bc-nowpill"></b>` : ""}</div>
      ${weeks.map((w, n) => { const col = w.findIndex(d => isoOf(d) === isoOf(nowAt)); return `<div class="bc-grid" style="height:${(h1 - h0) * PX}px">${w.map((d, k) => `<div class="bc-col${wkend(d)}" data-col="${isoOf(d)}" style="background-size:100% ${PX}px">${blocks[n][k].map(b => { const tag = b.id ? "button" : "div"; return `<${tag}${b.id ? ` data-jump="${esc(b.id)}"` : ""} class="bc-block ${b.cls}" style="top:${(b.a / 60 - h0) * PX}px;height:${Math.max(22, (b.b - b.a) / 60 * PX - 2)}px" title="${esc(b.name + ", " + clockOf(b.a) + " to " + clockOf(b.b))}"><b>${esc(b.name)}</b><span>${esc(b.sub)}</span></${tag}>`; }).join("")}</div>`).join("")}${col < 0 ? "" : `<div class="bc-now" style="--col:${col}"><i></i><u></u></div>`}</div>`; }).join("")}
    </div></div><p class="bc-note">${anyClass || !inTerm ? "" : "Class times for " + esc(inTerm.name) + " have not been added yet. "}${anyClass || inTerm ? "" : "No classes this week. "}${viewOnly() ? "" : "Drag a task to another day to move it."}</p>`;
  }
  /* a redraw of the open calendar must not replay the box's entrance */
  el.innerHTML = `<div class="mapbox bcbox${el.querySelector(".bcbox") ? " still" : ""}" role="dialog" aria-modal="true" aria-label="Calendar"><div class="maphead bc-head">
      <h2>${title}</h2>
      <span class="bc-ctl"><span class="yearbar setseg">${[["month","Month"],["week","Week"]].map(([v, n]) => `<button data-bcview="${v}" aria-pressed="${bigView === v}">${n}</button>`).join("")}</span>
      <span class="yearbar setseg">${bigView === "month" ? "" : `<button data-bcgo="-1" aria-label="Previous week">‹</button>`}<button data-bcgo="0">Today</button>${bigView === "month" ? "" : `<button data-bcgo="1" aria-label="Next week">›</button>`}</span></span>
      <button class="tool" id="bigcal-close" aria-label="Close">${X_ICON}</button></div>${body}</div>`;
  const wk2 = el.querySelector(".bc-wk");
  if (wk2){
    /* show the middle week; opening the current week brings the present time to the middle, otherwise the hours stay where they were */
    /* the day names and Due row are as tall as the middle week needs; its neighbours are cut to match, so a busy week next door does not push the hours down */
    const tops = [...wk2.querySelectorAll(".bc-wktop")], tall = tops[1].offsetHeight + "px";
    for (const e of tops.concat([wk2.querySelector(".bc-corner")])) e.style.height = tall;
    const line = bigNow();
    wk2.scrollLeft = wk2.querySelectorAll(".bc-wktop")[1].offsetLeft - wk2.querySelector(".bc-corner").offsetWidth;
    wk2.scrollTop = bigGo && line != null ? Math.max(0, line - wk2.clientHeight / 2) : ((wkHour == null ? 8 : wkHour) - Number(wk2.dataset.h0)) * Number(wk2.dataset.px);
    /* wait for the glide to finish: the browser's own signal where there is one, otherwise a pause in the scrolling */
    if ("onscrollend" in window) wk2.addEventListener("scrollend", () => bigSettle(wk2), {passive: true});
    else wk2.addEventListener("scroll", () => { clearTimeout(bigSettleT); bigSettleT = setTimeout(() => bigSettle(wk2), 160); }, {passive: true});
  }
  const sc = el.querySelector(".bc-scroll");
  if (sc){
    /* put the month's first week at the top (or stay where the list was), then dim the other months */
    if (keepTop != null) sc.scrollTop = keepTop;
    else { const row = sc.querySelector(`.bc-week[data-w="${isoOf(sundayOf(new Date(bigAt.getFullYear(), bigAt.getMonth(), 1)))}"]`); if (row) sc.scrollTop = row.offsetTop - sc.offsetTop; }
    sc.addEventListener("scroll", () => { if (!bigRaf) bigRaf = requestAnimationFrame(() => { bigRaf = 0; bigMonthInView(sc); }); }, {passive: true});
    bigMonthInView(sc, true);
  }
  bigGo = null;
}
/* The month in view is the one the week a third of the way down the list mostly belongs to (its Wednesday). Name it in the heading and dim the rest. */
function bigMonthInView(sc, force){
  const line = sc.scrollTop + sc.clientHeight / 3, rows = sc.children; let lo = 0, hi = rows.length - 1;
  while (lo < hi){ const mid = (lo + hi + 1) >> 1; if (rows[mid].offsetTop - sc.offsetTop <= line) lo = mid; else hi = mid - 1; }
  const row = rows[lo]; if (!row) return;
  const d = addDays(parseD(row.dataset.w), 3), ym = isoOf(d).slice(0, 7);
  if (!force && sc.dataset.ym === ym) return;
  sc.dataset.ym = ym; bigAt = new Date(d.getFullYear(), d.getMonth(), 1);
  for (const c of sc.querySelectorAll(".bc-day")) c.classList.toggle("out", c.dataset.ym !== ym);
  const h = sc.closest(".bcbox").querySelector(".bc-head h2"); if (h) h.innerHTML = bigTitle(d);
}
/* The sideways scroll has come to rest: if it rests on the week before or after, redraw with that week in the middle.
   The redraw shows the same week in the same place, so nothing is seen to move. */
function bigSettle(wk){
  if (!wk.isConnected || bigView !== "week") return;
  const tops = [...wk.querySelectorAll(".bc-wktop")], x = wk.scrollLeft + wk.querySelector(".bc-corner").offsetWidth;
  const at = tops.map(e => Math.abs(e.offsetLeft - x)), n = at.indexOf(Math.min(...at));
  if (n === 1 || at[n] > 3) return; /* already on the middle week, or still gliding */
  bigAt = parseD(tops[n].dataset.wk); rBigCal();
}
/* Glide to the week before (-1) or after (1); bigSettle takes over when the glide ends. */
function bigSlide(n){
  const wk = document.querySelector("#bigcal .bc-wk"), to = wk && wk.querySelectorAll(".bc-wktop")[1 + n];
  if (!to || matchMedia("(prefers-reduced-motion: reduce)").matches){ bigAt = addDays(bigAt, 7 * n); rBigCal(); return; }
  wk.scrollTo({left: to.offsetLeft - wk.querySelector(".bc-corner").offsetWidth, behavior: "smooth"});
}
/* The line across the current week at the present time: its clock in the hour column while that week is the one on show,
   a faint line across the week and a solid one over today. Returns how far down the scrolling week it sits, or null when
   the present time is not on show. Moved every half minute. */
function bigNow(){
  const wk = document.querySelector("#bigcal .bc-wk"); if (!wk) return null;
  const d = new Date(), mins = d.getHours() * 60 + d.getMinutes(), top = (mins / 60 - Number(wk.dataset.h0)) * Number(wk.dataset.px);
  const hours = wk.querySelector(".bc-hours"), pill = wk.querySelector(".bc-nowpill"), line = wk.querySelector(".bc-now"), off = top < 0 || top > hours.clientHeight;
  if (line){ line.hidden = off; line.style.top = top + "px"; }
  if (pill){ pill.hidden = off; pill.style.top = top + "px"; pill.textContent = ((d.getHours() + 11) % 12 + 1) + ":" + String(d.getMinutes()).padStart(2, "0"); }
  /* an hour label the clock would sit on top of steps aside */
  for (const h of hours.querySelectorAll("span")) h.classList.toggle("hid", !!pill && !off && Math.abs(Number(h.dataset.h) * 60 - mins) < 14);
  return pill && !off ? hours.offsetTop + top : null;
}
setInterval(() => { const el = document.getElementById("bigcal"); if (el && !el.hidden && bigView === "week") bigNow(); }, 30000);
OVERLAYS.bigcal = rBigCal;
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("button"); if (!t) return;
  if (t.id === "cal-open" || t.id === "cal-big"){ bigAt = t.id === "cal-big" && calMonth && !(calMonth.getMonth() === today().getMonth() && calMonth.getFullYear() === today().getFullYear()) ? calMonth : today(); bigGo = bigAt; overlay("bigcal", true); return; }
  /* the calendar icon beside a quarter on Academic plan: that quarter's second week, since the first can start midweek */
  if (t.dataset.qweek){ bigAt = addDays(parseD(t.dataset.qweek), 7); bigView = "week"; overlay("bigcal", true); rBigCal(); return; }
  if (t.dataset.bcview){ /* going to the week from a month in view: today's week when it is this month, otherwise the month's first */
    if (t.dataset.bcview === "week" && bigView === "month"){ const n = today(); bigAt = n.getFullYear() === bigAt.getFullYear() && n.getMonth() === bigAt.getMonth() ? n : bigAt; }
    bigView = t.dataset.bcview; bigGo = bigAt; rBigCal(); return; }
  if (t.dataset.bcdue){ bigDueAll = t.dataset.bcdue === "1"; rBigCal(); return; }
  if (t.dataset.bcweek){ bigAt = parseD(t.dataset.bcweek); bigView = "week"; rBigCal(); return; }
  if (t.dataset.bcgo){ const n = Number(t.dataset.bcgo); if (n){ bigSlide(n); return; } bigAt = today(); bigGo = bigAt; rBigCal(); return; }
  /* a task in the calendar: close it and let the usual jump handler take it to the list */
  if (t.dataset.jump && t.closest("#bigcal")) overlay("bigcal", false);
}, true);

/* ---------- quarters ---------- */
/* The quarter in session, or the next one coming up during a break. ?term=w27 previews another one. */
function termNow(){
  const want = new URLSearchParams(location.search).get("term"), t0 = today().getTime();
  return TERMS.find(t => t.id === want) || TERMS.find(t => parseD(t.end).getTime() >= t0) || TERMS[TERMS.length - 1] || {id: "", name: "", start: "", end: "", classes: []};
}
/* Class names to show cards for: this quarter's classes, plus any class that isn't on another quarter's list. */
function termNames(items){
  const now = termNow().classes.map(c => c.code), other = TERMS.flatMap(t => t.classes.map(c => c.code)).filter(c => !now.includes(c));
  const extra = [...new Set(items.map(i => i.cls).filter(c => c && !now.includes(c) && !other.includes(c)))].sort();
  return now.concat(extra);
}
const classInfo = code => { const c = termNow().classes.find(x => x.code === code); return c ? [c.title, c.prof ? "Taught by " + c.prof + "." : "", c.meets || ""].filter(Boolean).join(" ") : ""; };
/* One small card per class with its next quiz, exam or project and how far off it is. Shown at the top of To-Do; clicking one jumps to that item. */
function countCards(items){
  const cls = items.filter(i => i.a === "classes" && i.cls), names = termNames(cls);
  const cards = names.map(c => { const xs = cls.filter(i => i.cls === c), big = xs.find(i => i.due && /quiz|midterm|final|exam|project|report|presentation/i.test(i.t)) || xs.find(i => i.due); return big ? `<button data-jump="${esc(big.id)}" title="${esc(classInfo(c))}"><b>${esc(c)}</b><span>${esc(big.t)}</span><em>${big.days < 0 ? "overdue" : big.days === 0 ? "today" : big.days === 1 ? "tomorrow" : "in " + big.days + " days"}</em></button>` : ""; }).join("");
  return cards ? `<div class="count">${cards}</div>` : "";
}
/* ---------- applications board ---------- */
const STAGES = ["To start", "Applied", "Interview", "Offer"];
const safeUrl = u => /^https?:\/\//i.test(u || "") ? u : "";
let appAddOpen = false, appKind = "all";
const appOpen = new Set();
/* An application's kind; older ones saved before kinds existed count as internships. */
const kindOf = a => a.kind || (/scholarship/i.test(a.org + " " + (a.role || "")) ? "scholarship" : "internship");
function rApps(){
  const t0 = today().getTime(), ro = viewOnly();
  const all = APPS.concat(appsAdded()).filter(a => appStage(a) !== "Closed");
  const live = all.filter(a => appKind === "all" || kindOf(a) === appKind).sort((x, y) => (x.due || "9999").localeCompare(y.due || "9999"));
  /* Each application is one line: its name (a link to the posting) and its deadline. Clicking the line opens it up to show the
     role, kind and next step, with a slide; which ones are open is kept while the page is redrawn. */
  const GRIP = `<svg viewBox="0 0 12 16" width="10" height="14" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.3"/><circle cx="9" cy="3" r="1.3"/><circle cx="3" cy="8" r="1.3"/><circle cx="9" cy="8" r="1.3"/><circle cx="3" cy="13" r="1.3"/><circle cx="9" cy="13" r="1.3"/></svg>`;
  const card = a => {
    const st = STAGES.indexOf(appStage(a)), days = a.due ? Math.round((parseD(a.due).getTime() - t0) / MS) : null, u = safeUrl(a.url), open = appOpen.has(a.id);
    const due = a.due ? `<p class="app-due${days >= 0 && days <= 7 ? " soon" : days < 0 ? " past" : ""}">${esc(fmt(parseD(a.due)))}<em>${days < 0 ? "past due" : days === 0 ? "due today" : days + (days === 1 ? " day left" : " days left")}</em></p>` : `<p class="app-due none">No deadline</p>`;
    return `<div class="app${open ? " open" : ""}" data-id="${esc(a.id)}">
      ${ro ? "" : `<button class="grip" aria-label="Drag to another stage" title="Drag to another stage">${GRIP}</button>`}
      <div class="app-top">
        <h3>${u ? `<a href="${esc(u)}" target="_blank" rel="noopener" title="Open the posting">${esc(a.org)}<svg class="app-go" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2h6v6M10 2 3 9"/></svg></a>` : esc(a.org)}</h3>
        <button class="app-more-btn" aria-expanded="${open}" aria-label="Details"><svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5 6 7.500l3-3"/></svg></button>
      </div>
      <div class="app-more"><div>
        ${a.loc ? `<p class="app-loc">${esc(a.loc)}</p>` : ""}
        ${a.role ? `<p class="app-desc">${esc(a.role)}</p>` : ""}
        ${a.next && st === 0 ? `<p class="app-next"><b>Next</b> ${esc(a.next)}</p>` : ""}
        ${ro ? "" : `<button class="app-x" data-app="${esc(a.id)}" data-to="-1">Remove from the board</button>`}
      </div></div>
      ${due}
    </div>`;
  };
  $("#apps").innerHTML = `
    <div class="chips todobar"><div class="sum">${(() => { const left = a => a.due ? daysBetween(today(), parseD(a.due)) : null, open = all.filter(a => appStage(a) === "To start"), wk = open.filter(a => left(a) !== null && left(a) <= 7).length, mo = open.filter(a => left(a) !== null && left(a) <= 30).length; return [[wk, "due this week", wk > 0], [mo, "due this month"], [all.filter(a => appStage(a) === "Applied").length, "applied"], [all.filter(a => appStage(a) === "Interview").length, "interview"]].map(([n, name, hot]) => `<div class="${hot ? "hot" : ""}"><b>${n}</b><span>${name}</span></div>`).join(""); })()}</div><select id="kind-sel" class="areasel" aria-label="Filter by kind"><option value="all"${appKind === "all" ? " selected" : ""}>All kinds · ${all.length}</option>${KINDS.filter(([k]) => all.some(a => kindOf(a) === k) || appKind === k).map(([k, name]) => `<option value="${k}"${appKind === k ? " selected" : ""}>${name} · ${all.filter(a => kindOf(a) === k).length}</option>`).join("")}</select><span class="tools"><button class="tool" id="find-open" aria-label="Find internships" title="Find internships: where to look"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8.8" cy="8.8" r="5.3"/><path d="M12.800 12.800l4.200 4.2"/></svg></button>${ro ? "" : `<button class="tool" id="app-open" aria-pressed="${appAddOpen}" aria-label="Add an application" title="Add an application"><svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 3.500v13M3.500 10h13"/></svg></button>`}</span></div>
    ${appAddOpen && !ro ? `<form class="addrow" id="app-form"><input type="text" id="app-org" placeholder="Company or program" required><input type="text" id="app-role" placeholder="Description (optional)"><input type="text" id="app-loc" placeholder="Location (optional)" style="flex:0 1 150px"><input type="url" id="app-url" placeholder="Link (optional)"><select id="app-kind" aria-label="Kind">${KINDS.map(([k, name]) => `<option value="${k}"${(appKind === "all" ? "internship" : appKind) === k ? " selected" : ""}>${name}</option>`).join("")}</select><input type="date" id="app-due" title="Deadline"><button class="btn pink" type="submit">Add</button></form>` : ""}
    ${all.length ? "" : exLine("apps")}
    <div class="board">${STAGES.map(sg => { const xs = live.filter(a => appStage(a) === sg); return `<div class="col" data-stage="${STAGES.indexOf(sg)}"><h3>${sg}<span>${xs.length}</span></h3>${xs.length ? xs.map(card).join("") : !all.length && sg === STAGES[0] ? exItem("apps") : `<p class="app-none">Nothing here yet.</p>`}</div>`; }).join("")}</div>`;
}
/* Move an application to a stage (0 to 3), or off the board with -1. One added on the site is deleted; a built-in one is marked Closed. */
function moveApp(id, to){
  if (to < 0 && appsAdded().some(a => a.id === id)){ state.checks._appsAdded = appsAdded().filter(a => a.id !== id); if (state.checks._apps) delete state.checks._apps[id]; }
  else state.checks._apps = Object.assign({}, state.checks._apps, {[id]: to < 0 ? "Closed" : STAGES[to]});
  save(); rerender(); toast(to < 0 ? "Removed from the board" : "Moved to " + STAGES[to]);
  if (to >= 1 && window.scene) scene.fish();
}
/* Drag an application to another column. With a mouse the whole row can be grabbed; on a touch screen it is the grip
   in its corner, so the rest of the row still scrolls the page. Dropping it outside the board, or in its own column, does nothing. */
let appDrag = null;
document.addEventListener("pointerdown", e => {
  const el = e.target.closest && e.target.closest(".board .app[data-id]");
  if (!el || viewOnly() || e.button > 0 || e.target.closest("a, button:not(.grip):not(.app-more-btn)")) return;
  if (e.pointerType !== "mouse" && !e.target.closest(".grip")) return;
  appDrag = {el, id: el.dataset.id, from: el.closest(".col").dataset.stage, x: e.clientX, y: e.clientY, on: false};
});
document.addEventListener("pointermove", e => {
  const d = appDrag; if (!d) return;
  if (!d.on){
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6) return;
    const r = d.el.getBoundingClientRect();
    d.on = true; d.dx = d.x - r.left; d.dy = d.y - r.top;
    d.ghost = d.el.cloneNode(true); d.ghost.classList.add("ghost"); d.ghost.style.width = r.width + "px";
    document.body.appendChild(d.ghost); d.el.classList.add("dragging"); document.body.classList.add("app-dragging");
  }
  e.preventDefault();
  d.ghost.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px) rotate(-1.5deg)`;
  const under = document.elementFromPoint(e.clientX, e.clientY), col = under && under.closest(".board .col");
  document.querySelectorAll(".board .col.over").forEach(c => c !== col && c.classList.remove("over"));
  if (col && col.dataset.stage !== d.from) col.classList.add("over");
});
function endAppDrag(e){
  const d = appDrag; appDrag = null; if (!d || !d.on) return;
  const col = e && document.elementFromPoint(e.clientX, e.clientY), to = col && col.closest(".board .col");
  d.ghost.remove(); d.el.classList.remove("dragging"); document.body.classList.remove("app-dragging");
  document.querySelectorAll(".board .col.over").forEach(c => c.classList.remove("over"));
  /* the click that follows a drag would land on whatever is under the pointer; swallow it */
  const eat = ev => { ev.stopPropagation(); ev.preventDefault(); };
  document.addEventListener("click", eat, {capture: true, once: true}); setTimeout(() => document.removeEventListener("click", eat, true), 50);
  if (to && to.dataset.stage !== d.from) moveApp(d.id, Number(to.dataset.stage));
}
document.addEventListener("pointerup", endAppDrag);
/* A click on an application's line opens or closes its details. (A drag never reaches here: the click after a drag is swallowed above.)
   The name is a link to the posting, and the remove button has its own handler. */
document.addEventListener("click", e => {
  const el = e.target.closest && e.target.closest(".board .app");
  if (!el || e.target.closest("a, .app-x, .grip")) return;
  const id = el.dataset.id, open = !appOpen.has(id);
  if (open) appOpen.add(id); else appOpen.delete(id);
  el.classList.toggle("open", open); const b = el.querySelector(".app-more-btn"); if (b) b.setAttribute("aria-expanded", open);
});
document.addEventListener("pointercancel", () => endAppDrag(null));
function trackApp(org, role, url, due, kind, loc){
  const id = "ua-" + Date.now().toString(36);
  state.checks._appsAdded = appsAdded().concat([{id, org, role: role || "", url: safeUrl(url), due: due || "", kind: kind || "internship", loc: loc || "", status: "To start"}]);
  save(); rerender();
}
function rFind(){
  const have = new Set(APPS.concat(appsAdded()).filter(a => appStage(a) !== "Closed").map(a => a.url));
  /* Laid out like Study guides: a container per group, and a line per site with its name as the link, a dashed rule, and Track on the right. */
  const act = (x, gi, k) => have.has(x.url) ? `<span class="fd-on">On the board</span>` : x.track && !viewOnly() ? `<button class="fd-track" data-track="${gi}-${k}">+ Track</button>` : "";
  const el = $("#find"); if (!el || el.hidden) return;
  el.innerHTML = `<div class="mapbox findbox" role="dialog" aria-modal="true" aria-label="Find internships"><div class="maphead"><h2>Find internships</h2><button class="tool" id="find-close" aria-label="Close">${X_ICON}</button></div><div class="findbody">` + FIND.map((g, gi) => `<div class="bucket"><h3>${esc(g.group)}</h3><span class="small muted">${g.items.length}</span></div>
    <div class="tgroup"><ul class="sglist fdlist">${g.items.map((x, k) => `<li><span class="sg-t fd-t"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.org)}</a><span class="fd">${esc(x.what)}</span></span><i class="sg-l"></i><span class="sg-d">${act(x, gi, k)}</span></li>`).join("")}</ul></div>`).join("") + `</div></div>`;
}
/* The list of places to look opens over the Applications page from the magnifier beside the add button. */
OVERLAYS.find = rFind;

/* ---------- other pages ---------- */
/* ---------- settings (overlay) ---------- */
/* Opened from the gear in the bottom-right corner. Scene settings belong to this browser; backup, Canvas and the setup list need sign-in. */
/* Small line icons for the scene settings. Each is the inside of a 20 by 20 drawing in the current text color. */
const ICON = {
  dynamic: '<path d="M16 10a6 6 0 1 1-1.8-4.3"/><path d="M16.2 3.4v3.200h-3.2"/>',
  dawn:    '<path d="M2.500 15.500h15"/><path d="M5.500 15.500a4.500 4.5 0 0 1 9 0"/><path d="M10 8.500V3.500M7.800 5.7 10 3.500l2.200 2.2"/>',
  day:     '<circle cx="10" cy="10" r="3.2"/><path d="M10 2.500v1.800M10 15.700v1.800M2.500 10h1.800M15.700 10h1.800M4.700 4.700l1.300 1.300M14 14l1.300 1.300M4.700 15.3 6 14M14 6l1.300-1.3"/>',
  dusk:    '<path d="M2.500 15.500h15"/><path d="M5.500 15.500a4.500 4.5 0 0 1 9 0"/><path d="M10 3.500v5M7.800 6.3 10 8.500l2.200-2.2"/>',
  night:   '<path d="M15.800 12.300A6.300 6.3 0 0 1 7.7 4.200a6.300 6.3 0 1 0 8.1 8.100z"/>',
  cloudy:  '<path d="M6.200 15.500h8a3.300 3.3 0 0 0 .4-6.6 4.4 4.4 0 0 0-8.5 1.1 2.8 2.8 0 0 0 .1 5.500z"/>',
  rain:    '<path d="M6.200 12h8a3.100 3.1 0 0 0 .4-6.2 4.2 4.2 0 0 0-8.2 1 2.6 2.6 0 0 0-.2 5.200z"/><path d="M7.500 14.500l-1 2.500M10.500 14.500l-1 2.500M13.500 14.500l-1 2.5"/>',
  snow:    '<path d="M10 2.500v15M3.500 6.250l13 7.500M3.500 13.750l13-7.5"/><path d="M8.300 3.8 10 5.500l1.700-1.700M8.300 16.2 10 14.500l1.700 1.7"/>',
  fog:     '<path d="M3 7.500h11M5.500 10.500h11.500M3 13.500h9"/>',
  spring:  '<path d="M10 17.500V9.500"/><path d="M10 12.500C10 8.8 7.4 6.6 3.8 6.600c0 3.7 2.6 5.9 6.2 5.900z"/><path d="M10 9.500c0-3.3 2.2-5.5 6-5.5 0 3.3-2.2 5.5-6 5.500z"/>',
  summer:  '<circle cx="10" cy="10" r="4.2"/><path d="M10 1.800v1.600M10 16.600v1.600M1.800 10h1.600M16.600 10h1.600M4.200 4.200l1.100 1.100M14.700 14.700l1.100 1.100M4.200 15.800l1.100-1.100M14.700 5.300l1.100-1.1"/>',
  fall:    '<path d="M16.500 3.500C9 3.5 4.5 7 4.5 12.500c0 1.500.400 2.7 1 3.5 5.5 0 11-3 11-12.500z"/><path d="M4 17.500c2.500-4 5.5-7 9-9.5"/>'
};
ICON.clear = ICON.day; ICON.winter = ICON.snow;
const icon = k => `<svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;
/* A row of choices. With icons, the name is the button's tooltip and is read out by screen readers. */
const GEAR_SEG = (key, val, opts, icons) => `<span class="yearbar setseg${icons ? " icons" : ""}" role="group">${opts.map(([v, name]) => `<button data-set="${key}" data-val="${v}" aria-pressed="${String(val) === String(v)}"${icons ? ` aria-label="${name}" title="${name}"` : ""}>${icons ? icon(v) : name}</button>`).join("")}</span>`;
/* The accent colors to pick from in Settings: [id, name, the swatch]. The first is the default; the rest are html[data-accent] in the stylesheet. */
const ACCENTS = [["", "Yellow", "#eaa33a"], ["blue", "Blue", "#4f8fe6"], ["pink", "Pink", "#ee7fa6"], ["green", "Green", "#4fae7f"], ["purple", "Purple", "#9a7be0"]];
let accentOpen = false;
const accentNow = () => { const a = document.documentElement.dataset.accent || ""; return ACCENTS.find(x => x[0] === a) || ACCENTS[0]; };
function rSettings(){
  const el = $("#settings"); if (el.hidden) return;
  const p = window.scene ? scene.prefs() : {on: false, time: "dynamic", wx: "dynamic", season: "winter", place: false}, D = ["dynamic", "Dynamic"];
  const setup = START.filter(g => g.items.some(i => !isOn(i.id)));
  const row = (label, help, ctl, pick) => `<div class="setrow"><div><b>${label}${pick ? ` <em>${pick}</em>` : ""}</b><span>${help}</span></div>${ctl}</div>`;
  const nameOf = (opts, v) => (opts.find(o => String(o[0]) === String(v)) || [0, ""])[1];
  const TIME = [D, ["dawn", "Sunrise"], ["day", "Day"], ["dusk", "Sunset"], ["night", "Night"]], WX = [D, ["clear", "Clear"], ["cloudy", "Cloudy"], ["rain", "Rain"], ["snow", "Snow"], ["fog", "Fog"]], SEASON = [D, ["winter", "Winter"], ["spring", "Spring"], ["summer", "Summer"], ["fall", "Fall"]];
  el.innerHTML = `<div class="setwrap" role="dialog" aria-modal="true" aria-label="Settings">
    <div class="sethead"><h2>Settings</h2><button class="tool" id="settings-close" aria-label="Close">${X_ICON}</button></div>
    <section class="setsec"><h3>Appearance</h3>
      ${row("Accent color", "The color of buttons, highlights and today's markers.", `<span class="accent-pick">${accentOpen ? `<span class="accent-pop" role="group" aria-label="Accent color">${ACCENTS.map(([id, name, hex]) => `<button data-accent="${id}" aria-pressed="${accentNow()[0] === id}" aria-label="${name}" title="${name}" style="--sw:${hex}"></button>`).join("")}</span>` : ""}<button class="accent-btn" id="accent-open" aria-expanded="${accentOpen}" title="Change the accent color" style="--sw:${accentNow()[2]}"><i></i>${accentNow()[1]}</button></span>`)}
      <p class="setnote">Kept in this browser only.</p>
    </section>
    ${window.scene ? `    <section class="setsec"><h3>Scene</h3>
      ${row("Show the scene", "The snowy backdrop behind every page.", GEAR_SEG("on", p.on ? 1 : 0, [[1, "On"], [0, "Off"]]))}
      <div class="setsub${p.on ? "" : " off"}">
        ${row("Time of day", "Dynamic follows the real sunrise and sunset.", GEAR_SEG("time", p.time, TIME, true), nameOf(TIME, p.time))}
        ${row("Weather", "Dynamic follows the weather outside right now.", GEAR_SEG("wx", p.wx, WX, true), nameOf(WX, p.wx))}
        ${row("Location", "Lets the real weather, sunrise and sunset follow where this browser is. The browser asks first.", GEAR_SEG("place", p.place ? 1 : 0, [[1, "On"], [0, "Off"]]))}
        ${row("Season", "Dynamic follows the calendar. Outside winter the snow becomes grass or leaves.", GEAR_SEG("season", p.season, SEASON, true), nameOf(SEASON, p.season))}
      </div>
      <p class="setnote">Kept in this browser only.</p>
    </section>` : ""}
    ${viewOnly() ? "" : `
    <section class="setsec"><h3>Backup</h3>
      <p>Everything syncs to the account while signed in. A copy can also be downloaded and loaded back.</p>
      <div class="row"><button class="btn pink" id="dl">Download backup</button><button class="btn" id="ld">Load backup</button></div>
    </section>
    <section class="setsec"><h3>Canvas calendar</h3>
      <p>${canvasUrl() ? esc(canvasMsg || "Connected.") + " Assignments from Canvas show in To-Do and refresh every time the page loads." : "Paste the Canvas calendar feed link (Canvas > Calendar > Calendar Feed). It is kept in this browser only."}</p>
      ${canvasUrl() ? `<div class="row"><button class="btn" id="cv-now">Refresh now</button><button class="btn" id="cv-off">Disconnect</button></div>` : `<form class="addrow" id="cv-form"><input type="url" id="cv-url" placeholder="https://canvas.school.edu/feeds/calendars/....ics" autocomplete="off" required><button class="btn pink" type="submit">Connect</button></form>`}
    </section>
    ${setup.length ? `<section class="setsec"><h3>Setup</h3>${setup.map(g => `<div class="setgroup"><span class="eyebrow">${esc(g.eyebrow)}</span><b>${esc(g.group)}</b>
      ${g.items.filter(i => !isOn(i.id)).map(i => ck(i.id, `<b>${esc(i.t)}</b><span class="item-d">${i.d}</span>`)).join("")}</div>`).join("")}</section>` : ""}`}
  </div>`;
}
OVERLAYS.settings = rSettings;

/* Roadmap: progress tiles, then the weeks and months ahead. Nothing here is a checkbox; this week's steps are checked off in To-Do. */
/* Home: the greeting and trail, a summary of the current month, and a small picture of each page (all in home.js). */
function rPlan(){ $("#plan").innerHTML = homeTop() + `<div class="card planbox${homeWriting() ? " enter" : ""}" style="--e:${homeT0 ? Date.now() - homeT0 : 0}ms">${homeMonth()}${homeViz()}</div>`; homeAim(); }

let certFilter = "all";
/* Certifications, laid out like To-Do: what is still to earn.
     the bar     how many are earned and how many are to go, and a filter by track
     the list    the certifications not yet earned, in the order of the plan. A row shows its track, cost and target month
                 and opens to what it is, why it fits, cost, time and format, how to prepare, the official page and the
                 "Earned" box. Ticking that clears the row (the toast offers Undo) and the count in the bar goes up.
     the panel   what the plan costs: each certification still to earn with its price, and the total line */
function rCerts(){
  const track = c => (TRACKS.find(t => t.id === c.track) || {name: c.track}).name, short = c => String(c.cost || "").replace(/\s*\(.*$/, "");
  const todo = CERTS.filter(c => !isOn(c.id)), list = todo.filter(c => certFilter === "all" || c.track === certFilter);
  const row = c => { const open = workOpen.has(c.id);
    return `<div class="pjrow${open ? " open" : ""}" id="card-${esc(c.id)}">
      <button class="pjrow-top" data-wk="${esc(c.id)}" aria-expanded="${open}">
        <i class="pj-dot"></i>
        <span class="tx"><b>${esc(c.name)}</b>
          <span class="meta"><span class="chip">${esc(track(c))}</span>${short(c) ? `<span class="small muted">${esc(short(c))}</span>` : ""}</span></span>
        <span class="when">${esc(c.month || "")}</span>${CHEV}
      </button>
      <div class="foldwrap${open ? "" : " shut"}"><div class="wk-more">
        ${c.what ? `<p class="wk-sum">${c.what}</p>` : ""}
        ${c.why ? `<p class="wk-sum"><b>Why it fits:</b> ${c.why}</p>` : ""}
        <div class="pcols">${[["Cost", c.cost], ["Time", c.time], ["Format", c.format]].filter(x => x[1]).map(([h, v]) => `<div><h4>${h}</h4><p>${esc(v)}</p></div>`).join("")}</div>
        ${c.prep && c.prep.length ? `<h4>How to prepare</h4><ol>${c.prep.map(x => `<li>${x}</li>`).join("")}</ol>` : ""}
        ${c.url ? `<p class="wk-links"><a class="ptext" href="${esc(c.url)}" target="_blank" rel="noopener">Official page</a></p>` : ""}
        ${ck(c.id, "<b>Earned</b>")}
      </div></div>
    </div>`; };
  const none = (b, t) => `<div class="clear rs-empty"><div><b>${b}</b><span>${t}</span></div></div>`;
  const rows = list.length ? `<div class="bucket"><h3>To earn</h3><span class="small muted">${list.length}</span></div><div class="tgroup">${list.map(row).join("")}</div>`
    : !CERTS.length ? example("certs") : todo.length ? none("Nothing here", "No certifications in this track are left to earn.") : none("All earned", "Every certification in the plan is earned.");
  const side = todo.length ? `<div class="side"><aside class="cal pf-ref ct-cost" aria-label="What the plan costs"><div class="cal-h"><b>Cost</b></div>
      ${todo.map(c => `<div class="ct-line"><span>${esc(c.short || c.name)}</span><b>${esc(short(c) || "")}</b></div>`).join("")}
      ${COSTNOTE ? `<p class="ct-note">${COSTNOTE}</p>` : ""}</aside></div>` : "";
  const used = TRACKS.filter(t => todo.some(c => c.track === t.id));
  $("#certs").innerHTML = `
    <div class="chips todobar">
      <div class="sum"><div><b>${CERTS.length - todo.length}</b><span>earned</span></div><div><b>${todo.length}</b><span>to go</span></div></div>
      ${used.length > 1 ? `<select id="cert-track" class="areasel${certFilter === "all" ? "" : " on"}" aria-label="Filter by track"><option value="all">All tracks · ${todo.length}</option>${used.map(t => `<option value="${t.id}"${certFilter === t.id ? " selected" : ""}>${esc(t.name)} · ${todo.filter(c => c.track === t.id).length}</option>`).join("")}</select>` : ""}
      <span class="tools">${skillTool("certs")}</span>
    </div>
    <div class="tdwrap"><div>${rows}</div>${side}</div>`;
  const wrap = $("#certs .tdwrap"), first = wrap && wrap.querySelector(".tgroup, .clear"), sd = wrap && wrap.querySelector(".side");
  if (first && sd && wrap.offsetParent) sd.style.setProperty("--side-top", Math.max(0, Math.round(first.getBoundingClientRect().top - wrap.getBoundingClientRect().top)) + "px");
}

/* Laid out like the graduation requirements: two columns (technical, non-technical), a row per skill with a bar for how many
   postings ask for it, how to get it and where on the site it is built, and a tick on the left for "can show proof". */
function rTargets(){
  const box = $("#targets"); if (!box || box.hidden) return;
  const ro = viewOnly(), n = TARGETS.filter(t => isOn(t.id)).length, soft = t => !!t.soft;
  const dest = t => t.go === "overview" || t.go === "plan" ? "" : `<div class="rqc"><button class="ptext" data-go="${t.go}">${esc(t.btn)}</button></div>`;
  /* the bar is how many of the postings ask for the skill, so longer bars matter more; rows are ranked by it */
  const share = t => { const m = /(\d+)\s+of\s+(\d+)/.exec(t.count); return m ? Number(m[1]) / Number(m[2]) : 0; };
  const row = t => `<div class="rqrow tg-row${isOn(t.id) ? " rq-done" : ""}"><label class="tg-ck" title="Can show proof"><input type="checkbox" data-id="${t.id}" aria-label="Can show proof of ${esc(t.name)}"${isOn(t.id) ? " checked" : ""}${ro ? " disabled" : ""}></label>
      <div><b>${esc(t.name)}</b><span class="tg-bar"><i><u style="width:${Math.round(share(t) * 100)}%"></u></i><em>${esc(t.count)}</em></span><span class="rqh">${t.how}</span>${dest(t)}</div></div>`;
  const col = (name, xs) => `<div class="rqcol"><h3>${name}</h3>${xs.slice().sort((a, b) => share(b) - share(a)).map(row).join("")}</div>`;
  box.innerHTML = `<div class="mapbox rqbox" role="dialog" aria-modal="true" aria-label="Targets"><div class="maphead"><h2>Targets</h2><span class="rqsum">${n} of ${TARGETS.length} proven</span><button class="tool" id="targets-close" aria-label="Close">${X_ICON}</button></div>
    <div class="rqcols">${(() => { const tech = TARGETS.filter(t => !soft(t)).sort((a, b) => share(b) - share(a)), half = Math.ceil(tech.length / 2); return col("Technical", tech.slice(0, half)) + col("&nbsp;", tech.slice(half)); })()}${col("Non-technical", TARGETS.filter(soft))}</div>
    <p class="rqnote">How often each skill shows up across ${POSTINGS.length} target postings: ${POSTINGS.map(p => `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.company)}</a>`).join(", ")}.</p></div>`;
}
/* The skills the target postings ask for open over the Projects page, from the target icon in its toolbar. */
OVERLAYS.targets = rTargets;
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("#targets [data-go]")) overlay("targets", false); });

/* Portfolio, laid out like To-Do: what is left to do to get the portfolio built and each project onto it.
     the bar     how many project pages are published, how many are still to write up, and how many setup steps are left
     the list    Setup (the steps not yet ticked, as checkbox rows) and Project pages: every project built or in progress
                 (roles left out), published ones last. A row says what may be public for its kind and opens to the piece
                 planned for it and its links.
     the panel   the reference: what every project page shows, the monthly routine, and where things live */
function rPortfolio(){
  const left = PORTFOLIO.setup.filter(i => !isOn(i.id));
  const pages = WORKS.filter(w => !w.exp).map(w => ({w, plan: w.plan && PROJECTS.find(p => p.id === w.plan), out: !!(w.public || w.page)}))
    .sort((x, y) => (x.out ? 1 : 0) - (y.out ? 1 : 0) || (x.w.status === "done" ? 0 : 1) - (y.w.status === "done" ? 0 : 1) || y.w.start.localeCompare(x.w.start));
  /* what may be public for a kind of project, from the content's own rules ("Class: write-up only, never code.") */
  const rule = k => { const r = PORTFOLIO.kinds.find(p => String(p[0]).toLowerCase().startsWith(k)); return r ? r[1].charAt(0).toUpperCase() + r[1].slice(1) : ""; };
  const page = ({w, plan, out}) => { const id = "pf-" + w.id, open = workOpen.has(id), links = typeof workLinks === "function" ? workLinks(w) : "";
    return `<div class="pjrow${open ? " open" : ""}" id="${esc(id)}">
      <button class="pjrow-top" data-wk="${esc(id)}" aria-expanded="${open}">
        <i class="pj-dot${out ? " live" : ""}"></i>
        <span class="tx"><b>${esc(w.title)}</b>
          <span class="meta"><span class="chip">${esc(workKind(w.kind))}</span>${rule(w.kind) ? `<span class="small muted">${rule(w.kind)}</span>` : ""}</span></span>
        <span class="when">${out ? "Published" : w.status === "done" ? "Ready to write up" : "In progress"}</span>${CHEV}
      </button>
      <div class="foldwrap${open ? "" : " shut"}"><div class="wk-more">
        ${plan && plan.portfolio ? `<p class="wk-sum"><b>The piece:</b> ${plan.portfolio}</p>` : w.summary ? `<p class="wk-sum">${esc(w.summary)}</p>` : `<p class="sgnone">Nothing planned for this page yet.</p>`}
        ${links ? `<p class="wk-links">${links}</p>` : ""}
        ${plan ? ck(plan.id, "<b>Finished and published</b>") : ""}
      </div></div>
    </div>`; };
  const group = (name, n, body) => n ? `<div class="bucket"><h3>${name}</h3><span class="small muted">${n}</span></div><div class="tgroup">${body}</div>` : "";
  const todo = pages.filter(p => !p.out), done = pages.filter(p => p.out);
  const rows = group("Setup", left.length, left.map(i => `<label class="todo"><input type="checkbox" data-id="${esc(i.id)}"${viewOnly() ? " disabled" : ""}><span class="tx"><b>${esc(i.t)}</b><span class="meta"><span class="small muted">${i.d}</span></span></span></label>`).join(""))
    + group("To write up", todo.length, todo.map(page).join("")) + group("Published", done.length, done.map(page).join(""));
  const card = (title, body) => `<aside class="cal pf-ref"><div class="cal-h"><b>${title}</b></div>${body}</aside>`;
  const pairs = xs => `<ol>${xs.map(p => `<li><b>${esc(p[0])}:</b> ${p[1]}</li>`).join("")}</ol>`;
  const side = [PORTFOLIO.parts.length ? card("Every project page shows", pairs(PORTFOLIO.parts)) : "", PORTFOLIO.sunday.length ? card("Monthly routine", `<ol>${PORTFOLIO.sunday.map(x => `<li>${x}</li>`).join("")}</ol>`) : "", PORTFOLIO.where.length ? card("Where things live", pairs(PORTFOLIO.where).replace(/ol>/g, "ul>")) : ""].join("");
  $("#portfolio").innerHTML = `
    <div class="chips todobar"><div class="sum"><div><b>${done.length}</b><span>published</span></div><div><b>${todo.length}</b><span>to write up</span></div>${PORTFOLIO.setup.length ? `<div><b>${left.length}</b><span>setup step${left.length === 1 ? "" : "s"} left</span></div>` : ""}</div><span class="tools">${skillTool("portfolio")}</span></div>
    <div class="tdwrap"><div>${rows || example("portfolio")}</div>${side ? `<div class="side">${side}</div>` : ""}</div>`;
  const wrap = $("#portfolio .tdwrap"), first = wrap && wrap.querySelector(".tgroup, .clear"), sd = wrap && wrap.querySelector(".side");
  if (first && sd && wrap.offsetParent) sd.style.setProperty("--side-top", Math.max(0, Math.round(first.getBoundingClientRect().top - wrap.getBoundingClientRect().top)) + "px");
}

function renderAll(){ rTodo(); rBigCal(); rApps(); rFind(); rSettings(); rPlan(); rStudy(); rProjects(); rCerts(); rTargets(); rPortfolio(); rSchool(); rLater(); rMap(); }

/* ---------- events ---------- */
/* One listener per kind of event for the whole page. Buttons say what they do through an id or a data- attribute, and the
   handlers below look for those, so a page can be redrawn at any time without re-attaching anything. */
document.addEventListener("change", e => {
  const el = e.target;
  if (el.matches("input[type=checkbox][data-id]")){
    const id = el.dataset.id;
    /* application deadlines and repeating tasks are not cleared: one moves the application on, the other moves to its next date */
    const moved = el.checked && (id.startsWith("apd-") ? appApplied(id.slice(4)) : repeatDone(id));
    if (!moved){ if (el.checked) state.checks[id] = Date.now(); else delete state.checks[id]; }
    if (el.checked && window.scene){ const r = el.getBoundingClientRect(); scene.fish(r.left + r.width / 2, r.top + r.height / 2); }
    save();
    /* a ticked task slides out to the right and the rows below close up, then the list is redrawn */
    const row = el.checked && el.closest("#todo .todo");
    if (row && !window.matchMedia("(prefers-reduced-motion: reduce)").matches){
      row.style.height = row.offsetHeight + "px"; row.offsetHeight; row.classList.add("leaving"); row.style.height = "0px"; if (row.nextElementSibling && row.nextElementSibling.classList.contains("steps")) row.nextElementSibling.hidden = true;
      setTimeout(rerender, 420);
    } else rerender();
    if (moved) return;
    if (el.checked && /^(td-|w-|s-|u-|pf-)/.test(id)) toast("Done and cleared.", id);
    else if (el.checked && id.startsWith("c-")) toast("Certification earned!", id);
    else if (el.checked && id.startsWith("p-")) toast("Project done. Next: write it up on the portfolio.");
    else if (el.checked && id.startsWith("t-")) toast("Target covered. One fewer gap for interviewers to find.");
    else toast("Saved");
  }
  if (el.id === "loadfile" && el.files[0]){
    const r = new FileReader();
    r.onload = () => { try { const s = JSON.parse(r.result); if (!s || typeof s.checks !== "object") throw 0; state = {checks: s.checks}; save(); renderAll(); show(location.hash.slice(1)); toast("Backup loaded"); } catch(err){ toast("That file isn't a roadmap backup"); } el.value = ""; };
    r.readAsText(el.files[0]);
  }
});
document.addEventListener("click", e => {
  const t = e.target.closest("button, a");
  if (!t) return;
  if (t.dataset.undo){ if (t.dataset.undo === "fn"){ if (undoFn) undoFn(); undoFn = null; } else delete state.checks[t.dataset.undo]; save(); rerender(); toast("Put back"); return; }
  if (t.id === "cv-now"){ canvasPull(true); return; }
  if (t.id === "cv-off"){ lsSet(CV_URL, ""); lsSet(CV_DATA, ""); canvasCache = null; canvasMsg = ""; rerender(); toast("Canvas disconnected"); return; }
  if (t.id === "finals-tog"){ finalsOff = !finalsOff; rerender(); return; }
  if (t.id === "focus"){ focusOn = !focusOn; try { localStorage.setItem("roadmap-focus", focusOn ? "1" : "0"); } catch(e) {} rTodo(); return; }
  if (t.id === "add-open"){ addOpen = !addOpen; rTodo(); const i = $("#add-t"); if (i) i.focus(); return; }
  if (t.dataset.prio){ e.preventDefault(); const id = t.dataset.prio, all = Object.assign({}, prios()); if (all[id]) delete all[id]; else all[id] = 1; if (Object.keys(all).length) state.checks._prio = all; else delete state.checks._prio; save(); rerender(); return; }
  if (t.dataset.edit){ e.preventDefault(); editId = t.dataset.edit; rTodo(); const i = $("#ed-t"); if (i){ i.focus(); i.select(); } return; }
  if (t.id === "ed-cancel"){ editId = null; rTodo(); return; }
  if (t.id === "ed-del"){
    const id = editId, mine = added().find(x => x.id === id); editId = null;
    if (mine){ state.checks._added = added().filter(x => x !== mine); save(); rerender(); toast("Deleted", () => { state.checks._added = added().concat([mine]); }); }
    else { state.checks[id] = Date.now(); save(); rerender(); toast("Removed from the list", id); }
    return;
  }
  if (t.id === "later-tog"){ laterOpen = !laterOpen; try { localStorage.setItem("roadmap-later", laterOpen ? "1" : "0"); } catch(e) {} const w = $("#later-wrap"); if (w) w.classList.toggle("shut", !laterOpen); t.setAttribute("aria-expanded", laterOpen); return; }
  if (t.id === "accent-open"){ accentOpen = !accentOpen; rSettings(); return; }
  if (t.dataset.accent != null && t.closest(".accent-pop")){
    const a = t.dataset.accent; accentOpen = false;
    if (a) document.documentElement.dataset.accent = a; else delete document.documentElement.dataset.accent;
    try { if (a) localStorage.setItem("roadmap-accent", a); else localStorage.removeItem("roadmap-accent"); } catch(e) {}
    rSettings(); return;
  }
  if (t.dataset.set && window.scene){ const k = t.dataset.set, v = t.dataset.val; scene.set({[k]: k === "on" ? v === "1" : v}); rSettings(); if (k === "on" || k === "season") rPlan(); /* Home dresses for the scene */ return; }
  if (t.id === "ics"){ exportIcs(); return; }
  if (t.id === "app-open"){ appAddOpen = !appAddOpen; rApps(); const i = $("#app-org"); if (i) i.focus(); return; }
  if (t.dataset.app){ moveApp(t.dataset.app, Number(t.dataset.to)); return; }
  if (t.dataset.track){ const [g, k] = t.dataset.track.split("-").map(Number), x = FIND[g].items[k]; trackApp(x.org, x.what, x.url, ""); toast("Added to the board"); return; }
  if (t.dataset.jump){
    const q = `#todo .todo input[data-id="${t.dataset.jump}"]`;
    if (document.querySelector(".foldwrap.shut " + q.slice(6))){ laterOpen = true; rTodo(); }
    const row = document.querySelector(q); jumpTo(row && row.closest(".todo"));
    return;
  }
  if (t.dataset.cal){ calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + Number(t.dataset.cal), 1); rTodo(); return; }
  if (t.dataset.day){
    if (t.classList.contains("none")) return;
    const q = `#todo .todo[data-due="${t.dataset.day}"]`;
    if (!document.querySelector(q.replace(".todo[", ".tgroup:not(.foldwrap.shut *) .todo[")) && document.querySelector(q)){ laterOpen = true; rTodo(); }
    jumpTo([...document.querySelectorAll(q)]);
    return;
  }
  if (t.dataset.group){ const g = GROUPS.find(x => x.id === t.dataset.group); location.hash = lastTab[g.id] || g.tabs[0][0]; return; }
  if (t.dataset.tab){ location.hash = t.dataset.tab; return; }
  if (t.dataset.go){ location.hash = t.dataset.go; return; }
  if (t.id === "dl"){
    const blob = new Blob([JSON.stringify({plan:KEY, saved:new Date().toISOString(), checks:state.checks}, null, 2)], {type:"application/json"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "roadmap-backup-" + new Date().toISOString().slice(0,10) + ".json"; document.body.appendChild(a); a.click(); a.remove();
    toast("Backup downloaded"); return;
  }
  if (t.id === "ld"){ $("#loadfile").click(); return; }
});


/* ---------- filters ease their results in ---------- */
/* Picking a filter redraws the page at once, which made cards pop in and everything under them jump. After a filter is
   used, each block of the page (headings, cards, tables) fades up in turn, top to bottom. The listeners run before the
   page's own handlers, so the timer fires once the new blocks are drawn. */
const SWAP_BLOCKS = ".bucket, .tgroup > *, .board .app, .board .app-none, .tablewrap, .pagenote, .wk-h2, section.tab > footer";
function swapIn(){
  const sec = document.querySelector("section.tab.on"); if (!sec || sec.id === "plan") return;
  [...sec.querySelectorAll(SWAP_BLOCKS)].forEach((el, i) => { el.classList.remove("swapin"); void el.offsetWidth; el.style.setProperty("--si", Math.min(i, 16)); el.classList.add("swapin"); });
}
document.addEventListener("click", e => { if (e.target.closest && e.target.closest("section.tab .yearbar button")) setTimeout(swapIn, 0); }, true);
document.addEventListener("change", e => { if (e.target.closest && e.target.closest("section.tab select.areasel")) setTimeout(swapIn, 0); }, true);
