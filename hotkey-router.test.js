import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import hotkeys from './hotkey-router'

describe('hotkey-router', () => {
  let log

  beforeEach(() => {
    log = vi.fn()
    hotkeys.resume()
    hotkeys.ignoreInput(true)
  })

  afterEach(() => {
    hotkeys.destroy()
  })

  const dispatch = (type, key, opts = {}) => {
    const event = new KeyboardEvent(type, { key, ...opts, bubbles: true })
    document.dispatchEvent(event)
  }

  it('binds a keydown hotkey', () => {
    hotkeys.bind('ctrl+k', log)
    dispatch('keydown', 'k', { ctrlKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('binds a keyup hotkey', () => {
    hotkeys.bind('ctrl+k up', log)
    dispatch('keyup', 'k', { ctrlKey: true })
    expect(log).toHaveBeenCalledOnce()
  })

  it('ignores wrong modifiers', () => {
    hotkeys.bind('ctrl+k', log)
    dispatch('keydown', 'k') // missing ctrl
    expect(log).not.toHaveBeenCalled()
  })

  it('binds multiple hotkeys with plugin', () => {
    hotkeys.registerPlugin('demo', {
      'alt+1': log,
      'alt+2 up': log
    })
    dispatch('keydown', '1', { altKey: true })
    dispatch('keyup', '2', { altKey: true })
    expect(log).toHaveBeenCalledTimes(2)
  })

  it('unregisters plugin correctly', () => {
    hotkeys.registerPlugin('demo', { 'alt+x': log })
    hotkeys.unregisterPlugin('demo')
    dispatch('keydown', 'x', { altKey: true })
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
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true
    }))

    expect(log).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it('can disable input blocking', () => {
    const input = document.createElement('textarea')
    document.body.appendChild(input)
    hotkeys.ignoreInput(false)
    hotkeys.bind('ctrl+a', log)

    input.focus()
    input.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: true,
      bubbles: true
    }))

    expect(log).toHaveBeenCalledOnce()
    document.body.removeChild(input)
  })
})
