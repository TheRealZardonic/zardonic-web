import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('lucide-react', () => {
  const stub = (name: string) => () => React.createElement('span', { 'data-icon': name })
  return {
    CheckCircle: stub('CheckCircle'),
    Clock: stub('Clock'),
    AlertCircle: stub('AlertCircle'),
  }
})

const { CmsLayout } = await import('@/cms/CmsLayout')

describe('CmsLayout — breadcrumb and status badge', () => {
  it('renders CMS breadcrumb root button', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/dashboard',
        onNavigate: vi.fn(),
        publishStatus: 'unknown',
      }, React.createElement('div', {}, 'Content'))
    )
    expect(screen.getByLabelText('Zum Dashboard')).toBeInTheDocument()
  })

  it('shows route breadcrumb for non-dashboard routes', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/content/hero',
        onNavigate: vi.fn(),
      }, React.createElement('div', {}, 'Hero Editor'))
    )
    expect(screen.getByText('Inhalte › Hero')).toBeInTheDocument()
  })

  it('hides route breadcrumb on dashboard route', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/dashboard',
        onNavigate: vi.fn(),
      }, React.createElement('div', {}, 'Dashboard'))
    )
    // The breadcrumb separator should not be present for dashboard
    expect(screen.queryByText('Dashboard', { selector: '[aria-current="page"]' })).toBeNull()
  })

  it('navigates to dashboard when CMS breadcrumb is clicked', () => {
    const onNavigate = vi.fn()
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/content/hero',
        onNavigate,
      }, React.createElement('div', {}, 'Hero'))
    )
    fireEvent.click(screen.getByLabelText('Zum Dashboard'))
    expect(onNavigate).toHaveBeenCalledWith('cms/dashboard')
  })

  it('renders children content', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/dashboard',
        onNavigate: vi.fn(),
      }, React.createElement('div', { 'data-testid': 'child-content' }, 'Hello World'))
    )
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
    expect(screen.getByText('Hello World')).toBeInTheDocument()
  })

  it('shows published status badge when status is published', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/content/hero',
        onNavigate: vi.fn(),
        publishStatus: 'published',
      }, React.createElement('div', {}, 'x'))
    )
    expect(screen.getByText('Veröffentlicht')).toBeInTheDocument()
  })

  it('shows draft status badge when status is draft', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/content/hero',
        onNavigate: vi.fn(),
        publishStatus: 'draft',
      }, React.createElement('div', {}, 'x'))
    )
    expect(screen.getByText('Entwurf')).toBeInTheDocument()
  })

  it('shows autosaved status badge when status is autosaved', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/content/hero',
        onNavigate: vi.fn(),
        publishStatus: 'autosaved',
      }, React.createElement('div', {}, 'x'))
    )
    expect(screen.getByText('Auto-gespeichert')).toBeInTheDocument()
  })

  it('shows loading skeleton when isTransitioning is true', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/content/hero',
        onNavigate: vi.fn(),
        isTransitioning: true,
      }, React.createElement('div', { 'data-testid': 'child' }, 'Hidden'))
    )
    // Child should not be shown during transition, skeleton is shown
    expect(screen.queryByTestId('child')).not.toBeInTheDocument()
  })

  it('shows correct breadcrumb for site-config route', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/site-config',
        onNavigate: vi.fn(),
      }, React.createElement('div', {}, 'x'))
    )
    expect(screen.getByText('Site-Konfiguration')).toBeInTheDocument()
  })

  it('shows correct breadcrumb for media route', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/media',
        onNavigate: vi.fn(),
      }, React.createElement('div', {}, 'x'))
    )
    expect(screen.getByText('Medienbibliothek')).toBeInTheDocument()
  })

  it('main content area has correct id for accessibility', () => {
    render(
      React.createElement(CmsLayout, {
        currentRoute: 'cms/dashboard',
        onNavigate: vi.fn(),
      }, React.createElement('div', {}, 'x'))
    )
    expect(document.getElementById('cms-main-content')).toBeInTheDocument()
  })
})
