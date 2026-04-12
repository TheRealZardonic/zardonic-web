import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { SchemaFormRenderer } from '@/cms/components/SchemaFormRenderer'
import type { SchemaFormRendererField } from '@/cms/components/SchemaFormRenderer'
import type { FieldMeta } from '@/cms/schemas'

// ─── Mock heavy deps ──────────────────────────────────────────────────────────

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) =>
    React.createElement('div', null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { role: 'tooltip' }, children),
}))

// ─── Test fixtures ────────────────────────────────────────────────────────────

const textField: SchemaFormRendererField = {
  path: 'hero.headline',
  meta: {
    label: 'Headline',
    widget: 'text',
    placeholder: 'ZARDONIC',
    group: 'Content',
  } satisfies FieldMeta,
}

const textareaField: SchemaFormRendererField = {
  path: 'hero.subheadline',
  meta: {
    label: 'Sub-headline',
    widget: 'textarea',
    group: 'Content',
  } satisfies FieldMeta,
}

const checkboxField: SchemaFormRendererField = {
  path: 'siteConfig.enabled',
  meta: {
    label: 'Enabled',
    widget: 'checkbox',
    group: 'Settings',
  } satisfies FieldMeta,
}

const colorField: SchemaFormRendererField = {
  path: 'theme.primaryColor',
  meta: {
    label: 'Primary Color',
    widget: 'color',
    group: 'Colors',
  } satisfies FieldMeta,
}

const selectField: SchemaFormRendererField = {
  path: 'release.type',
  meta: {
    label: 'Type',
    widget: 'select',
    group: 'Core',
    options: [
      { value: 'album', label: 'Album' },
      { value: 'ep', label: 'EP' },
    ],
  } satisfies FieldMeta,
}

const rangeField: SchemaFormRendererField = {
  path: 'hero.overlayOpacity',
  meta: {
    label: 'Overlay Opacity',
    widget: 'range',
    group: 'Design',
    min: 0,
    max: 1,
    step: 0.05,
    advanced: true,
  } satisfies FieldMeta,
}

const tooltipField: SchemaFormRendererField = {
  path: 'siteConfig.name',
  meta: {
    label: 'Site Name',
    widget: 'text',
    group: 'Identity',
    tooltip: 'The public name of your site.',
  } satisfies FieldMeta,
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('SchemaFormRenderer', () => {
  it('renders nothing for an empty fields array', () => {
    const { container } = render(
      <SchemaFormRenderer fields={[]} values={{}} onChange={vi.fn()} />,
    )
    expect(container.firstChild).toBeInstanceOf(HTMLDivElement)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('renders a text input for a text field', () => {
    render(
      <SchemaFormRenderer
        fields={[textField]}
        values={{ 'hero.headline': 'MY HEADLINE' }}
        onChange={vi.fn()}
      />,
    )
    const input = screen.getByLabelText('Headline')
    expect(input).toBeTruthy()
    expect((input as HTMLInputElement).value).toBe('MY HEADLINE')
    expect((input as HTMLInputElement).placeholder).toBe('ZARDONIC')
  })

  it('renders a textarea for a textarea field', () => {
    render(
      <SchemaFormRenderer
        fields={[textareaField]}
        values={{ 'hero.subheadline': 'Sub text' }}
        onChange={vi.fn()}
      />,
    )
    const textarea = screen.getByLabelText('Sub-headline')
    expect(textarea.tagName).toBe('TEXTAREA')
    expect((textarea as HTMLTextAreaElement).value).toBe('Sub text')
  })

  it('renders a checkbox for a checkbox field', () => {
    render(
      <SchemaFormRenderer
        fields={[checkboxField]}
        values={{ 'siteConfig.enabled': true }}
        onChange={vi.fn()}
      />,
    )
    const checkbox = screen.getByLabelText('Enabled') as HTMLInputElement
    expect(checkbox.type).toBe('checkbox')
    expect(checkbox.checked).toBe(true)
  })

  it('renders a select for a select field with options', () => {
    render(
      <SchemaFormRenderer
        fields={[selectField]}
        values={{ 'release.type': 'album' }}
        onChange={vi.fn()}
      />,
    )
    const select = screen.getByLabelText('Type') as HTMLSelectElement
    expect(select.tagName).toBe('SELECT')
    expect(select.value).toBe('album')
    expect(screen.getByText('Album')).toBeTruthy()
    expect(screen.getByText('EP')).toBeTruthy()
  })

  it('renders a range input for a range field', () => {
    render(
      <SchemaFormRenderer
        fields={[rangeField]}
        values={{ 'hero.overlayOpacity': 0.5 }}
        onChange={vi.fn()}
        alwaysShowAdvanced
      />,
    )
    const range = screen.getByLabelText('Overlay Opacity') as HTMLInputElement
    expect(range.type).toBe('range')
    expect(range.value).toBe('0.5')
    expect(range.min).toBe('0')
    expect(range.max).toBe('1')
    expect(range.step).toBe('0.05')
  })

  it('renders a FieldLabel with tooltip when meta.tooltip is provided', () => {
    render(
      <SchemaFormRenderer
        fields={[tooltipField]}
        values={{}}
        onChange={vi.fn()}
      />,
    )
    // The help button should be rendered by FieldLabel
    expect(screen.getByLabelText('Help: Site Name')).toBeTruthy()
  })

  it('calls onChange when a text input changes', () => {
    const onChange = vi.fn()
    render(
      <SchemaFormRenderer
        fields={[textField]}
        values={{ 'hero.headline': '' }}
        onChange={onChange}
      />,
    )
    const input = screen.getByLabelText('Headline')
    fireEvent.change(input, { target: { value: 'NEW HEADLINE' } })
    expect(onChange).toHaveBeenCalledWith('hero.headline', 'NEW HEADLINE')
  })

  it('calls onChange when checkbox is toggled', () => {
    const onChange = vi.fn()
    render(
      <SchemaFormRenderer
        fields={[checkboxField]}
        values={{ 'siteConfig.enabled': false }}
        onChange={onChange}
      />,
    )
    const checkbox = screen.getByLabelText('Enabled')
    fireEvent.click(checkbox)
    expect(onChange).toHaveBeenCalledWith('siteConfig.enabled', true)
  })

  // ── Progressive disclosure ──

  it('hides advanced fields by default', () => {
    render(
      <SchemaFormRenderer
        fields={[textField, rangeField]}
        values={{}}
        onChange={vi.fn()}
      />,
    )
    expect(screen.queryByLabelText('Overlay Opacity')).toBeNull()
  })

  it('shows advanced fields when Advanced button is clicked', () => {
    render(
      <SchemaFormRenderer
        fields={[textField, rangeField]}
        values={{}}
        onChange={vi.fn()}
      />,
    )
    const advancedBtn = screen.getByRole('button', { name: /show advanced settings/i })
    fireEvent.click(advancedBtn)
    expect(screen.getByLabelText('Overlay Opacity')).toBeTruthy()
  })

  it('shows advanced fields when alwaysShowAdvanced is true', () => {
    render(
      <SchemaFormRenderer
        fields={[textField, rangeField]}
        values={{}}
        onChange={vi.fn()}
        alwaysShowAdvanced
      />,
    )
    // No toggle button
    expect(screen.queryByRole('button', { name: /advanced/i })).toBeNull()
    // Advanced field is visible
    expect(screen.getByLabelText('Overlay Opacity')).toBeTruthy()
  })

  it('advanced button toggles between Advanced and Less labels', () => {
    render(
      <SchemaFormRenderer
        fields={[textField, rangeField]}
        values={{}}
        onChange={vi.fn()}
      />,
    )
    const btn = screen.getByRole('button', { name: /show advanced settings/i })
    expect(btn.textContent).toMatch(/advanced/i)
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-label')).toMatch(/hide advanced settings/i)
    expect(btn.textContent).toMatch(/less/i)
    fireEvent.click(btn)
    expect(btn.getAttribute('aria-label')).toMatch(/show advanced settings/i)
    expect(btn.textContent).toMatch(/advanced/i)
  })

  // ── Grouping ──

  it('renders group headers for each distinct meta.group', () => {
    render(
      <SchemaFormRenderer
        fields={[textField, checkboxField]}
        values={{}}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Content')).toBeTruthy()
    expect(screen.getByText('Settings')).toBeTruthy()
  })

  it('renders color picker with two inputs', () => {
    render(
      <SchemaFormRenderer
        fields={[colorField]}
        values={{ 'theme.primaryColor': '#ff0000' }}
        onChange={vi.fn()}
      />,
    )
    const colorInput = screen.getByLabelText('Primary Color') as HTMLInputElement
    expect(colorInput.type).toBe('color')
    const textInput = screen.getByLabelText('Primary Color hex value') as HTMLInputElement
    expect(textInput.value).toBe('#ff0000')
  })

  it('applies custom className to the root element', () => {
    const { container } = render(
      <SchemaFormRenderer
        fields={[textField]}
        values={{}}
        onChange={vi.fn()}
        className="my-custom-class"
      />,
    )
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})
