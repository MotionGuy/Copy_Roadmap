/* Fetches a Canvas calendar feed on the site's behalf, because browsers are not allowed to read it directly from another site.
   The feed address is private (it works like a password), so it arrives in the request body, is never logged or stored here,
   and only Canvas feed addresses are accepted: any school on instructure.com, a school's own Canvas
   address of the form canvas.<school>.edu, or one listed in the CANVAS_HOSTS setting on Vercel (comma-separated). */
const OWN = (process.env.CANVAS_HOSTS || "").toLowerCase().split(",").map(h => h.trim()).filter(Boolean);
const HOSTS = {test: h => /^[a-z0-9-]+\.instructure\.com$/i.test(h) || /^canvas(\.[a-z0-9-]+)+\.edu$/i.test(h) || OWN.includes(h.toLowerCase())};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({error: "POST only"});
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  let u;
  try { u = new URL(String(body && body.url || "")); } catch (e) { return res.status(400).json({error: "Not a link"}); }
  if (u.protocol !== "https:" || u.port || u.username || u.password || !HOSTS.test(u.hostname) || !/^\/feeds\/calendars\/[\w.-]+\.ics$/.test(u.pathname))
    return res.status(400).json({error: "Not a Canvas calendar feed link"});
  try {
    const r = await fetch(u.href, {redirect: "error", signal: AbortSignal.timeout(12000)});
    if (!r.ok) return res.status(502).json({error: "Canvas answered " + r.status});
    const text = await r.text();
    if (text.length > 3000000 || !text.includes("BEGIN:VCALENDAR")) return res.status(502).json({error: "That did not look like a calendar"});
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    return res.status(200).send(text);
  } catch (e) {
    return res.status(502).json({error: "Could not reach Canvas"});
  }
};
