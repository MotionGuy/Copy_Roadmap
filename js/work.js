/* The Projects page, laid out like To-Do: what is being built now and what is planned next, and what each one does
   for the career goal.
     the bar      how many are in progress and planned, how many of the target skills they cover, and a filter by kind
     the list     In progress (the content's works that are active) and Planned (its projects that nothing built has
                  picked up; one marked "idea" is a suggestion not yet agreed to). A row shows how many target skills it covers and opens in place to the summary,
                  stack, those skills, bullets, the plan and links. Finished projects and roles (works with "exp") are not shown here.
     the panel    the skills target postings ask for (the content's targets), most asked first, with a dot for each
                  project that covers it: filled for one in progress, hollow for one planned. Clicking a skill shows
                  only the projects that cover it.
   A project says which skills it covers with "targets", a list of target ids. The notes, the log and the write-up for
   each project live in the project notes (the vault) and its files in a Drive folder. */

const WORK_KINDS = [["personal", "Personal"], ["class", "Class"], ["club", "Club"], ["work", "Work"]];
const workKind = k => (WORK_KINDS.find(x => x[0] === k) || [k, k])[1];
let workFilter = "all", workSkill = "";
const workOpen = new Set();
/* a project's outside links: its portfolio page, a public repo, a demo, and (signed in only) its Drive folder and its notes */
const workLinks = w => [["page", "Portfolio page"], ["github", "GitHub"], ["demo", "Demo"], ["drive", "Drive folder"], ["notes", "Notes"]].filter(([k]) => w[k] && ((k !== "drive" && k !== "notes") || !viewOnly())).map(([k, n]) => `<a class="ptext" href="${esc(w[k])}" target="_blank" rel="noopener">${n}</a>`).join("");
const CHEV = `<svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 2l4 4-4 4"/></svg>`;

/* ---------- projects ---------- */
/* One list item per project in progress or planned: {id, dom, title, kind, sub, when, live, idea, text, stack, bullets, plan, w, skills} */
function projectItems(){
  const linked = new Set(WORKS.map(w => w.plan).filter(Boolean)), out = [];
  for (const w of WORKS){
    const plan = w.plan && PROJECTS.find(p => p.id === w.plan);
    if (w.exp || w.status !== "active" || (plan && isOn(plan.id))) continue;
    out.push({id: w.id, dom: w.id, title: w.title, kind: w.kind, sub: [w.role, w.cls || w.org].filter(Boolean).join(" · "), when: w.when, start: w.start, live: true, text: esc(w.summary || ""), stack: w.stack, bullets: w.bullets, plan, w,
      skills: [...new Set((w.targets || []).concat(plan && plan.targets || []))]});
  }
  out.sort((x, y) => y.start.localeCompare(x.start));
  for (const p of PROJECTS) if (!linked.has(p.id) && !isOn(p.id))
    out.push({id: p.id, dom: "card-" + p.id, title: p.title, kind: String(p.kind || "").toLowerCase(), kindName: p.kind, sub: "", when: p.monthName, live: false, idea: !!p.idea, text: "", stack: p.skill ? p.skill.split(/,\s*/) : [], bullets: [], plan: p, skills: p.targets || []});
  return out;
}
function rProjects(){
  const all = projectItems(), tname = id => (TARGETS.find(t => t.id === id) || {name: id}).name;
  if (workSkill && !TARGETS.some(t => t.id === workSkill)) workSkill = "";
  const list = all.filter(i => (workFilter === "all" || i.kind === workFilter) && (!workSkill || i.skills.includes(workSkill)));
  const covered = TARGETS.filter(t => all.some(i => i.skills.includes(t.id))).length;
  const row = i => { const open = workOpen.has(i.id), links = i.w ? workLinks(i.w) : "", p = i.plan;
    return `<div class="pjrow${open ? " open" : ""}" id="${esc(i.dom)}">
      <button class="pjrow-top" data-wk="${esc(i.id)}" aria-expanded="${open}">
        <i class="pj-dot${i.live ? " live" : ""}"></i>
        <span class="tx"><b>${esc(i.title)}</b>${i.sub ? ` <span class="small muted">${esc(i.sub)}</span>` : ""}
          <span class="meta"><span class="chip">${esc(i.kindName || workKind(i.kind))}</span>${i.idea ? `<span class="chip">Idea</span>` : ""}${i.skills.length ? `<span class="small muted">${i.skills.length} skill${i.skills.length === 1 ? "" : "s"}</span>` : ""}</span></span>
        <span class="when">${esc(i.when || "")}</span>${CHEV}
      </button>
      <div class="foldwrap${open ? "" : " shut"}"><div class="wk-more">
        ${i.text ? `<p class="wk-sum">${i.text}</p>` : ""}
        ${i.live && p ? "" : p ? `<p class="wk-sum">${p.why}</p>` : ""}
        ${i.stack.length ? `<p class="rs-skills">${i.stack.map(k => `<span class="chip">${esc(k)}</span>`).join("")}</p>` : ""}
        ${i.skills.length ? `<h4>Skills it covers</h4><p class="rs-skills">${i.skills.map(id => `<span class="chip pink${workSkill === id ? " on" : ""}">${esc(tname(id))}</span>`).join("")}</p>` : ""}
        ${i.bullets.length ? `<h4>So far</h4><ul>${i.bullets.map(b => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
        ${p && p.steps.length ? `<h4>${i.live ? "Next" : "Steps"}</h4><ol>${p.steps.map(x => `<li>${x}</li>`).join("")}</ol>` : ""}
        ${p && p.portfolio ? `<p class="small"><b>Portfolio piece:</b> ${p.portfolio}</p>` : ""}
        ${links || (i.w && i.w.cls && inPlan(i.w.cls)) ? `<p class="wk-links">${links}${i.w && i.w.cls && inPlan(i.w.cls) ? `<button class="ptext" data-pc="${esc(i.w.cls)}">${esc(i.w.cls)} on Academic plan</button>` : ""}</p>` : ""}
        ${p ? ck(p.id, "<b>Finished and published</b>") : ""}
      </div></div>
    </div>`; };
  const group = (name, xs) => xs.length ? `<div class="bucket"><h3>${name}</h3><span class="small muted">${xs.length}</span></div><div class="tgroup">${xs.map(row).join("")}</div>` : "";
  const rows = list.length ? group("In progress", list.filter(i => i.live)) + group("Planned", list.filter(i => !i.live))
    : (all.length ? `<div class="clear rs-empty"><div><b>Nothing here</b><span>No projects match this filter.</span></div></div>` : example("projects"));
  /* the skills panel: each target with how often postings ask for it and a dot per project that covers it */
  const side = TARGETS.length ? `<div class="side"><aside class="cal pj-skills" aria-label="Skills the target postings ask for"><div class="cal-h"><b>Skills postings ask for</b>${workSkill ? `<button data-pjskill="" title="Show every project">Clear</button>` : ""}</div>
      ${TARGETS.map(t => { const xs = all.filter(i => i.skills.includes(t.id)); return `<button class="pj-skill${workSkill === t.id ? " on" : ""}${xs.length ? "" : " none"}" data-pjskill="${esc(t.id)}" aria-pressed="${workSkill === t.id}" title="${esc(t.count || "")}${xs.length ? "" : ". No project covers this yet"}"><span>${esc(t.name)}</span><span class="pj-dots">${xs.length ? xs.map(i => `<i class="${i.live ? "live" : ""}"></i>`).join("") : `<em>none yet</em>`}</span></button>`; }).join("")}
      <button class="btn cal-x" id="targets-open">All targets</button></aside></div>` : "";
  $("#projects").innerHTML = `
    <div class="chips todobar">
      <div class="sum"><div><b>${all.filter(i => i.live).length}</b><span>in progress</span></div><div><b>${all.filter(i => !i.live).length}</b><span>planned</span></div>${TARGETS.length ? `<div><b>${covered}</b><span>of ${TARGETS.length} skills covered</span></div>` : ""}</div>
      <select id="work-kind" class="areasel${workFilter === "all" ? "" : " on"}" aria-label="Filter by kind"><option value="all">All kinds · ${all.length}</option>${WORK_KINDS.filter(([v]) => all.some(i => i.kind === v)).map(([v, n]) => `<option value="${v}"${workFilter === v ? " selected" : ""}>${esc(n)} · ${all.filter(i => i.kind === v).length}</option>`).join("")}</select>
      <span class="tools">${skillTool("projects")}</span>
    </div>
    <div class="tdwrap"><div>${rows}</div>${side}</div>`;
  /* line the panel up with the first group, as To-Do does with its calendar */
  const wrap = $("#projects .tdwrap"), first = wrap && wrap.querySelector(".tgroup, .clear"), sd = wrap && wrap.querySelector(".side");
  if (first && sd && wrap.offsetParent) sd.style.setProperty("--side-top", Math.max(0, Math.round(first.getBoundingClientRect().top - wrap.getBoundingClientRect().top)) + "px");
}

/* ---------- events ---------- */
document.addEventListener("change", e => { if (e.target.id === "work-kind"){ workFilter = e.target.value; rProjects(); } });
document.addEventListener("click", e => {
  const t = e.target.closest && e.target.closest("button"); if (!t) return;
  /* open or close one project; the fold animates, so only the classes change */
  if (t.dataset.wk){
    const id = t.dataset.wk, card = t.closest(".wk, .pjrow"), open = !workOpen.has(id);
    if (open) workOpen.add(id); else workOpen.delete(id);
    card.classList.toggle("open", open); t.setAttribute("aria-expanded", open); card.querySelector(".foldwrap").classList.toggle("shut", !open);
    return;
  }
  /* the skills panel: show only the projects that cover one skill, or all of them again */
  if (t.dataset.pjskill != null){ workSkill = workSkill === t.dataset.pjskill ? "" : t.dataset.pjskill; rProjects(); return; }
  /* to a planned project, opened: on its own row, or on the row of the project in progress that continues it */
  if (t.dataset.wkplan){ const pid = t.dataset.wkplan.replace(/^card-/, ""), w = WORKS.find(x => x.plan === pid); workOpen.add(w ? w.id : pid); workFilter = "all"; workSkill = ""; rProjects(); jumpTo(document.getElementById(w ? w.id : "card-" + pid), 60); return; }
});
