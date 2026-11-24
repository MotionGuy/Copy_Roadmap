/* The Home page. In this order:
     pixel art          the skier and the pines, as rows of characters
     greeting           the hello that follows the clock
     the year trail     the school year as a snowy hill, with the skier on today (a plain timeline outside winter)
     sliding the hill   dragging other days under the skier
     this month         the current month of the plan
     small pictures     To-Do, Applications, School and Projects at a glance
   rPlan in app.js puts the pieces together. Loaded after school.js and uses helpers from app.js. */

/* ---------- pixel art ---------- */
/* Each sprite is rows of characters, one square per character, drawn as SVG rects. "." is empty. */
const HOME_INK = {B: "var(--hp-body)", W: "var(--hp-belly)", O: "var(--accent)", G: "var(--hp-pine)", D: "var(--hp-pine-d)", S: "var(--hp-snow)", T: "var(--hp-trunk)", R: "#e5484d", P: "var(--muted)"};
/* the penguin is on skis: one long ski under its feet and a pole in front */
const PENGUIN = [".BBBB....", "BBWBWOO.P", "BWWWWB..P", "BWWWWBPPP", "BWWWWB..P", ".BBBB...P", ".O..O...P", "RRRRRRRR."];
const PINE = ["...S...", "..SGS..", "..GGG..", ".SGGGS.", ".GGDGG.", "SGGGGGS", "GGDGGDG", "...T...", "...T..."];
function sprite(rows, x, y, u){
  let h = "";
  rows.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] !== ".") h += `<rect x="${(x + c * u).toFixed(1)}" y="${(y + r * u).toFixed(1)}" width="${u + .4}" height="${u + .4}" fill="${HOME_INK[row[c]]}"/>`; });
  return h;
}

/* ---------- greeting ---------- */
let homeInked = false, homeT0 = 0; /* the greeting animates in once per visit; a redraw during it carries on from where it was */
/* Late at night there is no "good night": a hello from another language is picked instead, once per visit. */
const HELLOS = ["Hola", "Bonjour", "Ciao", "Hallo", "Aloha", "Hej", "Salut", "Konnichiwa", "Annyeong", "Namaste", "Merhaba", "Shalom", "Ahoj", "Kia ora", "Sawubona", "Jambo"];
const homeLate = HELLOS[Math.floor(Math.random() * HELLOS.length)];
/* Font Awesome Free icons for the links under the name: [font, character]. "b" is the brands font and "s" the solid one.
   Only these five characters are kept in fonts/fa-*-subset.woff2, so a new icon means remaking those files (see the README). */
const SOCIAL_ICONS = {linkedin: ["b", "\uf08c"], github: ["b", "\uf09b"], drive: ["b", "\uf3aa"], handshake: ["s", "\uf2b5"], site: ["s", "\uf0ac"]};
function homeHello(){ const h = new Date().getHours(); return h >= 5 && h < 12 ? "Good morning" : h >= 12 && h < 17 ? "Good afternoon" : h >= 17 && h < 22 ? "Good evening" : homeLate; }

/* ---------- the year trail ---------- */
/* The school year is a long snowy hill, wider than the card: about four months show at a time. The skier never moves
   sideways. It stands at one spot (TRAIL_PX) and the hill slides under it, so it only goes up and down. At rest the day
   under the skier is today, and letting go of the hill sends it back there; dragging the hill left or right (or the arrow keys) brings other days under it, with a small
   card showing the date and what is due. Flags pull the hill in when they get close. */
const TRAIL_W = 1000, TRAIL_H = 236, TRAIL_WW = 2700, TRAIL_PAD = 60, TRAIL_PX = 250, TRAIL_FLAT = 150;
let homeGeo = null, homeCur = null, scrub = null, trailIdle = 0;
/* The penguins and the ski hill belong to the winter scene. With the scene off, or in another season, Home shows the same
   trail as a plain timeline: a straight line with a dot on today. It slides, snaps to flags and shows the day's card just the same. */
const homeSnowy = () => !!window.scene && scene.snowy();
function trailY(x){ return homeSnowy() ? 138 + 13 * Math.sin(x / 1000 * Math.PI * 3.2) - 7 * Math.sin(x / 1000 * Math.PI * 7.5) : TRAIL_FLAT; }
/* the skier's place for the world point x under it, leaning with the slope */
function trailAt(x){ const a = Math.atan2(trailY(x + 5) - trailY(x - 5), 10) * 180 / Math.PI; return `translate(${TRAIL_PX},${trailY(x).toFixed(1)}) rotate(${a.toFixed(1)})`; }
function trailDate(x){ const g = homeGeo; return new Date(g.from + g.span * (x - TRAIL_PAD) / (TRAIL_WW - 2 * TRAIL_PAD)); }
const trailClamp = x => Math.max(TRAIL_PAD, Math.min(TRAIL_WW - TRAIL_PAD, x));

function homeTrail(){
  const t = today(), y0 = t.getMonth() >= 8 ? t.getFullYear() : t.getFullYear() - 1, from = new Date(y0, 8, 1), to = new Date(y0 + 1, 6, 1);
  const W = TRAIL_W, H = TRAIL_H, WW = TRAIL_WW, span = to - from, Y = trailY, snowy = homeSnowy();
  const X = d => TRAIL_PAD + (WW - 2 * TRAIL_PAD) * Math.max(0, Math.min(1, (d - from) / span));
  const pts = (a, b) => { let p = ""; for (let x = a; x <= b; x += 6) p += (p ? "L" : "M") + x.toFixed(1) + "," + Y(x).toFixed(1); return p + "L" + b.toFixed(1) + "," + Y(b).toFixed(1); };
  const nowX = X(new Date()); /* the time of day counts too, so the hill creeps along during the day */
  const cur = trailClamp(homeCur === null ? nowX : homeCur);
  /* months along the bottom */
  let months = "";
  for (let m = new Date(from); m < to; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)){
    const x = X(m), isNow = m.getMonth() === t.getMonth() && m.getFullYear() === t.getFullYear();
    months += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${H - 24}" y2="${H - 19}" class="ht-tick"/><text x="${(x + 5).toFixed(1)}" y="${H - 9}" class="ht-mon${isNow ? " cur" : ""}">${m.toLocaleDateString("en-US", {month: "short"})}</text>`;
  }
  /* flags: quarter starts, finals weeks and application deadlines still ahead */
  const marks = [];
  for (const q of TERMS){
    const s = parseD(q.start), f = parseD(q.lastClass || q.end);
    if (s > from && s < to) marks.push({d: s, t: q.name.split(" ")[0] + " starts", k: "term"});
    if (f > from && f < to) marks.push({d: addDays(f, 1), t: q.name.split(" ")[0] + " finals", k: "term"});
  }
  for (const a of APPS.concat(appsAdded())) if (appStage(a) === "To start" && a.due && parseD(a.due) >= t && parseD(a.due) < to) marks.push({d: parseD(a.due), t: String(a.org).replace(/\s*\(.*/, "").split(" ").reduce((o, w) => !o ? w : (o + " " + w).length <= 14 ? o + " " + w : o, ""), k: "app"});
  marks.sort((a, b) => a.d - b.d);
  homeGeo = {from: from.getTime(), span, nowX, marks: marks.map(m => ({x: X(m.d), iso: isoOf(m.d), t: m.t}))};
  /* pennants in mixed colors, like gate flags down a ski run */
  const PENNANT = ["#e5484d", "#3b82f6", "#2fa66a", "#f08c2e", "#8b5cf6", "#e64ca0"]; let pn = 0;
  const rowEnd = [-1e9, -1e9, -1e9]; let flags = "";
  for (const m of marks){
    const x = X(m.d), w = m.t.length * 6.3 + 16, past = m.d < t;
    let row = rowEnd.findIndex(e => x - 4 > e); if (row < 0) continue;
    rowEnd[row] = x + w;
    const top = 30 + row * 21, py = Y(x);
    flags += `<g class="ht-flag ${m.k}${past ? " past" : ""}"><title>${esc(m.t + ", " + fmt(m.d))}</title><line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${top - 9}" y2="${py.toFixed(1)}"/>${snowy ? `<path d="M${x.toFixed(1)},${top - 11}l12,4.5 -12,4.5z" fill="${PENNANT[pn++ % PENNANT.length]}"/>` : `<circle cx="${x.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" class="ht-stop"/>`}<text x="${(x + (snowy ? 15 : 6)).toFixed(1)}" y="${top - 2}">${esc(m.t)}</text></g>`;
  }
  /* pines scattered along the whole hill, at fixed spots so they do not jump between draws */
  let trees = "";
  if (snowy) for (let x = -420, i = 0; x < WW + 420; x += 95 + (i * 53) % 110, i++){ const u = i % 3 === 1 ? 2.6 : 3.6; trees += sprite(PINE, x - 3.5 * u, Y(x) - 9 * u + 4, u); }
  /* a far ridge that slides more slowly than the hill, and snowflakes that stay put until the hill is dragged */
  const Y2 = x => 96 + 16 * Math.sin(x / 1000 * Math.PI * 2.1 + 1) + 8 * Math.sin(x / 1000 * Math.PI * 5.3);
  let ridge = ""; for (let x = -600; x <= WW + 600; x += 10) ridge += (ridge ? "L" : "M") + x + "," + Y2(x).toFixed(1); ridge += `L${WW + 600},${H}L-600,${H}Z`;
  const flakes = !snowy ? "" : [[60, 40], [150, 78], [300, 30], [352, 66], [640, 44], [700, 84], [850, 36], [905, 70], [960, 52], [520, 22], [210, 18], [430, 58], [575, 90], [770, 20], [120, 104], [470, 104], [815, 96], [30, 70]].map(([x, y], i) => `<text x="${x}" y="${y}" data-x="${x}" data-y="${y}" data-v="${(.55 + (i * 7 % 5) * .15).toFixed(2)}" class="ht-flake">${i % 3 ? "*" : "."}</text>`).join("");
  const hill = pts(-520, WW + 520) + `L${WW + 520},${H}L-520,${H}Z`;
  const term = TERMS.find(q => q.start <= isoOf(t) && isoOf(t) <= q.end), wk = term ? Math.floor(daysBetween(parseD(term.start), t) / 7) + 1 : 0;
  const hello = homeHello(), who = viewOnly() ? "Visitor" : String(ME); /* someone who is not signed in is greeted as a visitor */
  const where = term ? `${esc(term.name)} · week ${wk}` : TERMS.length ? `Between ${TERM_WORD}s` : "";
  const socials = SOCIALS.filter(([k, , url]) => url && (k !== "drive" || !viewOnly())).map(([k, name, url], n) => `<a href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(name)}" title="${esc(name)}"><i class="fa-${(SOCIAL_ICONS[k] || SOCIAL_ICONS.site)[0]}" style="--i:${hello.length + who.length + 3 + n * 2}" aria-hidden="true">${(SOCIAL_ICONS[k] || SOCIAL_ICONS.site)[1]}</i></a>`).join("");
  return `<div class="hometrail">
    <div class="ht-head"><span class="pcode">${where}</span><h1 class="${homeWriting() ? "write" : ""}" style="--e:${homeT0 ? Date.now() - homeT0 : 0}ms;--n:${Math.max((hello + ",").length, who.length)}"><span data-t="${esc(hello)}">${letters(hello, 0)}${who ? `<i style="--i:${hello.length}">,</i>` : ""}</span><span data-t="${esc(who)}">${letters(who, hello.length + 2)}</span></h1>${socials ? `<p class="ht-socials${homeWriting() ? " write" : ""}" style="--e:${homeT0 ? Date.now() - homeT0 : 0}ms">${socials}</p>` : ""}</div>
    <div class="ht-scroll"><svg class="ht-svg${snowy ? "" : " plain"}" viewBox="0 0 ${W} ${H}" role="slider" tabindex="0" aria-label="${snowy ? "The school year as a snowy hill. Drag it, or use the arrow keys, to bring other days under the skier." : "The school year as a timeline. Drag it, or use the arrow keys, to look at other days."}" aria-valuetext="Today">
      ${!snowy ? `<g class="ht-far"></g>
      <g class="ht-world" transform="translate(${(TRAIL_PX - cur).toFixed(1)},0)">
        <path d="M${TRAIL_PAD},${TRAIL_FLAT}H${WW - TRAIL_PAD}" class="ht-line"/>
        <path d="M${TRAIL_PAD},${TRAIL_FLAT}H${Math.max(TRAIL_PAD + 1, nowX).toFixed(1)}" class="ht-line done"/>
        ${flags}
        ${months}
      </g>
      <g class="ht-pos" transform="${trailAt(cur)}"><circle r="12" class="ht-halo"/><circle r="6.5" class="ht-dot"/></g>` : `<defs><linearGradient id="ht-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ht-sky2)" stop-opacity="0"/><stop offset=".55" stop-color="var(--ht-sky1)" stop-opacity=".9"/><stop offset="1" stop-color="var(--ht-sky1)"/></linearGradient>
        <linearGradient id="ht-ridge" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--ht-ridge)" stop-opacity=".25"/><stop offset=".5" stop-color="var(--ht-ridge)"/></linearGradient></defs>
      <rect x="0" y="0" width="${W}" height="${H}" fill="url(#ht-fade)"/>
      <g class="ht-far" transform="translate(${(-(cur - TRAIL_PX) * .35).toFixed(1)},0)"><path d="${ridge}" fill="url(#ht-ridge)"/></g>
      ${flakes}
      <g class="ht-world" transform="translate(${(TRAIL_PX - cur).toFixed(1)},0)">
        <path d="${hill}" class="ht-hill"/>
        <path d="${pts(TRAIL_PAD, WW - TRAIL_PAD)}" class="ht-path"/>
        <path d="${pts(TRAIL_PAD, Math.max(TRAIL_PAD + 1, nowX))}" class="ht-walked"/>
        ${trees}
        ${flags}
        ${months}
      </g>
      <g class="ht-pos" transform="${trailAt(cur)}">
        ${[...Array(7)].map((_, k) => `<rect class="ht-spray" x="${-16 - (k % 3) * 3}" y="${-3 - (k % 2) * 3}" width="${k % 3 ? 3 : 4}" height="${k % 3 ? 3 : 4}" style="--dx:${-26 - (k * 7) % 22}px;--up:${-9 - (k * 5) % 12}px;animation-delay:${(-k * .17).toFixed(2)}s"/>`).join("")}
        <g class="ht-ski"><g>${sprite(PENGUIN, -14, -30, 4)}</g></g>
      </g>`}
    </svg></div><div class="ht-tip" hidden></div>
  </div>`;
}

/* ---------- sliding the hill ---------- */
/* Put the world point x under the skier: slide the hill and the far ridge, set the skier's height and lean, turn the
   snowfall's pages, and (with tip on) show the card for that day. */
function trailSet(x, tip){
  const g = homeGeo, world = $(".ht-world"), pos = $(".ht-pos"), box = $(".ht-tip"), svg = $(".ht-svg"); if (!g || !world) return;
  x = trailClamp(x); const was = homeCur === null ? g.nowX : homeCur;
  homeCur = Math.abs(x - g.nowX) < .05 ? null : x;
  world.setAttribute("transform", `translate(${(TRAIL_PX - x).toFixed(1)},0)`);
  $(".ht-far").setAttribute("transform", `translate(${(-(x - TRAIL_PX) * .35).toFixed(1)},0)`);
  pos.setAttribute("transform", trailAt(x));
  trailSnow(Math.abs(x - was));
  if (x < was - .3) pos.classList.add("back"); else if (x > was + .3) pos.classList.remove("back");
  if (!tip){ box.hidden = true; svg.setAttribute("aria-valuetext", "Today"); return; }
  const d = trailDate(x), day = new Date(d.getFullYear(), d.getMonth(), d.getDate()), iso = isoOf(day), n = daysBetween(today(), day);
  const flagged = g.marks.filter(m => m.iso === iso).map(m => m.t), things = flagged.concat(viewOnly() ? [] : openItems().filter(i => i.due === iso).map(i => (i.cls ? i.cls + " " : "") + i.t).filter(q => !flagged.some(f => q.startsWith("Apply: " + f)))); /* task names are only for the owner */
  const when = n === 0 ? "today" : n === 1 ? "tomorrow" : n === -1 ? "yesterday" : n > 0 ? "in " + n + " days" : -n + " days ago";
  box.innerHTML = `<b>${day.toLocaleDateString("en-US", {weekday: "short", month: "short", day: "numeric"})}</b><i>${when}</i>${things.length ? `<ul>${things.slice(0, 4).map(q => `<li>${esc(q)}</li>`).join("")}${things.length > 4 ? `<li class="more">and ${things.length - 4} more</li>` : ""}</ul>` : `<span>Nothing due</span>`}`;
  box.hidden = false;
  const sc = $(".ht-scroll"), k = svg.getBoundingClientRect().width / TRAIL_W, half = box.offsetWidth / 2 + 6;
  box.style.left = Math.max(half, sc.clientWidth * TRAIL_PX / TRAIL_W) + sc.offsetLeft + "px"; box.style.top = sc.offsetTop + (trailY(x) - 40) * k + "px";
  svg.setAttribute("aria-valuetext", box.textContent);
}
/* Dragging also turns the pages of the snowfall, like a flipbook: every few units of travel the flakes drop one step and
   drift a little, and a flake that reaches the hill starts again at the top. Travel in either direction counts the same,
   so sliding back into the past never lifts the snow. */
let snowGone = 0;
function trailSnow(dist){
  const before = Math.floor(snowGone / 3); snowGone += dist; const frame = Math.floor(snowGone / 3);
  if (frame === before) return;
  document.querySelectorAll(".ht-flake").forEach((f, i) => {
    const x0 = Number(f.dataset.x), y0 = Number(f.dataset.y), v = Number(f.dataset.v), fall = frame * 4 * v;
    const x = ((x0 + Math.round(Math.sin(frame * .35 + i) * 5) + frame * .6) % TRAIL_W + TRAIL_W) % TRAIL_W;
    f.setAttribute("x", x.toFixed(0)); f.setAttribute("y", (8 + (y0 - 8 + fall) % 112).toFixed(0));
  });
}
/* glide the hill back until today is under the skier */
function trailHome(){
  if (!homeGeo || homeCur === null){ scrub = null; const p = $(".ht-pos"); if (p) p.classList.remove("back"); return; }
  const from = homeCur, to = homeGeo.nowX, t0 = performance.now(), ms = Math.min(1100, 300 + Math.abs(to - from) * 1.2); scrub = {home: true};
  const step = now => { if (!scrub || !scrub.home) return; const k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 3); trailSet(from + (to - from) * e, false); if (k < 1) requestAnimationFrame(step); else { scrub = null; const p = $(".ht-pos"); if (p) p.classList.remove("back"); } };
  requestAnimationFrame(step);
}
/* after the arrow keys, the hill slides home by itself a moment later */
function trailRest(){ clearTimeout(trailIdle); trailIdle = setTimeout(() => { if (!scrub) trailHome(); }, 2500); }
document.addEventListener("pointerdown", e => {
  const svg = e.target.closest && e.target.closest(".ht-svg"); if (!svg || !homeGeo || e.button > 0) return;
  clearTimeout(trailIdle);
  scrub = {down: true, x0: e.clientX, cur0: homeCur === null ? homeGeo.nowX : homeCur, k: TRAIL_W / svg.getBoundingClientRect().width};
  document.documentElement.classList.add("scrubbing");
  try { svg.setPointerCapture(e.pointerId); } catch (_){}
  trailSet(scrub.cur0, true); e.preventDefault();
});
document.addEventListener("pointermove", e => {
  if (!scrub || !scrub.down) return;
  /* the hill follows the pointer, so pulling it left brings later days under the skier */
  let x = scrub.cur0 - (e.clientX - scrub.x0) * scrub.k;
  const near = homeGeo.marks.concat([{x: homeGeo.nowX}]).find(m => Math.abs(m.x - x) < 5); if (near) x = near.x;
  trailSet(x, true);
});
const trailDrop = () => { if (!scrub || !scrub.down) return; scrub = null; document.documentElement.classList.remove("scrubbing"); $(".ht-tip").hidden = true; trailHome(); }; /* letting go sends the hill straight back to today */
document.addEventListener("pointerup", trailDrop);
document.addEventListener("pointercancel", trailDrop);
document.addEventListener("keydown", e => {
  if (!e.target.classList || !e.target.classList.contains("ht-svg") || !homeGeo) return;
  if (e.key === "Home" || e.key === "Escape"){ clearTimeout(trailIdle); trailHome(); return; }
  const step = {ArrowLeft: -1, ArrowRight: 1, PageDown: -7, PageUp: 7}[e.key]; if (!step) return;
  e.preventDefault(); scrub = null;
  trailSet((homeCur === null ? homeGeo.nowX : homeCur) + step * (TRAIL_WW - 2 * TRAIL_PAD) / (homeGeo.span / 86400000), true); trailRest();
});
/* on a page left open the hill keeps up with the clock: redraw Home now and then, unless it is being looked through */
setInterval(() => { if (!scrub && homeCur === null && document.querySelector("#plan.on") && typeof rPlan === "function") rPlan(); }, 20 * 60000);

/* One container holds the greeting and the trail. */
const homeTop = () => `<div class="homewrap${homeWriting() ? " enter" : ""}" style="--e:${homeT0 ? Date.now() - homeT0 : 0}ms"><div class="card homebox">${homeTrail()}</div></div>`;
/* On a narrow screen the trail keeps its size and scrolls sideways; start it with the penguin in view. */
/* On the first draw each letter of the greeting slides up into place, one after another. Once they have landed the line goes
   back to plain text, so the font's own letter spacing applies again. */
const homeWriting = () => !homeT0 || Date.now() - homeT0 < 1700;
const letters = (t, from) => !homeWriting() ? esc(t) : [...t].map((c, k) => `<em style="--i:${from + k}">${c === " " ? "&nbsp;" : esc(c)}</em>`).join("");
function homeSettle(){ const h = $(".ht-head h1.write"); if (!h) return; h.querySelectorAll("span[data-t]").forEach(sp => { const i = sp.querySelector("i"); sp.textContent = sp.dataset.t; if (i) sp.appendChild(i); }); h.classList.remove("write"); }
function homeAim(){ if (!homeT0){ homeT0 = Date.now(); setTimeout(homeSettle, 1750); } homeInked = true; }

/* ---------- this month ---------- */
/* The current month of the plan, always: its focus, and one line per week still ahead. No switching between months. */
function homeMonth(){
  const cw = currentWeek(), cwT = parseD(cw.start).getTime(), m = MONTHS.find(x => cw.start.startsWith(x.key)) || MONTHS.find(x => WEEKS.some(w => w.start.startsWith(x.key) && parseD(w.start).getTime() >= cwT));
  if (!m) return "";
  const weeks = WEEKS.filter(w => w.start.startsWith(m.key) && parseD(w.start).getTime() >= cwT);
  return `<div class="hm"><div class="hm-top"><span class="pcode">${esc(m.name)}</span><h2>${esc(m.focus)}</h2><p>${esc(m.theme)}</p></div>
    <ol class="hm-weeks">${weeks.map(w => `<li class="${w.id === cw.id ? "now" : ""}"><time>${weekRange(w)}</time><span>${esc(w.goal)}</span>${w.id === cw.id ? `<em>this week</em>` : ""}</li>`).join("")}</ol></div>`;
}

/* ---------- a small picture of each page ---------- */
function homeViz(){
  const t = today(), items = openItems();
  /* To-Do: how much is due on each of the next seven days */
  const days = [...Array(7)].map((_, k) => { const d = addDays(t, k), n = items.filter(i => i.due === isoOf(d)).length; return {d, n}; }), late = items.filter(i => i.days !== null && i.days < 0).length;
  const top = Math.max(1, ...days.map(x => x.n));
  const bars = days.map((x, k) => `<i class="${k === 0 ? "today" : ""}" title="${x.n} due ${fmt(x.d)}"><b style="height:${x.n ? Math.max(12, x.n / top * 100) : 0}%"></b><s>${x.d.toLocaleDateString("en-US", {weekday: "narrow"})}</s></i>`).join("");
  const week = days.reduce((k, x) => k + x.n, 0);
  /* Applications: one dot each, grouped by stage */
  const apps = APPS.concat(appsAdded()).filter(a => appStage(a) !== "Closed");
  const pipe = STAGES.map(sg => { const k = apps.filter(a => appStage(a) === sg).length; return `<div><span class="hv-dots">${k ? "<u></u>".repeat(Math.min(k, 8)) : `<u class="none"></u>`}</span><s>${sg}</s></div>`; }).join("");
  /* School: required classes done, with the ones in progress lighter */
  const slots = reqRows().flatMap(g => g.rows), nAll = slots.reduce((k, x) => k + x.need, 0), nTaken = slots.reduce((k, x) => k + x.got.filter(c => courseStatus(c) === "taken").length, 0), nNow = slots.reduce((k, x) => k + x.got.filter(c => courseStatus(c) === "now").length, 0);
  const R = 30, C = 2 * Math.PI * R, pct = nAll ? nTaken / nAll : 0, pctNow = nAll ? (nTaken + nNow) / nAll : 0;
  const ring = `<svg viewBox="0 0 76 76" width="76" height="76" aria-hidden="true"><circle cx="38" cy="38" r="${R}" class="hr-bg"/><circle cx="38" cy="38" r="${R}" class="hr-now" stroke-dasharray="${(C * pctNow).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 38 38)"/><circle cx="38" cy="38" r="${R}" class="hr-done" stroke-dasharray="${(C * pct).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 38 38)"/><text x="38" y="43" text-anchor="middle">${Math.round(pct * 100)}%</text></svg>`;
  /* Projects: a square each, filled when finished, outlined while in progress, faint when only planned */
  const linked = new Set(WORKS.map(w => w.plan).filter(Boolean)), done = WORKS.filter(w => !w.exp && w.status === "done").length, act = WORKS.filter(w => !w.exp && w.status === "active").length, plan = PROJECTS.filter(p => !linked.has(p.id) && !isOn(p.id)).length;
  const sq = `<u class="d"></u>`.repeat(done) + `<u class="a"></u>`.repeat(act) + `<u class="p"></u>`.repeat(plan);
  /* a visitor sees the same pictures, but they are not links */
  const tag = viewOnly() ? "div" : "button", tile = (go, name, pic, line) => `<${tag} class="hv"${viewOnly() ? "" : ` data-go="${go}"`}><span class="pcode">${name}</span><span class="hv-pic">${pic}</span><span class="hv-line">${line}</span></${tag}>`;
  return `<div class="hvgrid">
    ${tile("todo", "To-Do", `<span class="hv-bars">${bars}</span>`, `<b>${week}</b> due in the next 7 days${late ? `, <b class="hot">${late} overdue</b>` : ""}`)}
    ${tile("apps", "Applications", `<span class="hv-pipe">${pipe}</span>`, `<b>${apps.length}</b> on the board`)}
    ${tile("school", "School", ring, `<b>${nTaken} of ${nAll}</b> required classes done`)}
    ${tile("projects", "Projects", `<span class="hv-sq">${sq}</span>`, `<b>${act}</b> in progress, <b>${done}</b> finished, <b>${plan}</b> planned`)}
  </div>`;
}
