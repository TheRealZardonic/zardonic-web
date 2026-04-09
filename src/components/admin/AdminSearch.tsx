import type React from 'react'
import { useState, useMemo } from 'react'
import { MagnifyingGlass, X } from '@phosphor-icons/react'

interface SearchableItem {
  label: string
  tab: string
  tabLabel: string
  group?: string
}

/**
 * Searchable settings registry — a flat list of all admin setting labels
 * mapped to the tab they live in. This enables the global search feature.
 */
const SEARCHABLE_ITEMS: SearchableItem[] = [
  // Overview
  { label: 'Edit Mode', tab: 'overview', tabLabel: 'Overview' },
  { label: 'Export Data', tab: 'overview', tabLabel: 'Overview' },
  { label: 'Import Data', tab: 'overview', tabLabel: 'Overview' },
  { label: 'API Health', tab: 'overview', tabLabel: 'Overview' },

  // Content
  { label: 'Artist Name', tab: 'content', tabLabel: 'Content', group: 'Identity' },
  { label: 'Biography', tab: 'content', tabLabel: 'Content', group: 'Identity' },
  { label: 'Hero Image', tab: 'content', tabLabel: 'Content', group: 'Identity' },
  { label: 'Social Links', tab: 'content', tabLabel: 'Content', group: 'Social' },
  { label: 'Instagram', tab: 'content', tabLabel: 'Content', group: 'Social' },
  { label: 'Facebook', tab: 'content', tabLabel: 'Content', group: 'Social' },
  { label: 'Spotify', tab: 'content', tabLabel: 'Content', group: 'Social' },
  { label: 'YouTube', tab: 'content', tabLabel: 'Content', group: 'Social' },
  { label: 'Section Labels', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Section Heading Prefix', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Biography Heading', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Music Player Heading', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Music Stream Label', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Music Status Label', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Gigs Loading Label', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Releases Loading Label', tab: 'content', tabLabel: 'Content', group: 'Labels' },
  { label: 'Contact Info', tab: 'content', tabLabel: 'Content', group: 'Contact' },
  { label: 'Management Name', tab: 'content', tabLabel: 'Content', group: 'Contact' },
  { label: 'Management Email', tab: 'content', tabLabel: 'Content', group: 'Contact' },
  { label: 'Booking Email', tab: 'content', tabLabel: 'Content', group: 'Contact' },
  { label: 'Press Email', tab: 'content', tabLabel: 'Content', group: 'Contact' },
  { label: 'Decorative Texts', tab: 'content', tabLabel: 'Content', group: 'Decorative' },
  { label: 'HUD Labels', tab: 'content', tabLabel: 'Content', group: 'Decorative' },
  { label: 'Overlay Labels', tab: 'content', tabLabel: 'Content', group: 'Decorative' },
  { label: 'Loading Screen Texts', tab: 'content', tabLabel: 'Content', group: 'Loader' },
  { label: 'Boot Label', tab: 'content', tabLabel: 'Content', group: 'Loader' },
  { label: 'Hacking Texts', tab: 'content', tabLabel: 'Content', group: 'Loader' },
  { label: 'Loader Messages', tab: 'content', tabLabel: 'Content', group: 'Loader' },

  // Appearance
  { label: 'Color Preset', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Primary Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Accent Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Background Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Foreground Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Card Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Border Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Muted Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Secondary Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Destructive Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Data Label Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Data Label Font Size', tab: 'appearance', tabLabel: 'Appearance', group: 'Data-Label' },
  { label: 'Data Label Font Family', tab: 'appearance', tabLabel: 'Appearance', group: 'Data-Label' },
  { label: 'Modal Glow Color', tab: 'appearance', tabLabel: 'Appearance', group: 'Colors' },
  { label: 'Font Heading', tab: 'appearance', tabLabel: 'Appearance', group: 'Fonts' },
  { label: 'Font Body', tab: 'appearance', tabLabel: 'Appearance', group: 'Fonts' },
  { label: 'Font Mono', tab: 'appearance', tabLabel: 'Appearance', group: 'Fonts' },
  { label: 'Glitch Effects', tab: 'appearance', tabLabel: 'Appearance', group: 'Animations' },
  { label: 'Scanline Overlay', tab: 'appearance', tabLabel: 'Appearance', group: 'Animations' },
  { label: 'Chromatic Aberration', tab: 'appearance', tabLabel: 'Appearance', group: 'Animations' },
  { label: 'CRT Effect', tab: 'appearance', tabLabel: 'Appearance', group: 'Animations' },
  { label: 'Noise / Grain', tab: 'appearance', tabLabel: 'Appearance', group: 'Animations' },
  { label: 'Circuit Background', tab: 'appearance', tabLabel: 'Appearance', group: 'Animations' },
  { label: 'Blinking Cursor', tab: 'appearance', tabLabel: 'Appearance', group: 'Animations' },
  { label: 'Border Radius', tab: 'appearance', tabLabel: 'Appearance', group: 'Layout' },
  { label: 'Loader Style', tab: 'appearance', tabLabel: 'Appearance', group: 'Loader' },
  { label: 'Favicon URL', tab: 'appearance', tabLabel: 'Appearance', group: 'Branding' },

  // Background
  { label: 'Background Image', tab: 'background', tabLabel: 'Background' },
  { label: 'Background Animation', tab: 'background', tabLabel: 'Background' },
  { label: 'Matrix Rain', tab: 'background', tabLabel: 'Background' },

  // Sections
  { label: 'Section Visibility', tab: 'sections', tabLabel: 'Sections' },
  { label: 'Section Order', tab: 'sections', tabLabel: 'Sections' },
  { label: 'Biography Visible', tab: 'sections', tabLabel: 'Sections' },
  { label: 'Music Visible', tab: 'sections', tabLabel: 'Sections' },
  { label: 'Gigs Visible', tab: 'sections', tabLabel: 'Sections' },
  { label: 'Releases Visible', tab: 'sections', tabLabel: 'Sections' },
  { label: 'Gallery Visible', tab: 'sections', tabLabel: 'Sections' },
  { label: 'Connect Visible', tab: 'sections', tabLabel: 'Sections' },

  // Section Config
  { label: 'Release Info Label', tab: 'section-config', tabLabel: 'Section Config' },
  { label: 'Release Stream Label', tab: 'section-config', tabLabel: 'Section Config' },
  { label: 'Release Status Label', tab: 'section-config', tabLabel: 'Section Config' },
  { label: 'Release Show Type', tab: 'section-config', tabLabel: 'Section Config' },
  { label: 'Release Show Year', tab: 'section-config', tabLabel: 'Section Config' },
  { label: 'Release Show Tracks', tab: 'section-config', tabLabel: 'Section Config' },
  { label: 'Credit Highlights Heading Visible', tab: 'section-config', tabLabel: 'Section Config' },

  // Security
  { label: 'Password', tab: 'security', tabLabel: 'Security' },
  { label: 'Security Settings', tab: 'security', tabLabel: 'Security' },
  { label: 'Blocklist', tab: 'security', tabLabel: 'Security' },

  // Analytics
  { label: 'Statistics Dashboard', tab: 'analytics', tabLabel: 'Analytics' },
  { label: 'Contact Inbox', tab: 'analytics', tabLabel: 'Analytics' },

  // Data
  { label: 'Export JSON', tab: 'data', tabLabel: 'Data' },
  { label: 'Import JSON', tab: 'data', tabLabel: 'Data' },

  // Translations
  { label: 'Language', tab: 'translations', tabLabel: 'Translations' },
  { label: 'Custom Translations', tab: 'translations', tabLabel: 'Translations' },
]

interface AdminSearchProps {
  onNavigate: (tab: string) => void
}

export function AdminSearch({ onNavigate }: AdminSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return SEARCHABLE_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.tabLabel.toLowerCase().includes(q) ||
        (item.group && item.group.toLowerCase().includes(q)),
    ).slice(0, 8)
  }, [query])

  return (
    <div className="relative">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
          aria-label="Search settings"
          title="Search settings"
          type="button"
        >
          <MagnifyingGlass size={16} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-sm shadow-lg overflow-hidden"
          style={{ zIndex: 'var(--z-overlay)' } as React.CSSProperties}
        >
          <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
            <MagnifyingGlass size={14} className="text-muted-foreground shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search settings..."
              className="flex-1 bg-transparent text-xs font-mono text-foreground focus:outline-none placeholder:text-muted-foreground/50"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground"
                type="button"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto">
              {results.map((item, i) => (
                <button
                  key={`${item.tab}-${item.label}-${i}`}
                  className="w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-primary/10 transition-colors flex items-center justify-between"
                  onClick={() => {
                    onNavigate(item.tab)
                    setQuery('')
                    setIsOpen(false)
                  }}
                  type="button"
                >
                  <span className="text-foreground truncate">{item.label}</span>
                  <span className="text-primary/60 text-[10px] shrink-0 ml-2">{item.tabLabel}</span>
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && (
            <div className="px-3 py-2 text-xs font-mono text-muted-foreground">
              No settings found
            </div>
          )}
        </div>
      )}
    </div>
  )
}
