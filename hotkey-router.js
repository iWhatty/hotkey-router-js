// hotkey-router.js

import { on } from 'on-events'


// --- key alias map ---
const keyAliases = {
    esc: 'escape',
    space: ' ',
    enter: 'enter',
    del: 'delete',
    mod: navigator.platform.includes('Mac') ? 'meta' : 'ctrl',
}

// --- config ---
let ignoreEditable = true




// --- core parser + matcher ---
function parseHotkey(hotkeyStr) {
    const isUp = hotkeyStr.trim().toLowerCase().endsWith(' up')
    const cleanStr = isUp ? hotkeyStr.slice(0, -3).trim() : hotkeyStr
    const parts = cleanStr.toLowerCase().split('+')
    const combo = { ctrl: false, shift: false, alt: false, meta: false, key: null }
  

    for (const part of parts) {
        const actual = keyAliases[part] || part
        if (actual === 'ctrl') combo.ctrl = true
        else if (actual === 'shift') combo.shift = true
        else if (actual === 'alt') combo.alt = true
        else if (actual === 'meta') combo.meta = true
        else combo.key = actual
    }

    return { combo, type: isUp ? 'keyup' : 'keydown' }
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
function bind(hotkeyStr, handler, plugin = null) {
    const { combo, type } = parseHotkey(hotkeyStr)
    const key = comboKey(combo)
    if (!registry.has(key)) registry.set(key, new Map())
    registry.get(key).set(type, { combo, handler, plugin, raw: hotkeyStr })
  }
  
  function unbind(hotkeyStr) {
    const { combo, type } = parseHotkey(hotkeyStr)
    const key = comboKey(combo)
    const entry = registry.get(key)
    if (entry) {
      entry.delete(type)
      if (!entry.size) registry.delete(key)
    }
  }
  
// --- plugin system ---
function registerPlugin(name, hotkeyMap) {
    if (plugins.has(name)) throw new Error(`Plugin "${name}" already registered`)
    const keys = []
    for (const [hotkeyStr, fn] of Object.entries(hotkeyMap)) {
      bind(hotkeyStr, fn, name)
      const { combo, type } = parseHotkey(hotkeyStr)
      keys.push(`${comboKey(combo)}::${type}`)
    }
    plugins.set(name, keys)
  }

function unregisterPlugin(name) {
    const keys = plugins.get(name)
    if (keys) {
      for (const fullKey of keys) {
        const [comboStr, type] = fullKey.split('::')
        const entry = registry.get(comboStr)
        if (entry) {
          entry.delete(type)
          if (!entry.size) registry.delete(comboStr)
        }
      }
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

function ignoreInput(value = true) {
    ignoreEditable = !!value
}


function isFromInputTarget(e) {
    const tag = e.target.tagName
    return (
      e.target.isContentEditable ||
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      e.target.getAttribute('role') === 'textbox'
    )
  }


  // --- dual listeners via On(Events) ---
function handleEvent(type) {
    return (e) => {
      if (paused) return
      if (ignoreEditable && isFromInputTarget(e)) return
  
      for (const [comboStr, typeMap] of registry) {
        const entry = typeMap.get(type)
        if (entry && matchesHotkey(e, entry.combo)) {
          entry.handler(e)
          break
        }
      }
    }
  }
  


// --- main event listener ---
const stopDown = on(window, 'keydown', handleEvent('keydown'))
const stopUp = on(window, 'keyup', handleEvent('keyup'))


// --- optional cleanup ---
function destroy() {
    stopDown()
    stopUp()
    registry.clear()
    plugins.clear()
  }


// --- public API ---
const hotkeys = {
    bind,
    unbind,
    registerPlugin,
    unregisterPlugin,
    pause,
    resume,
    ignoreInput,
    destroy,
}


export default hotkeys
