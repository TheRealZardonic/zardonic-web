import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Stub Radix Collapsible to simple divs for testing
vi.mock('@radix-ui/react-collapsible', () => ({
  Root: ({ children, open, onOpenChange }: { children: React.ReactNode; open: boolean; onOpenChange: (o: boolean) => void }) =>
    React.createElement('div', { 'data-open': open, onClick: () => onOpenChange(!open) }, children),
  Trigger: ({ children, asChild }: { children: React.ReactNode; asChild: boolean }) =>
    asChild ? children : React.createElement('div', {}, children),
  Content: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}))

vi.mock('lucide-react', () => {
  const stub = (name: string) => ({ size: _s }: { size?: number }) =>
    React.createElement('span', { 'data-icon': name })
  return {
    LayoutDashboard: stub('LayoutDashboard'),
    FileText: stub('FileText'),
    Layers: stub('Layers'),
    Image: stub('Image'),
    Globe: stub('Globe'),
    Navigation: stub('Navigation'),
    Palette: stub('Palette'),
    Eye: stub('Eye'),
    Settings: stub('Settings'),
    Music: stub('Music'),
    Users: stub('Users'),
    Newspaper: stub('Newspaper'),
    Share2: stub('Share2'),
    ChevronDown: stub('ChevronDown'),
    ChevronRight: stub('ChevronRight'),
    Menu: stub('Menu'),
    X: stub('X'),
    LogOut: stub('LogOut'),
    Pencil: stub('Pencil'),
    SlidersHorizontal: stub('SlidersHorizontal'),
    Inbox: stub('Inbox'),
    Mail: stub('Mail'),
    Calendar: stub('Calendar'),
    HardDrive: stub('HardDrive'),
    Shield: stub('Shield'),
    InfoIcon: stub('InfoIcon'),
  }
})

// Import after mocks
const { CmsSidebar } = await import('@/cms/CmsSidebar')

describe('CmsSidebar — click interactions', () => {
  it('renders navigation links for top-level items', () => {
    const onNavigate = vi.fn()
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate,
      })
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Site Config')).toBeInTheDocument()
    expect(screen.getByText('Navigation')).toBeInTheDocument()
    expect(screen.getByText('Theme')).toBeInTheDocument()
    expect(screen.getByText('Media')).toBeInTheDocument()
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('renders content group navigation items', () => {
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate: vi.fn(),
      })
    )
    expect(screen.getByText('Hero')).toBeInTheDocument()
    expect(screen.getByText('Biography')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Releases')).toBeInTheDocument()
    expect(screen.getByText('News')).toBeInTheDocument()
    expect(screen.getByText('Social Links')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('calls onNavigate when a nav link is clicked', () => {
    const onNavigate = vi.fn()
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate,
      })
    )
    fireEvent.click(screen.getByText('Dashboard'))
    expect(onNavigate).toHaveBeenCalledWith('cms/dashboard')
  })

  it('calls onNavigate with correct route for Site-Konfiguration', () => {
    const onNavigate = vi.fn()
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate,
      })
    )
    fireEvent.click(screen.getByText('Site Config'))
    expect(onNavigate).toHaveBeenCalledWith('cms/site-config')
  })

  it('marks active route with aria-current="page"', () => {
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/content/hero',
        onNavigate: vi.fn(),
      })
    )
    const activeLink = screen.getByText('Hero').closest('button')
    expect(activeLink).toHaveAttribute('aria-current', 'page')
  })

  it('does not mark inactive links as active', () => {
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate: vi.fn(),
      })
    )
    const heroLink = screen.getByText('Hero').closest('button')
    expect(heroLink).not.toHaveAttribute('aria-current', 'page')
  })

  it('calls onLogout when logout button is clicked', () => {
    const onLogout = vi.fn()
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate: vi.fn(),
        onLogout,
      })
    )
    const logoutBtn = screen.getByLabelText(/log out/i)
    fireEvent.click(logoutBtn)
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('navigates to Hero when Hero link clicked', () => {
    const onNavigate = vi.fn()
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate,
      })
    )
    fireEvent.click(screen.getByText('Hero'))
    expect(onNavigate).toHaveBeenCalledWith('cms/content/hero')
  })

  it('navigates to releases when Releases link clicked', () => {
    const onNavigate = vi.fn()
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate,
      })
    )
    fireEvent.click(screen.getByText('Releases'))
    expect(onNavigate).toHaveBeenCalledWith('cms/content/releases')
  })

  it('navigates to Media when Media link clicked', () => {
    const onNavigate = vi.fn()
    render(
      React.createElement(CmsSidebar, {
        currentRoute: 'cms/dashboard',
        onNavigate,
      })
    )
    fireEvent.click(screen.getByText('Media'))
    expect(onNavigate).toHaveBeenCalledWith('cms/media')
  })
})
