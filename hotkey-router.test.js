// hotkey-router.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import hotkeys from './hotkey-router'

describe('hotkey-router', () => {
  let log

  const dispatch = (type, key, opts = {}) => {
    // Dispatch on window because hotkey-router binds to `window` by default.
    const event = new KeyboardEvent(type, { key, ...opts, bubbles: true })
    window.dispatchEvent(event)
  }

  beforeEach(() => {
    log = vi.fn()

    // Ensure a clean slate and listeners are attached for every test.
    // (hotkeys.destroy() removes listeners + clears state)
    hotkeys.destroy()
    hotkeys.init({ target: window, capture: false })

    hotkeys.resume()
    hotkeys.ignoreInput(true)
  })

  afterEach(() => {
    hotkeys.destroy()
  })

  it('binds a keydown hotkey', () => {
    hotkeys.bind('ctrl+k', log)
    dispatch('keydown', 'k', { ctrlKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('binds a keyup hotkey with " up" suffix', () => {
    hotkeys.bind('ctrl+k up', log)
    dispatch('keyup', 'k', { ctrlKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('ignores wrong modifiers', () => {
    hotkeys.bind('ctrl+k', log)
    dispatch('keydown', 'k') // missing ctrl
    expect(log).not.toHaveBeenCalled()
  })

  it('registerPlugin binds multiple hotkeys and returned unregister cleans them up', () => {
    const unregister = hotkeys.registerPlugin('demo', {
      'alt+1': log,
      'alt+2 up': log,
    })

    dispatch('keydown', '1', { altKey: true })
    dispatch('keyup', '2', { altKey: true })
    expect(log).toHaveBeenCalledTimes(2)

    unregister()
    dispatch('keydown', '1', { altKey: true })
    expect(log).toHaveBeenCalledTimes(2)
  })

  it('unregisterPlugin(name) removes plugin bindings without touching others', () => {
    hotkeys.registerPlugin('demo', { 'alt+x': log })
    hotkeys.bind('alt+x', () => { }) // non-plugin binding on same hotkey

    hotkeys.unregisterPlugin('demo')
    dispatch('keydown', 'x', { altKey: true })

    // Should have fired the non-plugin binding, not the plugin log
    expect(log).not.toHaveBeenCalled()
  })

  it('can pause and resume', () => {
    hotkeys.bind('ctrl+x', log)
    hotkeys.pause()

    dispatch('keydown', 'x', { ctrlKey: true })
    expect(log).not.toHaveBeenCalled()

    hotkeys.resume()
    dispatch('keydown', 'x', { ctrlKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('blocks events inside inputs by default', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    hotkeys.bind('ctrl+a', log)
    input.focus()

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })
    )

    expect(log).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('ignoreInput(false) allows events inside inputs', () => {
    const input = document.createElement('textarea')
    document.body.appendChild(input)

    hotkeys.ignoreInput(false)
    hotkeys.bind('ctrl+a', log)
    input.focus()

    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })
    )

    expect(log).toHaveBeenCalledOnce()
    document.body.removeChild(input)
  })

  it('allowIn() overrides input blocking per-binding', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    hotkeys.bind('ctrl+k', log, null, {
      allowIn: () => true,
    })

    input.focus()
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })
    )

    expect(log).toHaveBeenCalledOnce()
    document.body.removeChild(input)
  })

  it('when() gates a binding', () => {
    let enabled = false

    hotkeys.bind('ctrl+d', log, null, {
      when: () => enabled,
    })

    dispatch('keydown', 'd', { ctrlKey: true })
    expect(log).not.toHaveBeenCalled()

    enabled = true
    dispatch('keydown', 'd', { ctrlKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('once removes the binding after first run', () => {
    hotkeys.bind('ctrl+s', log, null, { once: true })

    dispatch('keydown', 's', { ctrlKey: true })
    dispatch('keydown', 's', { ctrlKey: true })

    expect(log).toHaveBeenCalledTimes(1)
  })

  it('priority chooses the highest priority handler', () => {
    const low = vi.fn()
    const high = vi.fn()

    hotkeys.bind('escape', low, null, { priority: 0 })
    hotkeys.bind('escape', high, null, { priority: 100 })

    dispatch('keydown', 'Escape')
    expect(high).toHaveBeenCalledOnce()
    expect(low).not.toHaveBeenCalled()
  })

  it('ties in priority go to newest binding', () => {
    const first = vi.fn()
    const second = vi.fn()

    hotkeys.bind('escape', first, null, { priority: 10 })
    hotkeys.bind('escape', second, null, { priority: 10 })

    dispatch('keydown', 'Escape')
    expect(second).toHaveBeenCalledOnce()
    expect(first).not.toHaveBeenCalled()
  })

  it('keydown ignores auto-repeat by default', () => {
    hotkeys.bind('j', log)

    dispatch('keydown', 'j', { repeat: true })
    expect(log).not.toHaveBeenCalled()

    dispatch('keydown', 'j', { repeat: false })
    expect(log).toHaveBeenCalledOnce()
  })

  it('repeat: true allows repeated keydown events', () => {
    hotkeys.bind('j', log, null, { repeat: true })

    dispatch('keydown', 'j', { repeat: true })
    dispatch('keydown', 'j', { repeat: true })
    expect(log).toHaveBeenCalledTimes(2)
  })

  it('supports AHK-style modifiers: ^k == ctrl+k', () => {
    hotkeys.bind('^k', log)
    dispatch('keydown', 'k', { ctrlKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('supports AHK-style modifiers: ^!k == ctrl+alt+k', () => {
    hotkeys.bind('^!k', log)
    dispatch('keydown', 'k', { ctrlKey: true, altKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('enforces modifier-first ordering (k+ctrl throws)', () => {
    expect(() => hotkeys.bind('k+ctrl', log)).toThrow()
  })

  it('trigger() runs the handler and returns true', () => {
    hotkeys.bind('ctrl+k', log)
    const ran = hotkeys.trigger('ctrl+k')
    expect(ran).toBe(true)
    expect(log).toHaveBeenCalledOnce()
  })

  it('trigger() returns false when no binding matches', () => {
    const ran = hotkeys.trigger('ctrl+q')
    expect(ran).toBe(false)
  })
})