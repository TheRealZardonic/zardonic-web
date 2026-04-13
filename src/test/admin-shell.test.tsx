/**
 * Tests for Phase 2: Unified Admin Shell components
 *
 * Covers:
 *   - SchemaIcon  — dynamic icon renderer
 *   - AdminDashboard — section overview with search
 *   - LivePreviewPane — preview pane with device toggle
 *   - AdminSectionEditor — schema-driven editor (section-not-found guard)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ─── Mock the CMS content hook so tests don't need a running API ─────────────
vi.mock('@/cms/hooks/useCmsContent', () => ({
  useCmsContent: () => ({
    data: null,
    isDraft: false,
    isLoading: false,
    error: null,
    save: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    revert: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/cms/hooks/useAutoSave', () => ({
  useAutoSave: () => ({ lastSaved: null, isSaving: false, hasPendingChanges: false }),
}))

vi.mock('@/cms/hooks/useUnsavedChanges', () => ({
  useUnsavedChanges: () => undefined,
}))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { SchemaIcon } from '@/cms/components/SchemaIcon'
import { AdminDashboard } from '@/cms/components/AdminDashboard'
import { LivePreviewPane } from '@/cms/components/LivePreviewPane'
import { AdminSectionEditor } from '@/cms/components/AdminSectionEditor'
import {
  registerAdminSection,
  _clearRegistryForTesting,
} from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'

// ─── SchemaIcon ───────────────────────────────────────────────────────────────

describe('SchemaIcon', () => {
  it('renders a known icon (House) without crashing', () => {
    const { container } = render(<SchemaIcon iconName="House" size={20} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('falls back to Question icon for unknown icon names', () => {
    const { container } = render(<SchemaIcon iconName="NonExistentIcon" size={16} />)
    // Renders something (the fallback Question icon) rather than nothing
    expect(container.firstChild).toBeTruthy()
  })

  it('accepts a custom className', () => {
    const { container } = render(
      <SchemaIcon iconName="House" size={16} className="text-red-500" />,
    )
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('class')).toContain('text-red-500')
  })

  it('renders all 15 schema icons without error', () => {
    const schemaIcons = [
      'House', 'BookOpen', 'MusicNote', 'Disc', 'CalendarBlank',
      'Video', 'ShareNetwork', 'Envelope', 'Images', 'UsersThree',
      'Star', 'Trophy', 'Terminal', 'Rows', 'Scales',
    ]
    for (const iconName of schemaIcons) {
      const { container } = render(<SchemaIcon iconName={iconName} />)
      expect(container.firstChild).toBeTruthy()
    }
  })
})

// ─── AdminDashboard ───────────────────────────────────────────────────────────

describe('AdminDashboard', () => {
  const mockSchema: AdminSectionSchema = {
    sectionId: 'test-section',
    label: 'Test Section',
    icon: 'House',
    description: 'A test section for unit testing.',
    fields: [{ key: 'foo', type: 'text', label: 'Foo' }],
    supportsPreview: true,
    getDefaultData: () => ({ foo: '' }),
  }

  beforeEach(() => {
    _clearRegistryForTesting()
    registerAdminSection(mockSchema)
  })

  afterEach(() => {
    _clearRegistryForTesting()
  })

  it('renders the dashboard heading', () => {
    render(<AdminDashboard onNavigate={vi.fn()} />)
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
  })

  it('renders a search input', () => {
    render(<AdminDashboard onNavigate={vi.fn()} />)
    const searchInput = screen.getByRole('searchbox')
    expect(searchInput).toBeInTheDocument()
  })

  it('renders a section card for each registered schema', () => {
    render(<AdminDashboard onNavigate={vi.fn()} />)
    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.getByText('A test section for unit testing.')).toBeInTheDocument()
  })

  it('filters sections when search query is entered', () => {
    const secondSchema: AdminSectionSchema = {
      ...mockSchema,
      sectionId: 'another-section',
      label: 'Another Section',
      description: 'Another description.',
    }
    registerAdminSection(secondSchema)

    render(<AdminDashboard onNavigate={vi.fn()} />)
    const searchInput = screen.getByRole('searchbox')

    fireEvent.change(searchInput, { target: { value: 'Test' } })

    expect(screen.getByText('Test Section')).toBeInTheDocument()
    expect(screen.queryByText('Another Section')).not.toBeInTheDocument()
  })

  it('shows "no sections match" message when search has no results', () => {
    render(<AdminDashboard onNavigate={vi.fn()} />)
    const searchInput = screen.getByRole('searchbox')

    fireEvent.change(searchInput, { target: { value: 'xyzzy-does-not-match' } })

    expect(screen.getByText(/No sections match/i)).toBeInTheDocument()
  })

  it('calls onNavigate with sectionId when card is clicked', () => {
    const onNavigate = vi.fn()
    render(<AdminDashboard onNavigate={onNavigate} />)

    const editButton = screen.getByRole('button', { name: /edit test section/i })
    fireEvent.click(editButton)

    expect(onNavigate).toHaveBeenCalledWith('test-section')
  })

  it('shows Preview badge when supportsPreview is true', () => {
    render(<AdminDashboard onNavigate={vi.fn()} />)
    expect(screen.getByText('Preview')).toBeInTheDocument()
  })

  it('shows field count badge', () => {
    render(<AdminDashboard onNavigate={vi.fn()} />)
    expect(screen.getByText('1 field')).toBeInTheDocument()
  })

  it('shows field count badge for multiple fields', () => {
    const multiFieldSchema: AdminSectionSchema = {
      sectionId: 'multi-field',
      label: 'Multi Field Section',
      icon: 'House',
      description: 'Has multiple fields.',
      fields: [
        { key: 'foo', type: 'text', label: 'Foo' },
        { key: 'bar', type: 'text', label: 'Bar' },
      ],
      supportsPreview: false,
      getDefaultData: () => ({ foo: '', bar: '' }),
    }
    registerAdminSection(multiFieldSchema)

    render(<AdminDashboard onNavigate={vi.fn()} />)

    expect(screen.getByText('2 fields')).toBeInTheDocument()
  })
})

// ─── LivePreviewPane ──────────────────────────────────────────────────────────

describe('LivePreviewPane', () => {
  it('renders device toggle buttons when supportsPreview is true', () => {
    render(
      <LivePreviewPane sectionId="hero" supportsPreview={true} />,
    )
    expect(screen.getByRole('button', { name: /preview at desktop width/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /preview at tablet width/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /preview at mobile width/i })).toBeInTheDocument()
  })

  it('renders "Preview not available" when supportsPreview is false', () => {
    render(
      <LivePreviewPane sectionId="gigs" supportsPreview={false} />,
    )
    expect(screen.getByText('Preview not available')).toBeInTheDocument()
    expect(screen.getByText(/This section does not support live preview/i)).toBeInTheDocument()
  })

  it('still renders the toolbar when supportsPreview is false', () => {
    render(
      <LivePreviewPane sectionId="gigs" supportsPreview={false} />,
    )
    // Device toggles still present (toolbar is always rendered)
    expect(screen.getByRole('button', { name: /preview at desktop width/i })).toBeInTheDocument()
  })

  it('renders an iframe when supportsPreview is true', () => {
    const { container } = render(
      <LivePreviewPane sectionId="hero" supportsPreview={true} />,
    )
    const iframe = container.querySelector('iframe')
    expect(iframe).toBeTruthy()
    expect(iframe?.getAttribute('title')).toBe('Preview: hero')
  })

  it('applies custom className to the root element', () => {
    const { container } = render(
      <LivePreviewPane sectionId="hero" supportsPreview={true} className="w-96" />,
    )
    const aside = container.querySelector('aside')
    expect(aside?.getAttribute('class')).toContain('w-96')
  })

  it('switches viewport when device button is clicked', () => {
    render(<LivePreviewPane sectionId="hero" supportsPreview={true} />)

    const tabletButton = screen.getByRole('button', { name: /preview at tablet width/i })
    fireEvent.click(tabletButton)

    expect(tabletButton).toHaveAttribute('aria-pressed', 'true')
  })
})

// ─── AdminSectionEditor ───────────────────────────────────────────────────────

describe('AdminSectionEditor', () => {
  beforeEach(() => {
    _clearRegistryForTesting()
  })

  afterEach(() => {
    _clearRegistryForTesting()
  })

  it('shows "Section not found" error for unknown sectionId', () => {
    render(<AdminSectionEditor sectionId="does-not-exist" />)
    expect(screen.getByText('Section not found')).toBeInTheDocument()
    expect(screen.getByText(/No schema registered for/i)).toBeInTheDocument()
  })

  it('renders the editor header when schema is found', () => {
    const schema: AdminSectionSchema = {
      sectionId: 'my-test',
      label: 'My Test Section',
      icon: 'Star',
      description: 'Test description.',
      fields: [{ key: 'title', type: 'text', label: 'Title' }],
      supportsPreview: false,
      getDefaultData: () => ({ title: '' }),
    }
    registerAdminSection(schema)

    render(<AdminSectionEditor sectionId="my-test" />)

    // Section label appears in header
    expect(screen.getByText('My Test Section')).toBeInTheDocument()
  })

  it('shows Save button in the editor header', () => {
    const schema: AdminSectionSchema = {
      sectionId: 'save-test',
      label: 'Save Test',
      icon: 'House',
      description: 'desc',
      fields: [],
      supportsPreview: false,
      getDefaultData: () => ({}),
    }
    registerAdminSection(schema)

    render(<AdminSectionEditor sectionId="save-test" />)

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })
})
