// scripts/scrape/safari.mjs
//
// Canonical sources:
//   https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac
//   https://developer.apple.com/documentation/safari-developer-tools/web-inspector
//
// Page structure: Apple's support site renders tables inside <div class=
// "TaskItem"> blocks; symbols (⌘ ⌃ ⌥ ⇧) are inline <span> spans, NOT plain
// text — canonicalCombo() in ./_common.mjs already handles the symbol aliases.
// Apple Developer docs render shortcuts inside <table class="defined">.

export default async function scrapeSafari() {
  // TODO: implement parsing of Safari Apple Support + Web Inspector tables.
  return null
}
