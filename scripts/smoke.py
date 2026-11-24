#!/usr/bin/env python3
"""Open every page of the site in a headless browser and report anything broken.

Checks, at a desktop and a phone width: JavaScript errors, sideways overflow, that each page draws something,
and that the main interactions still work (check off and undo, edit a task, the Later fold, year buttons,
the course map and requirements overlays, jumping to a class).

Usage:  python3 scripts/smoke.py            (needs: pip install playwright && playwright install chromium)
The site is opened straight from the files, signed in with a fake session, with the network blocked,
so nothing is read from or written to the real synced data.
"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = (ROOT / "index.html").as_uri()
SIGN_IN = "sess={access_token:'x',refresh_token:'y',uid:'u',email:'test@example.com',exp:Date.now()+9e6}; rerender()"
PAGES = ["todo", "school", "later", "study", "apps", "projects", "certs", "portfolio", "plan"]
bad = []
# The backdrop is optional (config.js "scene", and the file js/scene.js): without it the scene checks are skipped.
SCENE = (ROOT / "js" / "scene.js").exists() and "scene: true" in (ROOT / "config.js").read_text(encoding="utf-8")

def check(ok, what):
    print(("  ok    " if ok else "  FAIL  ") + what)
    if not ok: bad.append(what)

async def open_page(browser, width, tab, query=""):
    pg = await browser.new_page(viewport={"width": width, "height": 860})
    pg.errs = []
    pg.on("pageerror", lambda e: pg.errs.append(str(e)))
    await pg.route("**/*", lambda r: r.continue_() if r.request.url.startswith("file:") else r.abort())
    await pg.goto(f"{PAGE}{query}#{tab}"); await pg.wait_for_timeout(350)
    await pg.evaluate(SIGN_IN); await pg.wait_for_timeout(250)
    return pg

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for width in (1300, 390):
            print(f"\n{width}px wide")
            for tab in PAGES:
                pg = await open_page(b, width, tab)
                drawn = await pg.evaluate("[...document.querySelectorAll('section.tab.on')].some(s => s.children.length > 0)")
                wide = await pg.evaluate("document.documentElement.scrollWidth > innerWidth")
                check(drawn and not wide and not pg.errs, f"#{tab}" + (f"  errors: {pg.errs}" if pg.errs else "") + ("  overflows sideways" if wide else "") + ("" if drawn else "  drew nothing"))
                await pg.close()
            for q in ("?sky=night", "?sky=dawn&wx=rain", "?finals=1", "?aurora=1&sky=night", "?season=fall", "?season=spring&sky=night", "?season=summer&sky=dusk"):
                pg = await open_page(b, width, "todo", q); await pg.wait_for_timeout(400)
                check(not pg.errs, f"preview {q}" + (f"  errors: {pg.errs}" if pg.errs else "")); await pg.close()

        print("\ninteractions")
        pg = await open_page(b, 1300, "todo")
        first = pg.locator("#todo .tgroup .todo input").first; tid = await first.get_attribute("data-id")
        await first.check(); await pg.wait_for_timeout(650)
        check(await pg.evaluate(f"!!state.checks['{tid}']"), "checking a task off saves it")
        await pg.click("#toast button", timeout=3000); await pg.wait_for_timeout(250)
        check(await pg.evaluate(f"!state.checks['{tid}']"), "Undo in the toast is clickable and puts it back")
        await pg.locator("#todo .todo .rowed[data-edit]").first.click(); await pg.fill("#ed-t", "Renamed by the smoke test")
        await pg.click("#ed-form button[type=submit]"); await pg.wait_for_timeout(250)
        check(await pg.locator("#todo .todo", has_text="Renamed by the smoke test").count() == 1, "editing a task renames it")
        if await pg.locator("#later-tog").count():
            before = await pg.get_attribute("#later-tog", "aria-expanded"); await pg.click("#later-tog")
            check(await pg.get_attribute("#later-tog", "aria-expanded") != before, "the Later section folds and unfolds")
        styled = await pg.evaluate("[['.tgroup','borderRadius','12px'],['.areasel','appearance','none'],['.todo .rowed','cursor','pointer'],['.sum','overflow','hidden']].filter(([q,k,v]) => { const el = document.querySelector(q); return !el || getComputedStyle(el)[k] !== v; }).map(x => x[0])")
        check(not styled, "the stylesheet is intact" + (f" (unstyled: {styled})" if styled else ""))
        check(not pg.errs, "To-Do: no errors" + (f" {pg.errs}" if pg.errs else "")); await pg.close()

        pg = await open_page(b, 1300, "todo")
        await pg.click("#settings-open"); await pg.wait_for_timeout(300)
        check(not await pg.evaluate("document.querySelector('#settings').hidden") and await pg.locator("#settings .setrow").count() >= (4 if SCENE else 1), "the gear opens Settings")
        if SCENE:
            await pg.click("#settings [data-set='season'][data-val='fall']"); await pg.wait_for_timeout(150)
            await pg.click("#settings [data-set='time'][data-val='night']"); await pg.wait_for_timeout(150)
            p = await pg.evaluate("scene.prefs()")
            check(p["season"] == "fall" and p["time"] == "night" and await pg.evaluate("document.documentElement.dataset.sky") == "night", f"scene settings apply ({p})")
            await pg.click("#settings [data-set='time'][data-val='dynamic']"); await pg.click("#settings [data-set='season'][data-val='winter']")
        await pg.keyboard.press("Escape")
        check(await pg.evaluate("document.querySelector('#settings').hidden"), "Escape closes Settings")
        await pg.goto(f"{PAGE}#overview"); await pg.wait_for_timeout(300)
        check(not await pg.evaluate("document.querySelector('#settings').hidden"), "an old link to the Settings page opens the overlay")
        check(not pg.errs, "Settings: no errors" + (f" {pg.errs}" if pg.errs else "")); await pg.close()

        if SCENE:
            # The frosted glass is switched off wherever it cannot be seen (see the note above html.athome in css/site.css).
            pg = await open_page(b, 1300, "todo"); await pg.wait_for_timeout(600)
            glass = "getComputedStyle(document.querySelector('#todo .tgroup')).backdropFilter"
            check(await pg.evaluate(glass) != "none", "a settled page has its frosted glass")
            await pg.evaluate("show('school')")
            arriving = await pg.evaluate("document.querySelector('#school').classList.contains('arriving') && getComputedStyle(document.querySelector('#school .card')).backdropFilter")
            await pg.wait_for_timeout(700)
            check(arriving == "none" and not await pg.evaluate("!!document.querySelector('section.arriving')"), "a page drops its glass while it eases in, then gets it back")
            await pg.evaluate("show('todo')"); await pg.wait_for_timeout(700)
            await pg.click("#settings-open"); await pg.wait_for_timeout(200); covered = await pg.evaluate(glass); await pg.click("#settings-close")
            check(covered == "none" and await pg.evaluate(glass) != "none", "the page under an overlay drops its glass")
            sharp = await pg.evaluate("document.querySelector('#sky').width / innerWidth")
            await pg.evaluate("show('plan')"); await pg.wait_for_timeout(400)
            soft = await pg.evaluate("document.querySelector('#sky').width / innerWidth")
            check(soft == 1 and sharp >= soft and await pg.evaluate("getComputedStyle(document.querySelector('#plan .card')).backdropFilter") == "none", "Home draws the blurred scene at the lighter resolution, with no glass over it")
            # Home wears its ski hill only in the winter scene; otherwise the year trail is a plain timeline that works the same.
            home = "[!!document.querySelector('#plan .ht-ski'), !!document.querySelector('#plan .ht-dot')]"
            await pg.evaluate("scene.set({on: true, season: 'winter'}); rPlan()")
            check(await pg.evaluate(home) == [True, False], "winter scene: Home has the skier")
            for how, undo in (("scene.set({season: 'fall'})", "scene.set({season: 'winter'})"), ("scene.set({on: false})", "scene.set({on: true})")):
                await pg.evaluate(how + "; rPlan()")
                plain = await pg.evaluate(home)
                box = await pg.locator(".ht-svg").bounding_box()
                await pg.mouse.move(box["x"] + 500, box["y"] + box["height"] / 2); await pg.mouse.down(); await pg.mouse.move(box["x"] + 300, box["y"] + box["height"] / 2, steps=4)
                tip = await pg.evaluate("!document.querySelector('.ht-tip').hidden")
                await pg.mouse.up(); await pg.evaluate(undo + "; rPlan()")
                check(plain == [False, True] and tip, f"{how}: Home shows the plain timeline, and dragging it still shows the day's card")
            check(not pg.errs, "Glass: no errors" + (f" {pg.errs}" if pg.errs else "")); await pg.close()

        pg = await open_page(b, 1300, "apps")
        app = pg.locator("#apps .col[data-stage='0'] .app").first; aid = await app.get_attribute("data-id")
        target = pg.locator("#apps .col[data-stage='2']")
        a_box = await app.bounding_box(); t_box = await target.bounding_box()
        await pg.mouse.move(a_box["x"] + a_box["width"] - 50, a_box["y"] + 20); await pg.mouse.down()
        await pg.mouse.move(a_box["x"] + a_box["width"] - 20, a_box["y"] + 40, steps=4); await pg.mouse.move(t_box["x"] + 60, t_box["y"] + 80, steps=8); await pg.mouse.up(); await pg.wait_for_timeout(300)
        check(await pg.evaluate(f"appStage(APPS.concat(appsAdded()).find(a => a.id === '{aid}'))") == "Interview", "dragging an application moves it to that stage")
        row = pg.locator("#apps .app").first
        await row.locator(".app-due, .app-more-btn").first.click(); await pg.wait_for_timeout(400)
        check(await row.evaluate("el => el.classList.contains('open') && el.querySelector('.app-more').offsetHeight > 20"), "clicking an application opens its details")
        await pg.click("#find-open"); await pg.wait_for_timeout(300)
        check(await pg.locator("#find .fdlist li").count() > 0, "the magnifier opens Find internships over the page")
        await pg.keyboard.press("Escape")
        check(not pg.errs, "Applications: no errors" + (f" {pg.errs}" if pg.errs else "")); await pg.close()

        pg = await open_page(b, 1300, "todo")
        await pg.click("#cal-open"); await pg.wait_for_timeout(300)
        check(await pg.locator("#bigcal .bc-day").count() >= 28, "the calendar overlay opens on a month")
        await pg.click("#bigcal [data-bcview='week']"); await pg.wait_for_timeout(200)
        check(await pg.locator("#bigcal .bc-col").count() == 21, "week view shows the week, with the weeks before and after beside it")
        await pg.keyboard.press("Escape")
        await pg.goto(f"{PAGE}#later"); await pg.wait_for_timeout(300)
        await pg.locator("[data-qweek='" + await pg.evaluate("[...document.querySelectorAll('[data-qweek]')].map(b => b.dataset.qweek).find(d => TERMS.some(t => t.start === d && (t.classes || []).some(c => (c.times || []).length)))") + "']").first.click(); await pg.wait_for_timeout(300)
        check(await pg.locator("#bigcal .bc-block.meet").count() >= 1, "a term's calendar icon opens its weekly class schedule")
        if True:
            await pg.keyboard.press("Escape"); await pg.evaluate("location.hash = 'todo'"); await pg.wait_for_timeout(300)
            await pg.evaluate("state.checks._added = [{id:'u-smoke', a:'classes', t:'Smoke repeat', due: isoOf(today()), rep:'w'}]; setSubs('u-smoke', [{t:'one', d:1}, {t:'two'}]); rerender()")
            check(await pg.locator("#todo .steps .step").count() == 2, "steps show under their task")
            target = await pg.evaluate("isoOf(addDays(today(), 2))")
            if await pg.locator(f".cal-g [data-drop='{target}']").count():
                await pg.locator("#todo .todo[data-drag='u-smoke']").drag_to(pg.locator(f".cal-g [data-drop='{target}']")); await pg.wait_for_timeout(300)
                check(await pg.evaluate("added()[0].due") == target, "dragging a task onto a calendar day reschedules it")
            before = await pg.evaluate("added()[0].due")
            await pg.locator("input[data-id='u-smoke']").check(); await pg.wait_for_timeout(650)
            check(await pg.evaluate("added()[0].due > '%s' && !state.checks['u-smoke'] && !subsOf('u-smoke').some(s => s.d)" % before), "ticking a repeating task moves it to its next date")
            check(await pg.evaluate("LATER.years[0].quarters.every(q => qUnits(q) === q.courses.reduce((n, c) => n + (c.units || 4), 0) && qUnits(q) > 0)"), "unit counts add up")
        check(not pg.errs, "Calendar: no errors" + (f" {pg.errs}" if pg.errs else "")); await pg.close()

        pg = await open_page(b, 1300, "school")
        await pg.click("#reqs-open"); await pg.wait_for_timeout(300)
        check(await pg.locator("#reqs .rqrow").count() >= 3, "requirements overlay opens with its rows")
        await pg.keyboard.press("Escape")
        check(await pg.evaluate("document.querySelector('#reqs').hidden"), "Escape closes it")
        await pg.click("#fit-open"); await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelectorAll('#fit .rqcol').length") >= 1, "the classes-fit-together overlay opens")
        await pg.keyboard.press("Escape")
        await pg.click("#watchouts-open"); await pg.wait_for_timeout(300)
        check(await pg.evaluate("document.querySelectorAll('#watchouts .rqrow').length") >= 1, "the watch-outs overlay opens")
        await pg.keyboard.press("Escape"); await pg.wait_for_timeout(150)
        check(await pg.evaluate("document.querySelector('#fit').hidden && document.querySelector('#watchouts').hidden"), "Escape closes the Overview overlays")
        await pg.locator("#school .ptile").nth(min(20, await pg.locator("#school .ptile").count() - 1)).click(); await pg.wait_for_timeout(300)
        check(await pg.evaluate("location.hash") == "#later" and await pg.locator(".pcard.flash").count() == 1, "a class on the grid opens on Academic plan")
        await pg.click("#map-open"); await pg.wait_for_timeout(300)
        nodes = await pg.locator("#map .mn").count(); courses = await pg.evaluate("planCourses().length")
        check(nodes == courses and nodes > 0, f"course map draws every class ({nodes} of {courses})")
        await pg.hover(f"#map .mn >> nth={min(12, nodes - 1)}"); await pg.wait_for_timeout(200)
        check(await pg.locator("#map .mn.on").count() >= 1, "hovering a class traces its chain")
        await pg.click("#map-close")
        await pg.click("#later .yearbar button >> nth=0"); await pg.wait_for_timeout(150)
        check(await pg.evaluate("planYear") == 0, "year buttons switch the year")
        await pg.goto(f"{PAGE}#later"); await pg.wait_for_timeout(300); await pg.click("#later .yearbar button >> nth=1"); await pg.locator("#later [data-sg]").first.click(); await pg.wait_for_timeout(300)
        check(await pg.evaluate("location.hash") == "#study" and await pg.locator("#study .sgcard.flash").count() == 1, "a class's study guide icon jumps to that class and highlights it")
        await pg.goto(f"{PAGE}#study"); await pg.wait_for_timeout(300)
        check(await pg.locator("#study .sglist li").count() == await pg.evaluate("STUDY.filter(g => LATER.years[studyYear].quarters.some(q => q.courses.some(c => c.code === g.cls))).length"), "study guides for the year are all listed")
        await pg.evaluate("location.hash = 'projects'"); await pg.wait_for_timeout(300)
        check(await pg.locator("#projects .pjrow").count() == await pg.evaluate("projectItems().length") and await pg.locator("#projects .pjrow").count() > 0, "Projects lists what is in progress and planned")
        await pg.click("#targets-open"); await pg.wait_for_timeout(200)
        check(await pg.locator("#targets .rqbox").count() == 1, "Targets opens from Projects"); await pg.click("#targets-close")
        check(not pg.errs, "School: no errors" + (f" {pg.errs}" if pg.errs else "")); await pg.close()
        await b.close()
    print("\n" + ("All good." if not bad else f"{len(bad)} problem(s):\n  " + "\n  ".join(bad)))
    sys.exit(1 if bad else 0)

# With no content yet, run against the sample: it stands in as content.js for the length of the run.
_real, _sample = ROOT / "content" / "content.js", ROOT / "content" / "sample.js"
_borrowed = not _real.exists() and _sample.exists()
if _borrowed: _real.write_text(_sample.read_text(encoding="utf-8"), encoding="utf-8")
try: asyncio.run(main())
finally:
    if _borrowed: _real.unlink()
