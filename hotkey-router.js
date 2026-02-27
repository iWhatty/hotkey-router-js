// hotkey-router.js
// Hotkey Router — plugin-first keyboard shortcut router (tiny + predictable)

// --- tiny event helper ---
function on(target, type, fn, options) {
  target.addEventListener(type, fn, options)
  return () => target.removeEventListener(type, fn, options)
}

// --- key alias map ---
const isMac =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform)

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

  // modifiers
  cmd: 'meta',
  command: 'meta',
  win: 'meta',
  meta: 'meta',
  control: 'ctrl',
  ctrl: 'ctrl',
  option: 'alt',
  alt: 'alt',
  shift: 'shift',

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
  // Normalize common variants + casing.
  // Keep single characters as-is (but lowercased).
  const raw = String(key ?? '').trim()
  const k = raw.toLowerCase()

  // Normalize old/odd names through aliases
  if (keyAliases[k] != null) return keyAliases[k]

  // Normalize arrows
  if (k === 'arrowup' || k === 'arrowdown' || k === 'arrowleft' || k === 'arrowright') return k

  // Normalize space from some environments (already handled via alias, but keep here)
  if (raw === ' ') return ' '

  // Use lower case for everything else
  return k
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
  const key = normalizeKey(e.key)
  return comboKeyFromParts({
    ctrl: e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    meta: e.metaKey,
    key,
  })
}

// Supports:
//  - "ctrl+k"
//  - "ctrl+k up"
//  - "ctrl++" (plus key)
//  - "ctrl+plus" (alias)
//  - "mod+k"
function parseHotkey(hotkeyStr) {
  const raw = String(hotkeyStr || '').trim()
  const lower = raw.toLowerCase()
  const isUp = lower.endsWith(' up')
  const cleanStr = (isUp ? raw.slice(0, -3) : raw).trim().toLowerCase()

  // Special case: allow "ctrl++" to mean key "+"
  // split('+') would lose empties, so handle by parsing tokens manually.
  // Strategy: tokenize modifiers first, then treat last token as key.
  // We'll still support the standard "a+b+c" shape.
  const rawParts = cleanStr.split('+').map((p) => p.trim())
  const parts = rawParts.filter((p) => p.length > 0)

  // If user wrote "ctrl++", rawParts becomes ["ctrl", "", ""], parts becomes ["ctrl"]
  // In that case key should be "+"
  const impliedPlusKey = rawParts.length > parts.length && cleanStr.includes('++')

  const combo = { ctrl: false, shift: false, alt: false, meta: false, key: null }

  for (const part of parts) {
    const actual = keyAliases[part] || part
    if (actual === 'ctrl') combo.ctrl = true
    else if (actual === 'shift') combo.shift = true
    else if (actual === 'alt') combo.alt = true
    else if (actual === 'meta') combo.meta = true
    else combo.key = normalizeKey(actual)
  }

  if (!combo.key && impliedPlusKey) combo.key = '+'

  if (!combo.key) {
    throw new Error(`Invalid hotkey "${hotkeyStr}" (missing base key)`)
  }

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
//  target (override defaultTarget)
//  capture (listener option; global default is bubble)
function normalizeOptions(type, options) {
  const o = options ? { ...options } : {}
  if (type === 'keydown' && o.repeat == null) o.repeat = false // dream default
  if (o.priority == null) o.priority = 0
  return o
}

function ensureSlot(comboStr, type) {
  if (!registry.has(comboStr)) registry.set(comboStr, new Map())
  const typeMap = registry.get(comboStr)
  if (!typeMap.has(type)) typeMap.set(type, [])
  return typeMap.get(type)
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
// bind returns an "off" function (dream ergonomics)
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

  // off() convenience
  return () => removeById(binding.id)
}

// unbind('ctrl+k') -> remove all for that combo/type
// unbind('ctrl+k', fn) -> remove only that handler
function unbind(hotkeyStr, handler) {
  const { combo, type } = parseHotkey(hotkeyStr)
  const comboStr = comboKeyFromParts(combo)
  const typeMap = registry.get(comboStr)
  if (!typeMap) return

  if (!handler) {
    // remove all handlers for combo/type
    const arr = typeMap.get(type) || []
    for (const b of arr) bindingIndex.delete(b.id)
    typeMap.delete(type)
  } else {
    const arr = typeMap.get(type)
    if (!arr?.length) return
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
// registerPlugin returns unregister function (dream ergonomics)
function registerPlugin(name, hotkeyMap) {
  if (plugins.has(name)) throw new Error(`Plugin "${name}" already registered`)
  const ids = []

  for (const [hotkeyStr, fnOrTuple] of Object.entries(hotkeyMap)) {
    // support: { 'ctrl+k': fn } OR { 'ctrl+k': [fn, options] }
    const [fn, options] = Array.isArray(fnOrTuple) ? fnOrTuple : [fnOrTuple, {}]
    const off = bind(hotkeyStr, fn, name, options)

    // capture id by reading nextId-1 is brittle; instead, store via bindingIndex in bind return?
    // We'll just store off functions indirectly by storing binding ids.
    // So: re-bind but keep id from off isn't exposed.
    // Instead: call bind and record the latest id.
    // (We can do this safely since bind increments nextId synchronously.)
    ids.push(nextId - 1)

    // if consumer wants, they can keep `off` too
    void off
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

// allow changing the listener target (handy for iframes, shadow roots, tests)
function setTarget(target) {
  defaultTarget = target
  // NOTE: we don't auto-rebind listeners here to keep it tiny; call destroy()+init() pattern if needed.
}

// --- dispatch (O(1) lookup) ---
function pickWinner(bindings) {
  // Highest priority wins; if tied, newest wins (last registered).
  // This makes "modal bind" overrides easy: register later or set higher priority.
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

    // ignore inputs unless an allowed binding is explicitly permitting it
    const fromInput = ignoreEditable && isFromInputTarget(e)

    const comboStr = comboKeyFromEvent(e)
    const typeMap = registry.get(comboStr)
    const bindings = typeMap?.get(type)
    if (!bindings?.length) return

    // filter by gates
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
  // idempotent-ish
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
  const typeMap = registry.get(comboStr)
  const bindings = typeMap?.get(actualType)
  if (!bindings?.length) return false

  // Fake minimal event shape; handlers can still read modifier flags + key.
  const e = {
    type: actualType,
    key: combo.key,
    ctrlKey: !!combo.ctrl,
    shiftKey: !!combo.shift,
    altKey: !!combo.alt,
    metaKey: !!combo.meta,
    repeat: false,
    preventDefault() {},
    stopPropagation() {},
    stopImmediatePropagation() {},
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

// Auto-init on window by default (keeps original ergonomics)
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