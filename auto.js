// auto.js
//
// Ergonomic one-import entry: same default export as `hotkey-router`, but
// with reservation conflict warnings pre-installed.
//
//   import hotkeys from 'hotkey-router/auto'
//   hotkeys.bind('meta+shift+f', toggleFullscreen)
//   // Console (Firefox Mac):
//   // [hotkey-router] "meta+shift+f" reserved by firefox on macOS:
//   //   "Toggle fullscreen" [hard] — will not fire.
//
// Pay-to-play: importing this entry pulls in the ~5 KB reservation table.
// If you want the tiny core only, `import hotkeys from 'hotkey-router'` and
// the data file is tree-shaken out entirely.

import hotkeys from './hotkey-router.js'
import { installReservationWarnings } from './reservations.js'

installReservationWarnings(hotkeys)

export default hotkeys
