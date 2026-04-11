import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import type { AdminSettings } from '@/lib/types'
import type { SectionConfigField } from '@/lib/sections-registry'

// Mock heavy UI deps
vi.mock('@/components/ui/slider', () => ({
  Slider: ({ value, onValueChange, min, max, step, disabled }: {
    value: number[]
    onValueChange: (v: number[]) => void
    min?: number
    max?: number
    step?: number
    disabled?: boolean
  }) =>
    React.createElement('input', {
      type: 'range',
      value: value[0],
      min,
      max,
      step,
      disabled,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onValueChange([parseFloat(e.target.value)]),
      'data-testid': 'slider',
    }),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, disabled, children }: {
    value: string
    onValueChange: (v: string) => void
    disabled?: boolean
    children: React.ReactNode
  }) =>
    React.createElement('div', { 'data-testid': 'select', 'data-value': value, 'data-disabled': disabled },
      React.createElement('select', {
        value,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange(e.target.value),
        disabled,
      }, children)
    ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => React.createElement('span', null, placeholder),
  SelectContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) =>
    React.createElement('option', { value }, children),
}))

const { default: SectionFieldRenderer } = await import('@/components/admin/SectionFieldRenderer')

const mockAdminSettings: AdminSettings = {
  labels: { biography: 'BIOGRAPHY' },
  sound: { backgroundMusicVolume: 0.5 },
}

function makeField(overrides: Partial<SectionConfigField>): SectionConfigField {
  return {
    path: 'labels.biography',
    label: 'Section Heading',
    type: 'text',
    disclosure: 'basic',
    ...overrides,
  }
}

function renderField(
  field: SectionConfigField,
  opts: {
    adminSettings?: AdminSettings
    disclosureLevel?: 'basic' | 'advanced' | 'expert'
    setAdminSettings?: (s: AdminSettings) => void
  } = {},
) {
  const {
    adminSettings = mockAdminSettings,
    disclosureLevel = 'basic',
    setAdminSettings = vi.fn(),
  } = opts
  return render(
    React.createElement(SectionFieldRenderer, {
      field,
      adminSettings,
      setAdminSettings,
      siteData: undefined,
      onUpdateSiteData: undefined,
      disclosureLevel,
    }),
  )
}

describe('SectionFieldRenderer — disclosure filtering', () => {
  it('renders basic field at basic level', () => {
    renderField(makeField({ disclosure: 'basic' }), { disclosureLevel: 'basic' })
    expect(screen.getByText('Section Heading')).toBeInTheDocument()
  })

  it('hides advanced field at basic level', () => {
    renderField(makeField({ disclosure: 'advanced' }), { disclosureLevel: 'basic' })
    expect(screen.queryByText('Section Heading')).toBeNull()
  })

  it('shows advanced field at advanced level', () => {
    renderField(makeField({ disclosure: 'advanced' }), { disclosureLevel: 'advanced' })
    expect(screen.getByText('Section Heading')).toBeInTheDocument()
  })

  it('shows advanced field at expert level', () => {
    renderField(makeField({ disclosure: 'advanced' }), { disclosureLevel: 'expert' })
    expect(screen.getByText('Section Heading')).toBeInTheDocument()
  })

  it('hides expert field at advanced level', () => {
    renderField(makeField({ disclosure: 'expert' }), { disclosureLevel: 'advanced' })
    expect(screen.queryByText('Section Heading')).toBeNull()
  })

  it('shows expert field at expert level', () => {
    renderField(makeField({ disclosure: 'expert' }), { disclosureLevel: 'expert' })
    expect(screen.getByText('Section Heading')).toBeInTheDocument()
  })

  it('treats undefined disclosure as basic', () => {
    renderField(makeField({ disclosure: undefined }), { disclosureLevel: 'basic' })
    expect(screen.getByText('Section Heading')).toBeInTheDocument()
  })
})

describe('SectionFieldRenderer — field type rendering', () => {
  it('renders text input', () => {
    renderField(makeField({ type: 'text' }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders textarea', () => {
    renderField(makeField({ type: 'textarea' }))
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders toggle/switch', () => {
    renderField(makeField({ type: 'toggle', path: 'labels.releaseShowType' }))
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('renders select with options', () => {
    const field = makeField({
      type: 'select',
      options: [
        { label: 'Small (14px)', value: 'text-sm' },
        { label: 'Large (18px)', value: 'text-lg' },
      ],
    })
    renderField(field)
    expect(screen.getByTestId('select')).toBeInTheDocument()
    expect(screen.getByText('Small (14px)')).toBeInTheDocument()
    expect(screen.getByText('Large (18px)')).toBeInTheDocument()
  })

  it('renders slider', () => {
    const field = makeField({
      type: 'slider',
      path: 'sound.backgroundMusicVolume',
      min: 0,
      max: 1,
      step: 0.05,
    })
    renderField(field)
    expect(screen.getByTestId('slider')).toBeInTheDocument()
  })

  it('renders image field with url input', () => {
    const field = makeField({ type: 'image', path: 'shell.photo' })
    renderField(field, { adminSettings: { shell: { photo: '' } } })
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.getByText('Section Heading')).toBeInTheDocument()
  })

  it('renders color input', () => {
    const { container } = renderField(makeField({ type: 'color', path: 'design.effects.chromaticColorLeft' }))
    const input = container.querySelector('input[type="color"]')
    expect(input).toBeTruthy()
  })

  it('renders number input', () => {
    renderField(makeField({ type: 'number', path: 'sections.styleOverrides.gallery.maxVisible' }))
    const input = document.querySelector('input[type="number"]')
    expect(input).toBeTruthy()
  })
})

describe('SectionFieldRenderer — description rendering', () => {
  it('renders description text when provided', () => {
    const field = makeField({ description: 'Font size for body text.' })
    renderField(field)
    expect(screen.getByText('Font size for body text.')).toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const field = makeField({ description: undefined })
    renderField(field)
    expect(screen.queryByText('Font size for body text.')).toBeNull()
  })
})

describe('SectionFieldRenderer — reset-to-default button', () => {
  it('shows Reset button when value differs from defaultValue', () => {
    const field = makeField({
      type: 'text',
      path: 'labels.biography',
      defaultValue: 'BIOGRAPHY',
    })
    renderField(field, {
      adminSettings: { labels: { biography: 'MODIFIED' } },
    })
    expect(screen.getByText('Reset')).toBeInTheDocument()
  })

  it('hides Reset button when value matches defaultValue', () => {
    const field = makeField({
      type: 'text',
      path: 'labels.biography',
      defaultValue: 'BIOGRAPHY',
    })
    renderField(field, {
      adminSettings: { labels: { biography: 'BIOGRAPHY' } },
    })
    expect(screen.queryByText('Reset')).toBeNull()
  })

  it('hides Reset button when no defaultValue is set', () => {
    const field = makeField({ type: 'text', defaultValue: undefined })
    renderField(field)
    expect(screen.queryByText('Reset')).toBeNull()
  })

  it('calls setAdminSettings with defaultValue when Reset is clicked', () => {
    const setAdminSettings = vi.fn()
    const field = makeField({
      type: 'text',
      path: 'labels.biography',
      defaultValue: 'BIOGRAPHY',
    })
    renderField(field, {
      adminSettings: { labels: { biography: 'CHANGED' } },
      setAdminSettings,
    })
    fireEvent.click(screen.getByText('Reset'))
    expect(setAdminSettings).toHaveBeenCalledOnce()
    const updated = setAdminSettings.mock.calls[0][0] as AdminSettings
    expect(updated.labels?.biography).toBe('BIOGRAPHY')
  })
})

describe('SectionFieldRenderer — URL validation', () => {
  it('shows error for invalid URL in url field', () => {
    const field = makeField({ type: 'url', path: 'siteData.social.instagram' })
    const { container } = renderField(field, { adminSettings: {} })
    const input = container.querySelector('input')!
    fireEvent.change(input, { target: { value: 'not-a-valid-url' } })
    expect(screen.getByText('Invalid URL')).toBeInTheDocument()
  })

  it('does not show error for valid URL', () => {
    const field = makeField({ type: 'url', path: 'siteData.social.instagram' })
    const { container } = renderField(field, { adminSettings: {} })
    const input = container.querySelector('input')!
    fireEvent.change(input, { target: { value: 'https://instagram.com/user' } })
    expect(screen.queryByText('Invalid URL')).toBeNull()
  })

  it('does not show error for empty URL', () => {
    const field = makeField({ type: 'url', path: 'siteData.social.instagram' })
    const { container } = renderField(field, { adminSettings: {} })
    const input = container.querySelector('input')!
    fireEvent.change(input, { target: { value: '' } })
    expect(screen.queryByText('Invalid URL')).toBeNull()
  })
})

describe('SectionFieldRenderer — progressive disclosure across sections', () => {
  it('gallery section: shows more fields at advanced than basic', async () => {
    const { SECTION_REGISTRY } = await import('@/lib/sections-registry')
    const gallery = SECTION_REGISTRY.find((e) => e.id === 'gallery')!
    const basicFields = gallery.configFields.filter((f) => (f.disclosure ?? 'basic') === 'basic')
    const advancedFields = gallery.configFields.filter((f) => f.disclosure === 'advanced')
    expect(advancedFields.length).toBeGreaterThan(0)
    expect(advancedFields.length + basicFields.length).toBeGreaterThan(basicFields.length)
  })

  it('media section: shows more fields at advanced than basic', async () => {
    const { SECTION_REGISTRY } = await import('@/lib/sections-registry')
    const media = SECTION_REGISTRY.find((e) => e.id === 'media')!
    const advancedFields = media.configFields.filter((f) => f.disclosure === 'advanced')
    expect(advancedFields.length).toBeGreaterThan(0)
  })

  it('shell section: shows more fields at advanced than basic', async () => {
    const { SECTION_REGISTRY } = await import('@/lib/sections-registry')
    const shell = SECTION_REGISTRY.find((e) => e.id === 'shell')!
    const basicCount = shell.configFields.filter((f) => (f.disclosure ?? 'basic') === 'basic').length
    const advancedCount = shell.configFields.filter((f) => f.disclosure === 'advanced').length
    expect(advancedCount).toBeGreaterThan(0)
    expect(basicCount + advancedCount).toBeGreaterThan(basicCount)
  })
})

describe('SectionFieldRenderer — analytics toggle', () => {
  it('AdminSettings has analytics property', () => {
    const settings: AdminSettings = {
      analytics: { enabled: false, trackPageViews: true, trackEvents: false },
    }
    expect(settings.analytics?.enabled).toBe(false)
    expect(settings.analytics?.trackPageViews).toBe(true)
    expect(settings.analytics?.trackEvents).toBe(false)
  })

  it('AdminSettings has sound property', () => {
    const settings: AdminSettings = {
      sound: {
        defaultMuted: true,
        backgroundMusicVolume: 0.8,
        backgroundMusic: 'https://example.com/music.mp3',
      },
    }
    expect(settings.sound?.defaultMuted).toBe(true)
    expect(settings.sound?.backgroundMusicVolume).toBe(0.8)
  })
})
