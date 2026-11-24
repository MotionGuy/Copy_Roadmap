/* Runs last, once every other script has loaded: draw every page, open the one named in the address, then sync, and check the database for newer content. */
renderAll();
show(location.hash.slice(1) || "plan");
/* The browser jumps to the section named in the link after loading; put the page back at the top. */
window.addEventListener("load", () => setTimeout(() => { if (location.hash.slice(1) !== "start") window.scrollTo(0, 0); }, 0));
drawSync();
pull().then(() => { canvasPull(); pullContent(); });
