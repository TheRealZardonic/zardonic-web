import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import Navigation from '@/components/Navigation'

// Stub framer-motion to render plain elements so CSS classes are testable
vi.mock('framer-motion', async () => {
  const React = await import('react')

  function motionFactory(Tag: string) {
    return React.forwardRef(function MotionComponent(
      props: Record<string, unknown>,
      ref: React.Ref<HTMLElement>
    ) {
      const {
        initial: _i,
        animate: _a,
        exit: _e,
        transition: _t,
        whileTap: _w,
        variants: _v,
        ...rest
      } = props
      return React.createElement(Tag, { ...rest, ref })
    })
  }

  const motionProxy = new Proxy({} as Record<string, unknown>, {
    get(_target, prop: string) {
      return motionFactory(prop)
    },
  })

  return {
    motion: motionProxy,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

describe('Navigation fixed positioning', () => {
  it('renders the nav element with position:fixed classes', () => {
    const { container } = render(<Navigation />)
    const nav = container.querySelector('nav')
    expect(nav).not.toBeNull()
    expect(nav!.className).toContain('fixed')
  })

  it('renders the nav element pinned to the top edge (top-0)', () => {
    const { container } = render(<Navigation />)
    const nav = container.querySelector('nav')
    expect(nav!.className).toContain('top-0')
  })

  it('renders the nav element spanning the full width (left-0 right-0)', () => {
    const { container } = render(<Navigation />)
    const nav = container.querySelector('nav')
    expect(nav!.className).toContain('left-0')
    expect(nav!.className).toContain('right-0')
  })

  it('renders the nav element with a high z-index (z-50)', () => {
    const { container } = render(<Navigation />)
    const nav = container.querySelector('nav')
    expect(nav!.className).toContain('z-50')
  })

  it('does not use relative or absolute positioning on the nav', () => {
    const { container } = render(<Navigation />)
    const nav = container.querySelector('nav')
    const classes = nav!.className.split(/\s+/)
    expect(classes).not.toContain('relative')
    expect(classes).not.toContain('absolute')
    expect(classes).not.toContain('sticky')
  })

  it('contains all required fixed-positioning classes together', () => {
    const { container } = render(<Navigation />)
    const nav = container.querySelector('nav')
    const classes = nav!.className
    // All four classes must be present to guarantee the nav stays fixed at top
    for (const cls of ['fixed', 'top-0', 'left-0', 'right-0', 'z-50']) {
      expect(classes).toContain(cls)
    }
  })
})
