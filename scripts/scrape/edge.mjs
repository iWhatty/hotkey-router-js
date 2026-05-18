// scripts/scrape/edge.mjs
//
// Canonical sources:
//   https://support.microsoft.com/en-us/microsoft-edge/keyboard-shortcuts-in-microsoft-edge-50d3edab-30d9-c7e4-21ce-37fe2713cfad
//   https://support.microsoft.com/en-us/windows/keyboard-shortcuts-in-windows-dcc61a57-8ff0-cffe-9796-cb9706c75eec
//
// Page structure: Microsoft support uses class="ocCustomHtmlEntry" wrappers
// around per-OS tables. The Edge page covers Windows + Mac. Edge 95+ allows
// users to rebind shortcuts under edge://settings/keyboard — note in the
// emitted partial that these are *defaults only*.

export default async function scrapeEdge() {
  // TODO: implement parsing of Edge support + Windows shortcuts tables.
  return null
}
