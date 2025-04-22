# hotkey-router

**Plugin-first keyboard shortcut router for the modern web.**  
Register hotkeys declaratively, group them by plugin/module, and control routing — with zero dependencies.

---

## Features

- `bind('ctrl+k', fn)` – register a global shortcut
- `registerPlugin('name', { 'shift+a': fn })` – scoped plugin bindings
- `pause()` / `resume()` – temporary hotkey suppression
- `unregisterPlugin('name')` – clean plugin teardown
- < 2KB, no dependencies, works in all modern browsers

---

## Install

```bash
npm install hotkey-router
```

Or load via CDN (ESM):

```js
import hotkeys from 'https://cdn.skypack.dev/hotkey-router'
```

---

## Basic Usage

```js
import hotkeys from 'hotkey-router'

// Bind a global shortcut
hotkeys.bind('ctrl+k', () => {
  console.log('Open Command Palette')
})

// Register hotkeys via plugin
hotkeys.registerPlugin('file-browser', {
  'ctrl+o': () => console.log('Open file'),
  'ctrl+d': () => console.log('Delete file')
})

// Temporarily pause all hotkeys
hotkeys.pause()

// Resume listening
hotkeys.resume()

// Remove a plugin's hotkeys
hotkeys.unregisterPlugin('file-browser')
```

---

## API

### `hotkeys.bind(hotkey: string, handler: fn, plugin?: string)`

Bind a keyboard shortcut directly. You can optionally associate it with a plugin for grouping.

---

### `hotkeys.unbind(hotkey: string)`

Remove a previously bound hotkey by its string (e.g. `'ctrl+k'`).

---

### `hotkeys.registerPlugin(name: string, keyMap: { [hotkey]: fn })`

Register multiple hotkeys under a plugin name. Enables easy scoping, teardown, and overrides.

---

### `hotkeys.unregisterPlugin(name: string)`

Remove all hotkeys associated with a given plugin.

---

### `hotkeys.pause()` / `hotkeys.resume()`

Temporarily stop hotkeys from firing (e.g. when focus is inside a text input or modal).

---

### (Optional) `hotkeys.destroy()`

Remove all hotkeys and the internal event listener — useful for full teardown in SPA or widget environments.

---

## Example Combos

```js
hotkeys.bind('ctrl+shift+x', () => ...)
hotkeys.bind('meta+s', () => ...)      // Mac ⌘+S
hotkeys.bind('alt+enter', () => ...)
hotkeys.bind('esc', () => ...)
```

---

## Limitations

- Only listens to `keydown` events
- Keys are compared case-insensitively
- Does not handle IME or input focus context (yet)

---

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge).  
Requires `KeyboardEvent.key`, `addEventListener`, and `Map`.

---

## License

MIT © J W
