# hotkey-router

**Plugin-first keyboard shortcut router for the modern web.**  
Register hotkeys declaratively, group them by plugin/module, and control routing — with `keydown` and `keyup` support.

---

## Features

- `bind('ctrl+k', fn)` — bind keydown events
- `bind('ctrl+p up', fn)` — bind `keyup` events with `" up"` suffix
- `registerPlugin(name, map)` — group hotkeys by plugin/module
- `pause()` / `resume()` — temporarily suspend all hotkeys
- `ignoreInput(true)` — prevent hotkeys from triggering inside inputs
- `destroy()` — clean teardown
- Tiny (<2.5KB), modern, and dependency-free

---

## Install

```bash
npm install hotkey-router
```

Or use via CDN:

```js
import hotkeys from 'https://cdn.skypack.dev/hotkey-router'
```

---

## Basic Usage

```js
import hotkeys from 'hotkey-router'

hotkeys.bind('ctrl+k', () => {
  console.log('Command palette')
})

hotkeys.bind('ctrl+p up', () => {
  console.log('Released CTRL+P')
})

hotkeys.registerPlugin('docs', {
  'ctrl+f': () => console.log('Find'),
  'escape': () => console.log('Cancel'),
  'ctrl+shift+s up': () => console.log('Released save combo')
})
```

---

## API

### `hotkeys.bind(hotkey: string, handler: function, plugin?: string)`

Register a global hotkey.  
Suffix `" up"` to bind to `keyup` instead of `keydown`.

- `hotkeys.bind('ctrl+k', fn)` → keydown
- `hotkeys.bind('ctrl+k up', fn)` → keyup

---

### `hotkeys.unbind(hotkey: string)`

Unbind a previously registered shortcut.

---

### `hotkeys.registerPlugin(name: string, map: { [hotkey]: fn })`

Batch register hotkeys under a plugin namespace.

```js
hotkeys.registerPlugin('nav', {
  'ctrl+1': () => switchTab(1),
  'ctrl+2 up': () => console.log('Tab 2 released')
})
```

---

### `hotkeys.unregisterPlugin(name: string)`

Remove all hotkeys associated with a plugin.

---

### `hotkeys.pause()` / `hotkeys.resume()`

Temporarily disable or re-enable all hotkey handling.

---

### `hotkeys.ignoreInput(boolean = true)`

Prevents hotkeys from firing while user is typing inside:

- `<input>`
- `<textarea>`
- `[contenteditable]`
- Elements with `role="textbox"`

This is enabled by default.

---

### `hotkeys.destroy()`

Removes all hotkeys and internal event listeners.  
Useful for single-page apps or dynamic cleanup.

---

## Supported Keys & Aliases

| Shorthand | Mapped To   |
|-----------|-------------|
| `esc`     | `escape`    |
| `space`   | `' '`       |
| `del`     | `delete`    |
| `mod`     | `meta` on macOS, `ctrl` otherwise |

All keys are case-insensitive. For example, `'A'` and `'a'` both match `'a'`.

---

## Browser Support

Modern browsers: Chrome, Firefox, Safari, Edge.  
Requires `KeyboardEvent.key`, `Map`, and `addEventListener`.

---

## License

MIT © J W
