/* The School pages: Overview (four-year grid and the big picture), Academic plan (every class, year by year), Study guides,
   and the overlays opened from them (course map, graduation requirements, how the classes fit together, things to watch out for).
   Everything here is drawn from the content's later, reqs, credit, terms and study. Nothing on these pages is saved:
   whether a class is taken, in session or planned comes from the calendar.
   Loaded after app.js, which supplies the helpers ($, esc, parseD, today, jumpTo, navH, overlay, X_ICON). */
/* ---------- shared: the plan, its dates, and small pieces of markup ---------- */
let planYear = null, studyYear = null;
const unitsOf = c => c.units || 4;
const qUnits = q => q.courses.reduce((n, c) => n + unitsOf(c), 0);
const planCourses = () => LATER.years.flatMap((y, yi) => y.quarters.flatMap(q => q.courses.map(c => ({c, q, yi}))));
/* A term (a quarter or a semester, by the school's system) is taken, now or planned from today's date. Dates come from TERMS when the term
   is listed there, otherwise from its name and the usual dates for that system. In LATER a year's terms are under "quarters" either way. */
function quarterStatus(q){
  const t = TERMS.find(x => x.name === q.q), m = /^(\w+) (\d{4})$/.exec(q.q) || [], yr = m[2];
  const span = (SEMESTERS ? {Summer: ["05-21", "08-19"], Fall: ["08-20", "12-20"], Winter: ["12-21", "01-09"], Spring: ["01-10", "05-20"]}
    : {Summer: ["06-20", "09-15"], Fall: ["09-20", "12-15"], Winter: ["01-02", "03-22"], Spring: ["03-23", "06-16"]})[m[1]] || ["01-01", "12-31"];
  const s = t ? t.start : yr + "-" + span[0], e = t ? t.end : yr + "-" + span[1], now = today().getTime();
  return now > parseD(e).getTime() ? "taken" : now >= parseD(s).getTime() ? "now" : "planned";
}
const pcId = code => "pc-" + code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
function courseStatus(code){ const x = planCourses().find(x => x.c.code === code); return x ? quarterStatus(x.q) : (CREDIT.includes(code) ? "taken" : ""); }
/* The year the calendar is in right now: the first year with a quarter that is not over. */
const yearNow = () => { const i = LATER.years.findIndex(y => y.quarters.some(q => quarterStatus(q) !== "taken")); return i < 0 ? LATER.years.length - 1 : i; };
/* The joined Year 1 to 4 picker used on Academic plan and Study guides. "attr" is the data attribute its buttons carry. */
const yearBar = (attr, sel) => `<span class="yearbar">${LATER.years.map((y, i) => `<button data-${attr}="${i}" aria-pressed="${i === sel}"><span>Year</span><b>${i + 1}</b></button>`).join("")}</span>`;
const inPlan = code => planCourses().some(x => x.c.code === code);
/* A class code as a link to its entry on Academic plan, or plain text when it is not in the plan (AP credit, a prerequisite never taken). */
const planLink = code => inPlan(code) ? `<button class="ptext" data-pc="${esc(code)}">${esc(code)}</button>` : `<span class="ptext off">${esc(code)}${CREDIT.includes(code) ? " (AP)" : ""}</span>`;
/* ---------- graduation requirements ---------- */
/* Works out which classes (planned, or credited by AP) cover each major requirement. A class is counted once. */
function reqRows(){
  const mine = planCourses().map(x => x.c.code), pool = CREDIT.concat(mine), used = new Set(), has = c => pool.includes(c);
  /* an electives row may also count any class inside number ranges it lists: [department, first, last] */
  const elective = (r, c) => { const m = /^(.*?)\s*(\d+)/.exec(c); return !!m && (r.ranges || []).some(([d, lo, hi]) => d === m[1] && +m[2] >= lo && +m[2] <= hi); };
  return REQS.groups.map(g => ({name: g.name, rows: g.rows.map(r => {
    let got = [], miss = [], need = r.need, extra = 0;
    if (r.todo) return {r, got: [], miss: [], need: 0, extra: 0, state: "todo"};
    if (r.all){ need = r.all.length; got = r.all.filter(has); miss = r.all.filter(c => !has(c)); got.forEach(c => used.add(c)); }
    else if (r.areas){ got = Object.values(r.areas).map(list => mine.find(c => list.includes(c) && !used.has(c))).filter(Boolean).sort((x, y) => mine.indexOf(x) - mine.indexOf(y)).slice(0, need); got.forEach(c => used.add(c)); }
    else if (r.electives){ got = mine.filter(c => !used.has(c) && ((r.from || []).includes(c) || elective(r, c))); extra = Math.max(0, got.length - need); got = got.slice(0, need); got.forEach(c => used.add(c)); }
    else { got = pool.filter(c => r.from.includes(c) && !used.has(c)).slice(0, need); got.forEach(c => used.add(c)); }
    const done = got.filter(c => courseStatus(c) === "taken").length;
    return {r, got, miss, need, extra, state: got.length < need ? "short" : done >= need ? "done" : "track"};
  })}));
}
/* ---------- Overview ---------- */
/* One container: the four-year grid, and under it the big picture in a few paragraphs. Beside the title are the icons for
   the two overlays below (how the classes fit together, things to watch out for) and the progress bar that opens the requirements. */
const FIT_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.610a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.020.968a2.500 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.020a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.230 8.770c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.010a2.500 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.500 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.020Z"/></svg>`;
const WARN_ICON = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3.8 21.3 20H2.700z"/><path d="M12 10v4.600M12 17.400v.01"/></svg>`;
function rSchool(){
  const rq = reqRows(), slots = rq.flatMap(g => g.rows), nAll = slots.reduce((n, x) => n + x.need, 0), nTaken = slots.reduce((n, x) => n + x.got.filter(c => courseStatus(c) === "taken").length, 0), nNow = slots.reduce((n, x) => n + x.got.filter(c => courseStatus(c) === "now").length, 0);
  const seasons = SEMESTERS ? ["Fall", "Spring"] : ["Fall", "Winter", "Spring"], tile = (c, st) => `<button class="ptile st-${st}${c.value === "High" ? " hi" : ""}" data-pc="${esc(c.code)}"><span><b>${esc(c.code)}:</b> ${esc(c.title)}</span></button>`;
  const grid = LATER.years.map((yr, yi) => {
    const sum = yr.quarters.filter(q => !seasons.some(s => q.q.startsWith(s)));
    return sum.map(q => `<div class="pg-c wide"><b class="pg-s">${esc(q.q)}</b>${q.courses.map(c => tile(c, quarterStatus(q))).join("")}</div>`).join("") +
      `<button class="pg-y" data-year="${yi}"><em><b>${esc(yr.year.replace(/\s*\(.*/, ""))}</b><span>${esc((/\((.*)\)/.exec(yr.year) || [])[1] || "")} · ${yr.quarters.reduce((n, q) => n + qUnits(q), 0)} units</span></em></button>` +
      seasons.map(s => { const q = yr.quarters.find(q => q.q.startsWith(s)); return `<div class="pg-c${q && quarterStatus(q) === "now" ? " now" : ""}" data-s="${s}">${q ? q.courses.map(c => tile(c, quarterStatus(q))).join("") : ""}</div>`; }).join("");
  }).join("");
  $("#school").innerHTML = `
    <div class="chips todobar studybar"><h2>Overview</h2><span class="yearseg"><span class="tools"><button class="tool" id="fit-open" aria-label="How the classes fit together" title="How the classes fit together">${FIT_ICON}</button><button class="tool" id="watchouts-open" aria-label="Things to watch out for" title="Things to watch out for">${WARN_ICON}</button></span><button class="grad" id="reqs-open" title="Graduation requirements: ${nTaken} of ${nAll} required classes done, ${nNow} in progress" aria-label="Graduation requirements"><svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4L2.500 7.6 10 11.200l7.500-3.600z"/><path d="M5.600 9.300v3.600c0 1.1 2 2.1 4.4 2.100s4.400-1 4.4-2.100V9.300"/><path d="M17.500 7.600v4"/></svg><span class="gradbar"><i style="width:${(100 * nTaken / (nAll || 1)).toFixed(1)}%"></i><i class="cur" style="width:${(100 * nNow / (nAll || 1)).toFixed(1)}%"></i></span><b>${Math.round(100 * nTaken / (nAll || 1))}%</b></button>${skillTool("school")}</span></div>
    ${LATER.years.length ? `<div class="card schoolbox">
      <div class="pgrid" style="--cols:${seasons.length}"><div></div>${seasons.map(s => `<div class="pg-h">${s}</div>`).join("")}${grid}</div>
      ${LATER.summary.length ? `<div class="bp-intro"><h3>Big picture</h3><div class="bp-cols">${LATER.summary.map(t => `<p>${esc(t)}</p>`).join("")}</div></div>` : ""}
    </div>` : example("school")}
`;
}
/* ---------- how the classes fit together, and things to watch out for (overlays) ---------- */
/* Both use the requirements layout: a title row, then two columns of blocks. */
function rFit(){
  $("#fit").innerHTML = `<div class="mapbox rqbox fitbox" role="dialog" aria-modal="true" aria-label="How the classes fit together"><div class="maphead"><h2>How the classes fit together</h2><span class="rqsum">${LATER.threads.length} threads</span><button class="tool" id="fit-close" aria-label="Close">${X_ICON}</button></div>
    <div class="rqcols">${LATER.threads.map(t => `<div class="rqcol"><h3>${esc(t.name)}</h3><div class="bp-chain">${t.chain.map(planLink).join(`<i aria-hidden="true">→</i>`)}</div><p class="fit-about">${esc(t.about)}</p>
      <div class="rqrow"><div><b>What is good about it</b><span class="rqh">${esc(t.good)}</span></div></div><div class="rqrow"><div><b>What to watch</b><span class="rqh">${esc(t.watch)}</span></div></div></div>`).join("")}</div></div>`;
}
function rWatchouts(){
  const row = w => { const [a, b] = String(w.when).split(/,\s*/); return `<div class="rqrow"><div><b>${esc(w.t)}</b><span class="rqh">${esc(w.d)}</span></div><div class="rqs"><b>${esc(a)}</b><span>${esc(b || "")}</span></div></div>`; };
  const half = Math.ceil(LATER.watch.length / 2);
  $("#watchouts").innerHTML = `<div class="mapbox rqbox fitbox" role="dialog" aria-modal="true" aria-label="Things to watch out for"><div class="maphead"><h2>Things to watch out for</h2><span class="rqsum">${LATER.watch.length} in the plan, soonest first</span><button class="tool" id="watchouts-close" aria-label="Close">${X_ICON}</button></div>
    <div class="rqcols"><div class="rqcol">${LATER.watch.slice(0, half).map(row).join("")}</div><div class="rqcol">${LATER.watch.slice(half).map(row).join("")}</div></div></div>`;
}
/* ---------- course map (overlay) ---------- */
/* Course map: every class as a node, one column per quarter, with a curve from each class to the ones that build on it. */
function rMap(){
  const all = planCourses(), cols = LATER.years.flatMap((y, yi) => y.quarters.map(q => ({q, yi}))), by = {};
  const W = Math.max(920, Math.min(1400, window.innerWidth - 40)) - 50, colW = W / cols.length, NW = Math.min(72, colW - 26), NH = 28, RH = 124, TOP = 64, rows = Math.max(0, ...cols.map(c => c.q.courses.length)), H = TOP + rows * RH + 6, GAP = colW - NW;
  const short = code => code.replace("IN4MATX", "INF").replace("WRITING", "WR");
  cols.forEach((c, ci) => c.q.courses.forEach((k, i) => by[k.code] = {k, ci, row: i, st: quarterStatus(c.q)}));
  const edges = all.flatMap(x => (x.c.pre || []).filter(p => by[p]).map(p => [p, x.c.code]));
  /* Each class sits on a whole-numbered row, so the channels halfway between rows never hold a class.
     A few passes pull each column's classes toward the rows of the classes they connect to. */
  const snap = ci => { const ns = cols[ci].q.courses.map(k => by[k.code]).sort((a, b) => a.row - b.row); ns.forEach((n, i) => n.row = (rows - ns.length) / 2 + i); };
  const pass = dir => { for (let ci = dir > 0 ? 0 : cols.length - 1; ci >= 0 && ci < cols.length; ci += dir){ for (const k of cols[ci].q.courses){ const n = by[k.code], near = edges.filter(e => e[dir > 0 ? 1 : 0] === k.code).map(e => by[e[dir > 0 ? 0 : 1]].row); if (near.length) n.row = near.reduce((a, b) => a + b, 0) / near.length + n.row * 0.001; } snap(ci); } };
  pass(1); pass(-1); pass(1);
  /* the map fans out like a tree: classes sit close together at the root on the left and spread apart toward the right */
  const spread = ci => RH * (0.4 + 0.6 * ci / (cols.length - 1));
  const X = n => n.ci * colW + colW / 2, Y = n => TOP + rows * RH / 2 + (n.row - (rows - 1) / 2) * spread(n.ci);
  /* Every line is one ease-in, ease-out curve: it leaves its class level and arrives level. If the even version would pass
     over an unrelated class, the curve makes its rise earlier or later along the way, whichever clears first. */
  const f = v => v.toFixed(1);
  const blocked = (a, b, x, y) => { const ci = Math.floor(x / colW); return ci >= 0 && ci < cols.length && Math.abs(x - (ci * colW + colW / 2)) <= NW / 2 + 4 && cols[ci].q.courses.some(k => k.code !== a && k.code !== b && Math.abs(y - Y(by[k.code])) < NH / 2 + 5); };
  const hits = (a, b, x1, y1, x2, y2, d1, d2) => { for (let t = 0.02; t < 1; t += 0.02){ const u = 1 - t; if (blocked(a, b, u*u*u*x1 + 3*u*u*t*(x1 + d1) + 3*u*t*t*(x2 - d2) + t*t*t*x2, u*u*u*y1 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y2)) return true; } return false; };
  const shapes = [[.45, .45], [.6, .6], [.3, .7], [.7, .3], [.15, .85], [.85, .15], [.3, .3], [.05, .95], [.95, .05], [.8, .8]];
  const wires = edges.map(([a, b]) => {
    const A = by[a], B = by[b], x1 = X(A) + NW / 2, x2 = X(B) - NW / 2, y1 = Y(A), y2 = Y(B), w = x2 - x1;
    const [p, q] = (B.ci - A.ci < 2 ? null : shapes.find(([p, q]) => !hits(a, b, x1, y1, x2, y2, w * p, w * q))) || shapes[0];
    return `<path data-a="${esc(a)}" data-b="${esc(b)}" d="M${f(x1)} ${f(y1)}C${f(x1 + w * p)} ${f(y1)} ${f(x2 - w * q)} ${f(y2)} ${f(x2)} ${f(y2)}"/>`;
  }).join("");
  const nodes = Object.values(by).map(n => `<g class="mn st-${n.st}" data-n="${esc(n.k.code)}" data-pc="${esc(n.k.code)}" data-t="${esc(n.k.code + ": " + n.k.title)}" tabindex="0" role="button" aria-label="${esc(n.k.code + ": " + n.k.title)}"><rect x="${(X(n) - NW / 2).toFixed(1)}" y="${(Y(n) - NH / 2).toFixed(1)}" width="${NW}" height="${NH}" rx="${NH / 2}"/><text x="${X(n).toFixed(1)}" y="${(Y(n) + 4).toFixed(1)}" text-anchor="middle">${esc(short(n.k.code))}</text></g>`).join("");
  let head = "", ci = 0;
  LATER.years.forEach((y, yi) => { const n = y.quarters.length, x0 = ci * colW; head += `${yi ? `<line class="mdiv" x1="${x0}" y1="8" x2="${x0}" y2="${H - 6}"/>` : ""}<text class="my" x="${x0 + n * colW / 2}" y="20" text-anchor="middle">${esc(y.year.replace(/\s*\(.*/, ""))}</text>` + y.quarters.map((q, i) => `${quarterStatus(q) === "now" ? `<rect class="mnow" x="${x0 + i * colW + 3}" y="30" width="${colW - 6}" height="${H - 34}" rx="10"/>` : ""}<text class="mq" x="${x0 + i * colW + colW / 2}" y="44" text-anchor="middle">${esc(q.q.split(" ")[0])}</text>`).join(""); ci += n; });
  const cap = window.matchMedia && matchMedia("(hover: none)").matches ? "Swipe sideways to see all four years. Tap a class to open it." : "Hover a class to trace everything it builds on and everything it leads to. Click one to open it.";
  $("#map").innerHTML = `<div class="mapbox" role="dialog" aria-modal="true" aria-label="Course map"><div class="maphead"><h2>Course map</h2><button class="tool" id="map-close" aria-label="Close">${X_ICON}</button></div>
    <div class="mapcard"><svg class="cmap" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${head}<g class="mw" fill="none">${wires}</g>${nodes}</svg>
    <p class="mapcap" id="mapcap" data-d="${cap}">${cap}</p></div></div>`;
}
/* Light up a class, the chain of classes behind it and the chain ahead of it. */
/* ---------- overlays ---------- */
/* Graduation requirements overlay: one table of what the major needs and which classes cover it. */
function rReqs(){
  const word = {done: "Done", track: "On track", short: "Not in the plan", todo: "To do"}, link = planLink;
  const rq = reqRows(), slots = rq.flatMap(g => g.rows), nAll = slots.reduce((n, x) => n + x.need, 0), nTaken = slots.reduce((n, x) => n + x.got.filter(c => courseStatus(c) === "taken").length, 0);
  $("#reqs").innerHTML = `<div class="mapbox rqbox" role="dialog" aria-modal="true" aria-label="Graduation requirements"><div class="maphead"><h2>Graduation requirements</h2><span class="rqsum">${nTaken} of ${nAll} done</span><button class="tool" id="reqs-close" aria-label="Close">${X_ICON}</button></div>
    <div class="rqcols">${rq.map(g => `<div class="rqcol"><h3>${esc(g.name)}</h3>${g.rows.map(x => `<div class="rqrow rq-${x.state}"><div><b>${esc(x.r.name)}</b>${x.r.hint ? `<span class="rqh">${esc(x.r.hint)}</span>` : ""}<div class="rqc">${x.got.map(link).join("")}${x.miss.map(c => `<span class="ptext off miss">${esc(c)}</span>`).join("")}${x.extra ? `<span class="rqx">and ${x.extra} more in the plan</span>` : ""}</div></div><div class="rqs"><b>${word[x.state]}</b><span>${x.r.todo ? esc(x.r.todo) : x.got.length + " of " + x.need}</span></div></div>`).join("")}</div>`).join("")}</div>
    <p class="rqnote">${SCHOOL.major ? `<b>${esc([SCHOOL.degree, SCHOOL.major].filter(Boolean).join(" ") + (SCHOOL.name ? ", " + SCHOOL.name : ""))}.</b> ` : ""}${esc(REQS.note)}</p></div>`;
}
/* The four School overlays. Their buttons are named map-open, reqs-close and so on, which is all overlay() in js/app.js needs. */
Object.assign(OVERLAYS, {map: rMap, reqs: rReqs, fit: rFit, watchouts: rWatchouts});
let mapT = 0;
window.addEventListener("resize", () => { clearTimeout(mapT); mapT = setTimeout(() => { if (!$("#map").hidden) rMap(); }, 200); });
function mapTrace(code){
  const svg = $("#map .cmap"), cap = $("#mapcap"); if (!svg) return;
  svg.querySelectorAll(".on").forEach(el => el.classList.remove("on"));
  svg.classList.toggle("hl", !!code);
  cap.classList.toggle("on", !!code);
  if (!code){ cap.textContent = cap.dataset.d; return; }
  const ps = [...svg.querySelectorAll(".mw path")], seen = new Set([code]);
  const walk = (from, to) => { const todo = [code]; while (todo.length){ const c = todo.pop(); for (const p of ps) if (p.dataset[to] === c){ p.classList.add("on"); if (!seen.has(p.dataset[from])){ seen.add(p.dataset[from]); todo.push(p.dataset[from]); } } } };
  walk("a", "b"); walk("b", "a");
  svg.querySelectorAll(".mn").forEach(g => { if (seen.has(g.dataset.n)) g.classList.add("on"); if (g.dataset.n === code){ g.classList.add("me"); cap.textContent = g.dataset.t; } else g.classList.remove("me"); });
}
document.addEventListener("mouseover", e => { if (!e.target.closest || !e.target.closest("#map")) return; const g = e.target.closest(".mn"); mapTrace(g ? g.dataset.n : ""); });
document.addEventListener("focusin", e => { const g = e.target.closest && e.target.closest("#map .mn"); if (g) mapTrace(g.dataset.n); });
document.addEventListener("keydown", e => { const g = e.target.closest && e.target.closest("#map .mn"); if (g && (e.key === "Enter" || e.key === " ")){ e.preventDefault(); g.dispatchEvent(new MouseEvent("click", {bubbles: true})); } });
/* ---------- Academic plan ---------- */
/* One year at a time: a container per quarter, a block per class. The section id is still "later" from when this page only covered Years 3 and 4. */
function rLater(){
  if (!LATER.years.length){ $("#later").innerHTML = `<div class="chips todobar studybar"><h2>Academic plan</h2><span class="yearseg">${skillTool("later")}</span></div>${example("later")}`; return; }
  if (planYear === null) planYear = yearNow();
  const all = planCourses(), y = LATER.years[planYear], link = planLink;
  /* The connections popover: what a class builds on, the class, and what it leads to, joined by curves. */
  const tree = (c, next) => {
    const pre = c.pre || [], R = 28, H = Math.max(pre.length, next.length, 1) * R, G = 46;
    if (!pre.length && !next.length) return "";
    const ys = n => Array.from({length: n}, (_, i) => (H - n * R) / 2 + i * R + R / 2);
    const wires = (list, flip) => `<svg width="${G}" height="${H}" viewBox="0 0 ${G} ${H}" fill="none" stroke="currentColor" stroke-width="1.3">${ys(list.length).map(y => flip ? `<path d="M0 ${H / 2}C${G / 2} ${H / 2} ${G / 2} ${y} ${G} ${y}"/>` : `<path d="M0 ${y}C${G / 2} ${y} ${G / 2} ${H / 2} ${G} ${H / 2}"/>`).join("")}</svg>`;
    const col = (list, side) => `<span class="pt-col ${side}">${list.map(code => inPlan(code) ? `<button data-pc="${esc(code)}">${esc(code)}</button>` : `<i>${esc(code)}</i>`).join("")}</span>`;
    return `<span class="pconn"><button class="tool picon" aria-label="How ${esc(c.code)} connects" aria-haspopup="true"><svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="4.5" cy="10" r="2"/><circle cx="15.5" cy="4.5" r="2"/><circle cx="15.5" cy="15.5" r="2"/><path d="M6.5 10c4 0 3-5.5 7-5.5M6.5 10c4 0 3 5.5 7 5.5"/></svg></button>
      <span class="ptree" role="group" aria-label="Connections"><span class="pt-heads"><em>${pre.length ? "Builds on" : ""}</em><em>${next.length ? "Leads to" : ""}</em></span><span class="pt-body">${pre.length ? col(pre, "l") + wires(pre, false) : ""}<b>${esc(c.code)}</b>${next.length ? wires(next, true) + col(next, "r") : ""}</span></span></span>`;
  };
  const card = (c, st) => {
    const next = all.filter(x => (x.c.pre || []).includes(c.code)).map(x => x.c.code), guides = STUDY.filter(g => g.cls === c.code).length;
    return `<div class="card pcard" id="${pcId(c.code)}">
      <div class="phead"><div><span class="pcode">${esc(c.code)}</span><h3>${esc(c.title)}</h3></div><span class="ptags">${tree(c, next)}${guides ? `<button class="tool picon" data-sg="${esc(c.code)}" aria-label="${guides} study guide${guides === 1 ? "" : "s"}" title="${guides} study guide${guides === 1 ? "" : "s"}"><svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.2l7 3.5-7 3.5-7-3.5z"/><path d="M3 10.2l7 3.5 7-3.5"/><path d="M3 13.6l7 3.5 7-3.5"/></svg></button>` : ""}<span class="chip${c.value === "High" ? " pink" : ""}">Resume value: ${esc(c.value)}</span></span></div>
      ${c.desc ? `<p class="pdesc">${c.desc}</p>` : ""}
      <div class="pcols"><div><h4>What gets built</h4><p>${c.project}</p></div>${c.learn ? `<div><h4>What it teaches</h4><p>${c.learn}</p></div>` : ""}</div>
      ${c.note ? `<p class="pnote">${c.note}</p>` : ""}
    </div>`;
  };
  $("#later").innerHTML = `
    <div class="chips todobar studybar"><h2>Academic plan</h2><span class="yearseg"><button class="tool" id="map-open" aria-label="Course map" title="Course map: how every class connects"><svg viewBox="0 0 20 20" width="21" height="21" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 18v-7"/><path d="M10 13.5c-3.2 0-5-1.6-5-4"/><path d="M10 11c3.2 0 5-1.6 5-4.2"/><circle cx="10" cy="4" r="1.9"/><circle cx="5" cy="7.6" r="1.9"/><circle cx="15" cy="5" r="1.9"/><path d="M10 11V6"/></svg></button>${yearBar("year", planYear)}${skillTool("later")}</span></div>
    ${y.quarters.map(q => { const st = quarterStatus(q); const term = TERMS.find(t => t.name === q.q);
      return `<div class="bucket"><h3>${esc(q.q)}</h3><span class="small muted">${qUnits(q)} units</span>${term ? `<button class="tool qcal" data-qweek="${term.start}" aria-label="Weekly schedule for ${esc(q.q)}" title="Weekly class schedule"><svg viewBox="0 0 20 20" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8.500h14M7 2.800v3M13 2.800v3"/></svg></button>` : ""}</div><div class="tgroup pgroup">${q.courses.map(c => card(c, st)).join("")}</div>`; }).join("")}
    <footer>${LATER.sources}</footer>`;
}
/* ---------- Study guides ---------- */
/* Same shape as Academic plan: a container per quarter, a header per class, that class's guides listed inside. */
function rStudy(){
  const link = (g, f, u) => g[u] ? g[u] : (g[f] ? (location.protocol === "file:" ? SITE : "") + g[f] : "");
  /* a guide belongs to the quarter its class is taken in; one for a class outside the plan goes to the quarter it was made in */
  const all = planCourses(), where = g => { const x = all.find(x => x.c.code === g.cls); if (x) return x.q.q; const t = TERMS.find(t => g.made <= t.end); return t ? t.name : ""; };
  if (!LATER.years.length){ $("#study").innerHTML = `<div class="chips todobar studybar"><h2>Study guides</h2><span class="yearseg">${skillTool("study")}</span></div>${example("study")}`; return; }
  if (studyYear === null) studyYear = yearNow();
  const y = LATER.years[studyYear];
  const item = g => {
    const a = link(g, "file", "url"), sh = link(g, "sheetFile", "sheet");
    return `<li><span class="sg-t">${a ? `<a href="${esc(a)}" target="_blank" rel="noopener">${esc(g.title)}</a>` : esc(g.title)}${sh ? `<a class="sg-sheet" href="${esc(sh)}" target="_blank" rel="noopener" aria-label="Cheat sheet" title="Cheat sheet"><svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2.8h6.5L15 6.3v10.900H5z"/><path d="M11.5 2.8v3.500H15"/><path d="M7.600 10h4.800M7.600 13h4.800"/></svg></a>` : ""}</span><i class="sg-l"></i><span class="sg-d">${esc(fmt(parseD(g.made)))}</span></li>`;
  };
  /* one block per class, headed like Academic plan, with that class's guides listed inside */
  const block = (code, title, xs) => `<div class="card pcard sgcard" id="sg-${pcId(code)}"><div class="phead"><div><span class="pcode">${esc(code)}</span><h3>${esc(title)}</h3></div></div>${xs.length ? `<ul class="sglist">${xs.sort((a, b) => b.made.localeCompare(a.made)).map(item).join("")}</ul>` : `<p class="sgnone">No study guides yet.</p>`}</div>`;
  $("#study").innerHTML = `<div class="chips todobar studybar"><h2>Study guides</h2><span class="yearseg">${yearBar("syear", studyYear)}${skillTool("study")}</span></div>` +
    y.quarters.map(q => {
      const xs = STUDY.filter(g => where(g) === q.q), extra = [...new Set(xs.map(g => g.cls))].filter(c => !q.courses.some(k => k.code === c));
      return `<div class="bucket"><h3>${esc(q.q)}</h3><span class="small muted">${xs.length}</span></div><div class="tgroup pgroup">${q.courses.map(k => block(k.code, k.title, xs.filter(g => g.cls === k.code))).join("")}${extra.map(c => block(c, "Other", xs.filter(g => g.cls === c))).join("")}</div>`;
    }).join("");
}
/* What someone who is not signed in sees: progress and what is being worked on, not the full list. */

/* Clicks on the School pages. */
document.addEventListener("click", e => {
  const t = e.target.closest("button, .mn"); if (!t) return;
  if (t.dataset.year){ planYear = Number(t.dataset.year); rLater(); if (t.classList.contains("pg-y")){ location.hash = "later"; setTimeout(() => window.scrollTo(0, 0), 30); } return; }
  if (t.dataset.syear){ studyYear = Number(t.dataset.syear); rStudy(); return; }
  /* a class anywhere (grid, map, requirements, a connections popover): open it on Academic plan */
  if (t.dataset.pc){
    const x = planCourses().find(x => x.c.code === t.dataset.pc); if (!x) return;
    closeOverlays();
    planYear = x.yi; rLater();
    const go = () => jumpTo(document.getElementById(pcId(x.c.code)));
    if (location.hash.slice(1) === "later") go(); else { location.hash = "later"; setTimeout(go, 40); }
    return;
  }
  /* the stack icon on a class: its study guides */
  if (t.dataset.sg){
    const x = planCourses().find(x => x.c.code === t.dataset.sg); if (x) studyYear = x.yi;
    location.hash = "study"; rStudy();
    setTimeout(() => jumpTo(document.getElementById("sg-" + pcId(t.dataset.sg))), 40);
  }
});
