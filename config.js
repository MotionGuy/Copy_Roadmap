/* Settings for this copy of the site. Someone running their own copy changes only this file and content/content.js.
     site          where the site is hosted (used when a page is opened straight from the files)
     supabaseUrl   the Supabase project that saves checkmarks and notes; leave both Supabase lines empty to keep
     supabaseKey   everything in the browser only. The key is the project's publishable key, which is safe to show.
     scene         true draws the backdrop behind the pages (js/scene.js). false, or a copy of the site without that file,
                   gives plain pages: no backdrop, no Scene settings and no question about location. */
const CONFIG = {
  site: "",
  supabaseUrl: "",
  supabaseKey: "",
  scene: false
};
