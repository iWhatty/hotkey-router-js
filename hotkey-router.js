// --- core parser + matcher ---
function parseHotkey(hotkey) {
    const parts = hotkey.toLowerCase().split('+')
    const combo = {
      ctrl: false,
      shift: false,
      alt: false,
      meta: false,
      key: null,
    }
  
    for (const part of parts) {
      if (part === 'ctrl') combo.ctrl = true
      else if (part === 'shift') combo.shift = true
      else if (part === 'alt') combo.alt = true
      else if (part === 'meta' || part === 'cmd') combo.meta = true
      else combo.key = part
    }
  
    return combo
  }
  
  function matchesHotkey(event, combo) {
    return (
      event.ctrlKey === !!combo.ctrl &&
      event.shiftKey === !!combo.shift &&
      event.altKey === !!combo.alt &&
      event.metaKey === !!combo.meta &&
      event.key.toLowerCase() === combo.key
    )
  }
  
  // --- state ---
  const registry = new Map() // { comboKey -> { plugin, handler, raw } }
  const plugins = new Map()  // pluginName -> [comboKeys]
  let paused = false
  
  // --- utils ---
  function comboKey(combo) {
    return [
      combo.ctrl ? 'ctrl' : '',
      combo.shift ? 'shift' : '',
      combo.alt ? 'alt' : '',
      combo.meta ? 'meta' : '',
      combo.key
    ].filter(Boolean).join('+')
  }
  
  // --- binding engine ---
  function bind(hotkey, handler, plugin = null) {
    const combo = parseHotkey(hotkey)
    const key = comboKey(combo)
    registry.set(key, { combo, handler, plugin, raw: hotkey })
  }
  
  function unbind(hotkey) {
    const combo = parseHotkey(hotkey)
    registry.delete(comboKey(combo))
  }
  
  // --- plugin system ---
  function registerPlugin(name, hotkeyMap) {
    if (plugins.has(name)) throw new Error(`Plugin "${name}" already registered`)
    const entries = Object.entries(hotkeyMap)
    for (const [hotkey, fn] of entries) bind(hotkey, fn, name)
    plugins.set(name, entries.map(([hotkey]) => comboKey(parseHotkey(hotkey))))
  }
  
  function unregisterPlugin(name) {
    const keys = plugins.get(name)
    if (keys) {
      for (const key of keys) registry.delete(key)
      plugins.delete(name)
    }
  }
  
  // --- control ---
  function pause() {
    paused = true
  }
  function resume() {
    paused = false
  }
  
  // --- main event listener ---
  window.addEventListener('keydown', (e) => {
    if (paused) return
  
    for (const [key, { combo, handler }] of registry) {
      if (matchesHotkey(e, combo)) {
        handler(e)
        break
      }
    }
  })
  
  // --- export API ---
  const hotkeys = {
    bind,
    unbind,
    registerPlugin,
    unregisterPlugin,
    pause,
    resume
  }
  
  export default hotkeys
  