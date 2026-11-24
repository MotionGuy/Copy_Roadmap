/* Day-to-day planning on top of the To-Do list: repeating tasks, steps inside a task, dragging a task
   onto a calendar day, and application deadlines that show up as tasks.
   Loaded after app.js and uses its helpers ($, esc, today, openItems, added, edits, save, rerender, toast and the calendar ones). */

/* ---------- repeating tasks ---------- */
/* A task added on the site can carry "rep". Ticking it off moves its due date to the next round instead of clearing it. */
const REPS = [["", "Does not repeat"], ["d", "Every day"], ["w", "Every week"], ["2w", "Every 2 weeks"], ["m", "Every month"]];
const repName = r => ((REPS.find(x => x[0] === r) || REPS[0])[1]).toLowerCase();
const repSelect = (id, cur) => `<select id="${id}" aria-label="Repeat">${REPS.map(([v, n]) => `<option value="${v}"${v === (cur || "") ? " selected" : ""}>${n}</option>`).join("")}</select>`;
const REP_ICON = `<svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a6.2 6.2 0 0 1 11.2-2.400M16 12a6.200 6.2 0 0 1-11.2 2.4"/><path d="M15.600 2.400v3.400h-3.400M4.400 17.600v-3.400h3.400"/></svg>`;
/* The next due date after "due": at least one step on, and never left in the past. */
function repNext(due, rep){
  let d = parseD(due); const t = today();
  do { d = rep === "m" ? new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()) : addDays(d, rep === "d" ? 1 : rep === "2w" ? 14 : 7); } while (d < t);
  return isoOf(d);
}
/* Called when a task is ticked. Returns true if it was a repeating one and has been moved on. */
function repeatDone(id){
  const mine = added().find(x => x.id === id); if (!mine || !mine.rep) return false;
  const was = mine.due, subsWas = subsOf(id);
  mine.due = repNext(mine.due || isoOf(today()), mine.rep);
  if (subsWas.length) setSubs(id, subsWas.map(s => ({t: s.t})));
  state.checks._added = added().slice();
  toast("Done. Next one is " + fmt(parseD(mine.due)) + ".", () => { const m = added().find(x => x.id === id); if (m){ if (was) m.due = was; else delete m.due; } setSubs(id, subsWas); });
  return true;
}

/* ---------- application deadlines ---------- */
/* Every application still in "To start" with a deadline gets a task, unless a task for it is already on the list.
   Ticking that task moves the application to Applied. */
function appTasks(have){
  const out = [];
  for (const a of APPS.concat(appsAdded())){
    if (appStage(a) !== "To start" || !a.due) continue;
    const word = (String(a.org).toLowerCase().match(/[a-z0-9]{4,}/) || [String(a.org).toLowerCase()])[0];
    if (have.some(x => x.due === a.due && String(x.t).toLowerCase().includes(word))) continue;
    out.push({id: "apd-" + a.id, a: "career", t: "Apply: " + a.org, due: a.due, note: "From Applications"});
  }
  return out;
}
function appApplied(appId){
  const was = state.checks._apps && state.checks._apps[appId];
  state.checks._apps = Object.assign({}, state.checks._apps, {[appId]: "Applied"});
  toast("Moved to Applied on the board.", () => { const m = Object.assign({}, state.checks._apps); if (was) m[appId] = was; else delete m[appId]; state.checks._apps = m; });
  return true;
}

/* ---------- steps inside a task ---------- */
/* state.checks._subs is {task id: [{t: text, d: done}]}. */
let subOpen = null;
const subsAll = () => state.checks._subs && typeof state.checks._subs === "object" ? state.checks._subs : {};
const subsOf = id => Array.isArray(subsAll()[id]) ? subsAll()[id] : [];
function setSubs(id, list){
  const all = Object.assign({}, subsAll());
  if (list.length) all[id] = list; else delete all[id];
  if (Object.keys(all).length) state.checks._subs = all; else delete state.checks._subs;
}
const STEP_ICON = `<svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.500 5.500h7M3.500 10h7M3.500 14.500h5"/><path d="M15 8.500v6M12 11.500h6"/></svg>`;
function subsHtml(i){
  const list = subsOf(i.id), ro = viewOnly(), open = subOpen === i.id && !ro;
  if (!list.length && !open) return "";
  return `<div class="steps">${list.map((s, k) => `<label class="step${s.d ? " done" : ""}"><input type="checkbox" data-sub="${esc(i.id)}" data-k="${k}"${s.d ? " checked" : ""}${ro ? " disabled" : ""}><span>${esc(s.t)}</span>${ro ? "" : `<button type="button" class="stepx" data-subdel="${esc(i.id)}" data-k="${k}" aria-label="Remove this step" title="Remove this step">×</button>`}</label>`).join("")}${open ? `<form class="addrow stepform" id="sub-form" data-id="${esc(i.id)}"><input type="text" id="sub-t" placeholder="Add a step" maxlength="140" required><button class="btn pink" type="submit">Add</button><button class="btn" type="button" id="sub-close">Close</button></form>` : ""}</div>`;
}
document.addEventListener("change", e => {
  const el = e.target; if (!el.matches || !el.matches("input[data-sub]")) return;
  const id = el.dataset.sub, list = subsOf(id).map(s => Object.assign({}, s)), s = list[Number(el.dataset.k)]; if (!s) return;
  if (el.checked) s.d = 1; else delete s.d;
  setSubs(id, list); save(); rerender();
});
document.addEventListener("submit", e => {
  if (e.target.id !== "sub-form") return;
  e.preventDefault();
  const id = e.target.dataset.id, t = $("#sub-t").value.trim(); if (!t) return;
  setSubs(id, subsOf(id).concat([{t}])); $("#sub-t").value = "";
  save(); rerender(); const i = $("#sub-t"); if (i) i.focus();
});

/* ---------- drag a task onto a day ---------- */
/* Task rows and the tasks inside the calendar can be dragged; any day (small calendar, month view, the week view's Due row)
   takes the drop and becomes the new due date. Touch screens use the pencil instead. */
function setDue(id, due){
  const cur = openItems().find(i => i.id === id); if (!cur || (cur.due || "") === due || id.startsWith("apd-")) return;
  const was = cur.due || "", edWas = edits()[id] ? Object.assign({}, edits()[id]) : null, isMine = () => added().find(x => x.id === id);
  const m = isMine();
  if (m){ m.due = due; state.checks._added = added().slice(); }
  else state.checks._edits = Object.assign({}, edits(), {[id]: Object.assign({}, edits()[id], {due})});
  save(); rerender();
  toast("Moved to " + parseD(due).toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric"}) + ".", () => {
    const m2 = isMine();
    if (m2){ if (was) m2.due = was; else delete m2.due; state.checks._added = added().slice(); }
    else { const all = Object.assign({}, edits()); if (edWas) all[id] = edWas; else delete all[id]; state.checks._edits = all; }
  });
}
let dragTask = null, dropEl = null;
const dropMark = el => { if (dropEl === el) return; if (dropEl) dropEl.classList.remove("dropon"); dropEl = el; if (el) el.classList.add("dropon"); };
document.addEventListener("dragstart", e => {
  const el = e.target.closest && e.target.closest("[data-drag]"); if (!el || viewOnly()) return;
  dragTask = el.dataset.drag; e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragTask);
  document.documentElement.classList.add("dragtask");
});
document.addEventListener("dragover", e => {
  const d = dragTask && e.target.closest && e.target.closest("[data-drop]");
  dropMark(d || null); if (d){ e.preventDefault(); e.dataTransfer.dropEffect = "move"; }
});
document.addEventListener("drop", e => {
  const d = dragTask && e.target.closest && e.target.closest("[data-drop]"); if (!d) return;
  e.preventDefault(); const id = dragTask; dragTask = null; dropMark(null); document.documentElement.classList.remove("dragtask");
  setDue(id, d.dataset.drop);
});
document.addEventListener("dragend", () => { dragTask = null; dropMark(null); document.documentElement.classList.remove("dragtask"); });

/* ---------- what happens on a day ---------- */
/* Everything with a time on one day, earliest first: class meetings while the quarter is in session, exams among that day's
   tasks ("items"). */
function dayEvents(d, items){
  const key = isoOf(d), term = TERMS.find(q => q.start <= key && key <= (q.lastClass || q.end)), out = [];
  if (term) for (const c of term.classes) for (const [kind, dows, a, b, room] of c.times || []) if (dows.includes(d.getDay())) out.push({a: minsOf(a), b: minsOf(b), name: c.code, kind, room: room || "", sub: kind + (room ? " · " + room : ""), cls: "meet"});
  for (const i of items || []) if (isExam(i)){ const a = minsOf(i.time); out.push({a, b: a + (/final/i.test(i.t) ? 120 : 60), name: (i.cls ? i.cls + " " : "") + i.t, sub: i.time, cls: "exam", id: i.id}); }
  return out.sort((x, y) => x.a - y.a);
}

/* ---------- steps inside a task: clicks ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("button"); if (!t) return;
  if (t.dataset.subadd){ e.preventDefault(); subOpen = subOpen === t.dataset.subadd ? null : t.dataset.subadd; rTodo(); const i = $("#sub-t"); if (i) i.focus(); return; }
  if (t.id === "sub-close"){ subOpen = null; rTodo(); return; }
  if (t.dataset.subdel){
    e.preventDefault(); const id = t.dataset.subdel, was = subsOf(id);
    setSubs(id, was.filter((_, k) => k !== Number(t.dataset.k))); save(); rerender(); toast("Step removed", () => setSubs(id, was));
    return;
  }
});
/* ---------- date rollover ---------- */
/* Redraw everything when the date rolls over, so "today" and "tomorrow" stay true on a page left open overnight. */
let dayShown = isoOf(today());
setInterval(() => {
  if (isoOf(today()) !== dayShown){ dayShown = isoOf(today()); rerender(); return; }
}, 30000);
