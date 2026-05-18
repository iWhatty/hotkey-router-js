// scripts/scrape/_common.mjs
//
// Shared helpers for the per-source scrapers.
//
// Each scraper:
//   1. Fetches the canonical page (HTML).
//   2. Parses tables to (combo, action) pairs.
//   3. Normalizes the combo string into the same shape used by
//      data/browser-hotkeys.json (lowercase, canonical modifier order).
//   4. Annotates a severity (`hard` / `find-bar-only` / etc.) heuristically.
//   5. Returns one or more partials shaped as:
//        { platform, browser, entries: { [comboKey]: { action, severity } } }

export async function fetchText(url, { timeout = 15000 } = {}) {
  const ctrl = new AbortController()
  const id = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'user-agent': 'hotkey-router-scraper/0.2 (+https://github.com/iWhatty/hotkey-router-js)',
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`)
    return await res.text()
  } finally {
    clearTimeout(id)
  }
}

// Canonical lookup-key format used by browser-hotkeys.json. Order:
// ctrl, meta, alt, shift, then base key. Modifiers are lowercased; the
// base key is lowercased letter or symbolic name (space, tab, ...).
const MOD_ORDER = ['ctrl', 'meta', 'alt', 'shift']
const MOD_ALIASES = {
  command: 'meta', cmd: 'meta', '⌘': 'meta', win: 'meta', windows: 'meta',
  control: 'ctrl', '⌃': 'ctrl',
  option: 'alt', opt: 'alt', '⌥': 'alt',
  '⇧': 'shift',
}

export function canonicalCombo(raw) {
  if (!raw) return null
  const tokens = String(raw)
    .replace(/\s+/g, '')
    .split(/\+|-/)
    .map((t) => t.toLowerCase())
    .map((t) => MOD_ALIASES[t] || t)
    .filter(Boolean)
  if (!tokens.length) return null
  const mods = new Set()
  let base = null
  for (const t of tokens) {
    if (MOD_ORDER.includes(t)) mods.add(t)
    else base = t
  }
  if (!base) return null
  const parts = MOD_ORDER.filter((m) => mods.has(m))
  parts.push(base)
  return parts.join('+')
}

// Coarse severity inference. Real scrapers should refine this based on
// section / column headings (e.g. "find bar" sections imply find-bar-only).
export function inferSeverity({ section, action } = {}) {
  const text = `${section || ''} ${action || ''}`.toLowerCase()
  if (/find bar|find previous|find next/.test(text)) return 'find-bar-only'
  if (/menu/.test(text)) return 'menu-activation'
  return 'hard'
}
