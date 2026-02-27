// hotkey-router.js
// Hotkey Router — plugin-first keyboard shortcut router (tiny + predictable)
//
// Goals:
// - O(1) dispatch by combo string lookup
// - Deterministic routing: highest priority wins; ties -> most recently bound wins
// - Safe plugin cleanup (never deletes other plugins’ bindings)
// - Modern browser target (KeyboardEvent.key + addEventListener)

// --- tiny event helper ---
function on(target, type, fn, options) {
  target.addEventListener(type, fn, options)
  return () => target.removeEventListener(type, fn, options)
}

// --- key alias map ---
const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)


const modifierTokens = new Set(['ctrl', 'shift', 'alt', 'meta'])

const ahkPrefixMap = new Map([
  ['^', 'ctrl'],  // Ctrl
  ['!', 'alt'],   // Alt
  ['+', 'shift'], // Shift
  ['#', 'meta'],  // Win / Command
])


const keyAliases = {
  // common
  esc: 'escape',
  escape: 'escape',
  space: ' ',
  spacebar: ' ',
  enter: 'enter',
  return: 'enter',
  del: 'delete',
  delete: 'delete',
  backspace: 'backspace',
  tab: 'tab',

  // arrows
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',

  // navigation
  home: 'home',
  end: 'end',
  pageup: 'pageup',
  pagedown: 'pagedown',
  pgup: 'pageup',
  pgdn: 'pagedown',

  // modifiers (words)
  cmd: 'meta',
  command: 'meta',
  win: 'meta',
  meta: 'meta',
  control: 'ctrl',
  ctrl: 'ctrl',
  option: 'alt',
  alt: 'alt',
  shift: 'shift',

  // modifiers (symbols)
  '⌘': 'meta',
  '⌃': 'ctrl',
  '⌥': 'alt',
  '⇧': 'shift',

  // cross-platform "mod"
  mod: isMac ? 'meta' : 'ctrl',

  // plus key ergonomics
  plus: '+',
}

// --- config ---
let ignoreEditable = true
let defaultTarget = typeof window !== 'undefined' ? window : null

// --- state ---
// comboStr -> Map<type, Array<Binding>>
const registry = new Map()
// pluginName -> Array<bindingId>
const plugins = new Map()
// bindingId -> { comboStr, type }
const bindingIndex = new Map()

let paused = false
let nextId = 1

// --- helpers ---
function normalizeKey(key) {
  const raw = String(key ?? '').trim()
  const k = raw.toLowerCase()
  return keyAliases[k] ?? (raw === ' ' ? ' ' : k)
}

function comboKeyFromParts({ ctrl, shift, alt, meta, key }) {
  return [
    ctrl ? 'ctrl' : '',
    shift ? 'shift' : '',
    alt ? 'alt' : '',
    meta ? 'meta' : '',
    key,
  ]
    .filter(Boolean)
    .join('+')
}

function comboKeyFromEvent(e) {
  return comboKeyFromParts({
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
    key: normalizeKey(e.key),
  })
}



function isModifierToken(token) {
  const normalized = keyAliases[token] || token
  return modifierTokens.has(normalized)
}




function parseHotkey(hotkeyStr) {
  const raw = String(hotkeyStr || '').trim()
  const lower = raw.toLowerCase()

  const isUp = lower.endsWith(' up')
  let cleanStr = (isUp ? raw.slice(0, -3) : raw).trim().toLowerCase()

  // --- AHK-style prefix modifiers ---
  // Examples:
  //  ^k   => ctrl+k
  //  !k   => alt+k
  //  +k   => shift+k
  //  #k   => meta+k
  //  ^!k  => ctrl+alt+k
  //
  // This runs BEFORE normal "+" token parsing so it composes cleanly.
  const combo = { ctrl: false, shift: false, alt: false, meta: false, key: null }

  while (cleanStr.length) {
    const mod = ahkPrefixMap.get(cleanStr[0])
    if (!mod) break
    combo[mod] = true
    cleanStr = cleanStr.slice(1).trimStart()
  }

  // Allow: "ctrl++" OR "++" (after stripping AHK '+' shift prefix)
  // `split('+')` produces empties; we keep that signal.
  const rawParts = cleanStr.split('+').map((p) => p.trim())
  const parts = rawParts.filter(Boolean)
  const impliedPlusKey = rawParts.some((p) => p === '') && cleanStr.includes('++')

  // Enforce: modifiers must come before the base key.
  // Example: "ctrl+k" ✅  |  "k+ctrl" ❌
  // We ignore the special "+ key" case (ctrl++) since it has no explicit base token.
  if (!impliedPlusKey) {
    let seenBase = false
    for (const part of parts) {
      if (isModifierToken(part)) {
        if (seenBase) {
          throw new Error(
            `Invalid hotkey "${hotkeyStr}": modifiers must come before the base key (e.g. "ctrl+k", not "k+ctrl")`
          )
        }
      } else {
        if (!seenBase) seenBase = true
      }
    }
  }

  // Continue parsing the remaining tokens (words/symbols/aliases)
  for (const part of parts) {
    const actual = keyAliases[part] || part
    if (actual === 'ctrl') combo.ctrl = true
    else if (actual === 'shift') combo.shift = true
    else if (actual === 'alt') combo.alt = true
    else if (actual === 'meta') combo.meta = true
    else combo.key = normalizeKey(actual)
  }

  if (!combo.key && impliedPlusKey) combo.key = '+'
  if (!combo.key) throw new Error(`Invalid hotkey "${hotkeyStr}" (missing base key)`)

  return { combo, type: isUp ? 'keyup' : 'keydown', raw: hotkeyStr }
}




function isFromInputTarget(e) {
  const t = e?.target
  if (!t) return false
  const tag = String(t.tagName || '').toUpperCase()
  return (
    t.isContentEditable ||
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    t.getAttribute?.('role') === 'textbox'
  )
}




// --- binding model ---
// options:
//  preventDefault, stopPropagation, stopImmediatePropagation
//  repeat (default false on keydown), once
//  when(e) -> boolean (gate)
//  allowIn(e) -> boolean (override ignoreInput)
//  priority (higher wins)
function normalizeOptions(type, options) {
  const o = options ? { ...options } : {}
  if (type === 'keydown' && o.repeat == null) o.repeat = false
  if (o.priority == null) o.priority = 0
  return o
}


function ensureSlot(comboStr, type) {
  let typeMap = registry.get(comboStr)
  if (!typeMap) {
    typeMap = new Map()
    registry.set(comboStr, typeMap)
  }
  let arr = typeMap.get(type)
  if (!arr) {
    arr = []
    typeMap.set(type, arr)
  }
  return arr
}


function removeById(id) {
  const idx = bindingIndex.get(id)
  if (!idx) return false

  const { comboStr, type } = idx
  const typeMap = registry.get(comboStr)
  const arr = typeMap?.get(type)
  if (!arr?.length) {
    bindingIndex.delete(id)
    return false
  }

  const next = arr.filter((b) => b.id !== id)
  if (next.length) typeMap.set(type, next)
  else typeMap.delete(type)

  if (!typeMap.size) registry.delete(comboStr)
  bindingIndex.delete(id)
  return true
}


// --- public API: bind / unbind ---
// bind returns an off() function; off.id is exposed for plugin bookkeeping.
function bind(hotkeyStr, handler, plugin = null, options = {}) {
  const { combo, type, raw } = parseHotkey(hotkeyStr)
  const comboStr = comboKeyFromParts(combo)
  const opts = normalizeOptions(type, options)

  const binding = {
    id: nextId++,
    comboStr,
    type,
    combo,
    handler,
    plugin,
    raw,
    options: opts,
  }

  ensureSlot(comboStr, type).push(binding)
  bindingIndex.set(binding.id, { comboStr, type })

  const off = () => removeById(binding.id)
  off.id = binding.id
  off.hotkey = raw
  return off
}


// unbind('ctrl+k') -> remove all for that combo/type
// unbind('ctrl+k', fn) -> remove only that handler
function unbind(hotkeyStr, handler) {
  const { combo, type } = parseHotkey(hotkeyStr)
  const comboStr = comboKeyFromParts(combo)
  const typeMap = registry.get(comboStr)
  if (!typeMap) return

  const arr = typeMap.get(type)
  if (!arr?.length) return

  if (!handler) {
    for (const b of arr) bindingIndex.delete(b.id)
    typeMap.delete(type)
  } else {
    const keep = []
    for (const b of arr) {
      if (b.handler === handler) bindingIndex.delete(b.id)
      else keep.push(b)
    }
    if (keep.length) typeMap.set(type, keep)
    else typeMap.delete(type)
  }

  if (!typeMap.size) registry.delete(comboStr)
}


// --- plugin system ---
// registerPlugin returns unregister function.
function registerPlugin(name, hotkeyMap) {
  if (plugins.has(name)) throw new Error(`Plugin "${name}" already registered`)
  const ids = []

  for (const [hotkeyStr, fnOrTuple] of Object.entries(hotkeyMap)) {
    const [fn, options] = Array.isArray(fnOrTuple) ? fnOrTuple : [fnOrTuple, {}]
    const off = bind(hotkeyStr, fn, name, options)
    ids.push(off.id)
  }

  plugins.set(name, ids)
  return () => unregisterPlugin(name)
}

function unregisterPlugin(name) {
  const ids = plugins.get(name)
  if (!ids) return
  for (const id of ids) removeById(id)
  plugins.delete(name)
}

// --- control ---
function pause() {
  paused = true
}
function resume() {
  paused = false
}
function ignoreInput(value = true) {
  ignoreEditable = !!value
}

// allow changing the default target (iframes/tests).
// we intentionally do not auto-rebind to keep the core tiny.
function setTarget(target) {
  defaultTarget = target
}


// --- dispatch (O(1) lookup) ---
function pickWinner(bindings) {
  // Highest priority wins; ties -> newest wins (largest id).
  let best = null
  for (const b of bindings) {
    if (!best) best = b
    else if (b.options.priority > best.options.priority) best = b
    else if (b.options.priority === best.options.priority && b.id > best.id) best = b
  }
  return best
}


function handleEvent(type) {
  return (e) => {
    if (paused) return

    const fromInput = ignoreEditable && isFromInputTarget(e)
    const comboStr = comboKeyFromEvent(e)

    const bindings = registry.get(comboStr)?.get(type)
    if (!bindings?.length) return

    const candidates = []
    for (const b of bindings) {
      const o = b.options
      if (fromInput && !o.allowIn?.(e)) continue
      if (type === 'keydown' && o.repeat === false && e.repeat) continue
      if (o.when && o.when(e) === false) continue
      candidates.push(b)
    }
    if (!candidates.length) return

    const winner = pickWinner(candidates)
    const o = winner.options

    if (o.preventDefault) e.preventDefault()
    if (o.stopImmediatePropagation) e.stopImmediatePropagation()
    else if (o.stopPropagation) e.stopPropagation()

    winner.handler(e)

    if (o.once) removeById(winner.id)
  }
}


// --- listeners ---
let stopDown = null
let stopUp = null

function init({ target = defaultTarget, capture = false } = {}) {
  if (!target) throw new Error('hotkeys.init() requires a target (e.g. window)')
  if (stopDown || stopUp) destroy()

  stopDown = on(target, 'keydown', handleEvent('keydown'), { capture })
  stopUp = on(target, 'keyup', handleEvent('keyup'), { capture })
}


function destroy() {
  stopDown?.()
  stopUp?.()
  stopDown = null
  stopUp = null
  registry.clear()
  plugins.clear()
  bindingIndex.clear()
}


// --- programmatic trigger (tests / automation) ---
function trigger(hotkeyStr, { type: forcedType } = {}) {
  const { combo, type } = parseHotkey(hotkeyStr)
  const comboStr = comboKeyFromParts(combo)
  const actualType = forcedType || type

  const bindings = registry.get(comboStr)?.get(actualType)
  if (!bindings?.length) return false

  const e = {
    type: actualType,
    key: combo.key,
    ctrlKey: !!combo.ctrl,
    shiftKey: !!combo.shift,
    altKey: !!combo.alt,
    metaKey: !!combo.meta,
    repeat: false,
    preventDefault() { },
    stopPropagation() { },
    stopImmediatePropagation() { },
    target: null,
  }

  const winner = pickWinner(
    bindings.filter((b) => (b.options.when ? b.options.when(e) !== false : true))
  )
  if (!winner) return false

  winner.handler(e)
  if (winner.options.once) removeById(winner.id)
  return true
}


// Auto-init on window by default (keeps ergonomics)
if (defaultTarget) init()

export default {
  // lifecycle
  init,
  destroy,
  setTarget,

  // bindings
  bind,
  unbind,
  registerPlugin,
  unregisterPlugin,

  // control
  pause,
  resume,
  ignoreInput,

  // testing / automation
  trigger,
}