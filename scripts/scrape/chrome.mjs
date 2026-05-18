// scripts/scrape/chrome.mjs
//
// Canonical sources:
//   https://support.google.com/chrome/answer/157179
//   https://developer.chrome.com/docs/devtools/shortcuts
//
// Page structure: Google support pages render shortcut blocks per-OS in
// expandable sections (data-id="hc_step"). Chrome DevTools docs use Markdown
// tables that render as plain <table> with no class. Both pages serve OS-
// gated content via `?hl=en&visit_id=...&os=mac` URL parameters; pull each
// OS variant separately.
//
// See ./firefox.mjs for the partials shape.

export default async function scrapeChrome() {
  // TODO: implement parsing of Chrome support + DevTools tables.
  return null
}
