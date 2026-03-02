# hotkey-router

[![npm version](https://img.shields.io/npm/v/hotkey-router.svg)](https://www.npmjs.com/package/hotkey-router)
[![bundle size](https://img.shields.io/bundlephobia/minzip/hotkey-router)](https://bundlephobia.com/package/hotkey-router)
[![GitHub stars](https://img.shields.io/github/stars/iWhatty/hotkey-router-js?style=social)](https://github.com/iWhatty/hotkey-router-js)

**A tiny, deterministic keyboard routing engine for modern web apps.**

Hotkey Router is not a key utility.
It is a predictable, plugin-first routing layer for keyboard shortcuts.

* ⚡ O(1) dispatch
* 🧩 Plugin-safe lifecycle management
* 🎯 Deterministic winner selection (priority + recency)
* 🛑 Input-safe by default
* 🧪 Testable via `trigger()`
* 📦 4.9 kB minified
* 🗜  2.2 kB minified + gzipped
* 🚫 Zero dependencies

---

## Philosophy

Hotkey Router follows three core rules:

1. **Predictable routing** — Highest priority wins. Ties go to the most recently bound handler.
2. **Safe composition** — Plugins can register and unregister without affecting others.
3. **Modern only** — Built for modern browsers using `KeyboardEvent.key`.

No keycodes. No legacy IE hacks. No hidden global scope state.

---

## Install

```bash
npm install hotkey-router
```

### ESM

```js
import hotkeys from 'hotkey-router'
```

### CommonJS

```js
const hotkeys = require('hotkey-router')
```

### CDN (ESM)

```js
import hotkeys from 'https://cdn.jsdelivr.net/npm/hotkey-router/dist/hotkey-router.min.js'
```

---

# Basic Usage

```js
import hotkeys from 'hotkey-router'

// Simple keydown
hotkeys.bind('ctrl+k', () => {
  openCommandPalette()
})

// Keyup using " up" suffix
hotkeys.bind('ctrl+p up', () => {
  console.log('Released CTRL+P')
})

// AHK-style modifiers also supported
hotkeys.bind('^k', () => {
  openCommandPalette() // ctrl+k
})

// Plugin grouping
hotkeys.registerPlugin('docs', {
  'ctrl+f': openSearch,
  'escape': closeSearch,
})
```

---

# Routing Model

When multiple handlers match the same hotkey:

1. Highest `priority` wins
2. If equal priority → newest binding wins

This makes modal overrides simple:

```js
hotkeys.bind('escape', closeModal, null, {
  priority: 100,
  preventDefault: true,
})
```

---

# API

## `bind(hotkey, handler, plugin?, options?)`

Register a hotkey.

Returns an `off()` function.

```js
const off = hotkeys.bind('mod+k', openPalette)

// Later
off()
```

### Options

```ts
{
  preventDefault?: boolean
  stopPropagation?: boolean
  stopImmediatePropagation?: boolean
  repeat?: boolean        // default false on keydown
  once?: boolean
  when?: (event) => boolean
  allowIn?: (event) => boolean
  priority?: number       // default 0
}
```

### Examples

Ignore repeat keydown (default behavior):

```js
hotkeys.bind('j', nextItem)
```

Allow inside inputs:

```js
hotkeys.bind('mod+k', openPalette, null, {
  allowIn: () => true,
  preventDefault: true,
})
```

Conditional binding:

```js
hotkeys.bind('delete', deleteItem, null, {
  when: () => selectionCount() > 0,
})
```

Run once:

```js
hotkeys.bind('ctrl+s', saveDraft, null, { once: true })
```

---

## `unbind(hotkey, handler?)`

Remove bindings.

```js
hotkeys.unbind('ctrl+k')
hotkeys.unbind('ctrl+k', openPalette)
```

---

## `registerPlugin(name, map)`

Batch register hotkeys under a plugin namespace.

```js
const unregister = hotkeys.registerPlugin('files', {
  'mod+o': openFile,
  'delete': deleteFile,
})

// Later
unregister()
```

Plugin cleanup is isolated — removing one plugin never affects other bindings.

---

## `unregisterPlugin(name)`

Remove all hotkeys associated with a plugin.

---

## `pause()` / `resume()`

Temporarily disable or re-enable all routing.

---

## `ignoreInput(boolean = true)`

By default, hotkeys do **not** fire inside:

* `<input>`
* `<textarea>`
* `<select>`
* `[contenteditable]`
* `role="textbox"`

Override per-binding with `allowIn()`.

---

## `init(options?)`

Manually attach listeners.

```js
hotkeys.init({
  target: window,
  capture: false,
})
```

Auto-initializes on `window` by default (browser environments).

---

## `destroy()`

Removes all listeners and clears internal state.

---

## `trigger(hotkey, options?)`

Programmatically trigger a hotkey.
Useful for testing.

```js
hotkeys.trigger('ctrl+k')
```

Returns `true` if a handler ran.

---

# Supported Syntax

## Standard

* `ctrl+k`
* `shift+a`
* `ctrl+k up`
* `mod+s` (meta on macOS, ctrl elsewhere)
* `ctrl++` or `ctrl+plus`

## AHK-Style Prefix Modifiers

* `^k` → `ctrl+k`
* `!k` → `alt+k`
* `+k` → `shift+k`
* `#k` → `meta+k`
* `^!k` → `ctrl+alt+k`

Modifiers must appear before the base key.

## Aliases Supported

### Modifiers

* `ctrl`, `control`, `⌃`
* `shift`, `⇧`, `+`
* `alt`, `option`, `⌥`, `!`
* `meta`, `cmd`, `command`, `win`, `⌘`, `#`
* `mod` (meta on macOS, ctrl elsewhere)

### Navigation / Special Keys

* `escape`, `esc`
* `enter`, `return`
* `space`
* `tab`
* `backspace`
* `delete`, `del`
* `home`, `end`
* `pageup`, `pgup`
* `pagedown`, `pgdn`
* `up`, `down`, `left`, `right`
* `f1`–`f19`

Keys are case-insensitive.

---

# What This Is Not

* Not a keycode polyfill
* Not a legacy browser shim
* Not a global scope manager
* Not a VSCode-style sequence engine

This is a small, deterministic routing layer for modern applications.

---

# Browser Support

Modern browsers supporting:

* `KeyboardEvent.key`
* `Map`
* `addEventListener`

Chrome, Firefox, Safari, Edge.

---

# License

See LICENSE file for details.
