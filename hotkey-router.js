// hotkey-router.js


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
        const actual = keyAliases[part] || part
        if (actual === 'ctrl') combo.ctrl = true
        else if (actual === 'shift') combo.shift = true
        else if (actual === 'alt') combo.alt = true
        else if (actual === 'meta') combo.meta = true
        else combo.key = actual
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
    const keys = []
    for (const [hotkey, fn] of entries) {
        bind(hotkey, fn, name)
        keys.push(comboKey(parseHotkey(hotkey)))
    }
    plugins.set(name, keys)
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

function ignoreInput(value = true) {
    ignoreEditable = !!value
}

// --- main event listener ---
window.addEventListener('keydown', (e) => {
    if (paused) return

    if (ignoreEditable) {
        const tag = e.target.tagName
        const editable = (
            e.target.isContentEditable ||
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            e.target.getAttribute('role') === 'textbox'
        )
        if (editable) return
    }

    for (const [_, { combo, handler }] of registry) {
        if (matchesHotkey(e, combo)) {
            handler(e)
            break
        }
    }
})



// --- optional cleanup ---
function destroy() {
    stopGlobal()
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
