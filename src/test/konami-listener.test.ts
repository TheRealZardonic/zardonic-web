import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { createElement } from 'react'
import KonamiListener, { DEFAULT_KONAMI_CODE } from '@/components/KonamiListener'

function fireKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

describe('KonamiListener', () => {
  it('exports the default Konami code sequence', () => {
    expect(DEFAULT_KONAMI_CODE).toEqual([
      'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
      'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
      'b', 'a',
    ])
  })

  it('fires onCodeActivated when default Konami code is entered', () => {
    const onActivated = vi.fn()
    render(createElement(KonamiListener, { onCodeActivated: onActivated }))

    act(() => {
      for (const key of DEFAULT_KONAMI_CODE) {
        fireKey(key)
      }
    })

    expect(onActivated).toHaveBeenCalledTimes(1)
  })

  it('does not fire on incomplete sequence', () => {
    const onActivated = vi.fn()
    render(createElement(KonamiListener, { onCodeActivated: onActivated }))

    act(() => {
      fireKey('ArrowUp')
      fireKey('ArrowUp')
      fireKey('ArrowDown')
    })

    expect(onActivated).not.toHaveBeenCalled()
  })

  it('fires onCodeActivated when a custom code is entered', () => {
    const onActivated = vi.fn()
    const customCode = ['a', 'b', 'c']
    render(createElement(KonamiListener, { onCodeActivated: onActivated, customCode }))

    act(() => {
      fireKey('a')
      fireKey('b')
      fireKey('c')
    })

    expect(onActivated).toHaveBeenCalledTimes(1)
  })

  it('does not fire default code when custom code is set', () => {
    const onActivated = vi.fn()
    const customCode = ['x', 'y']
    render(createElement(KonamiListener, { onCodeActivated: onActivated, customCode }))

    act(() => {
      for (const key of DEFAULT_KONAMI_CODE) {
        fireKey(key)
      }
    })

    expect(onActivated).not.toHaveBeenCalled()
  })

  it('resets sequence on wrong key', () => {
    const onActivated = vi.fn()
    const customCode = ['a', 'b', 'c']
    render(createElement(KonamiListener, { onCodeActivated: onActivated, customCode }))

    act(() => {
      fireKey('a')
      fireKey('b')
      fireKey('x') // wrong key
      fireKey('c') // not from start, should not complete
    })

    expect(onActivated).not.toHaveBeenCalled()
  })

  it('falls back to default code when customCode is empty array', () => {
    const onActivated = vi.fn()
    render(createElement(KonamiListener, { onCodeActivated: onActivated, customCode: [] }))

    act(() => {
      for (const key of DEFAULT_KONAMI_CODE) {
        fireKey(key)
      }
    })

    expect(onActivated).toHaveBeenCalledTimes(1)
  })
})
