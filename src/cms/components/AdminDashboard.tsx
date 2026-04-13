/**
 * AdminDashboard
 *
 * Landing page for the Admin Shell at route `admin` / `admin/dashboard`.
 * Shows all registered section schemas as interactive cards organised into
 * logical groups. Provides a search/filter bar for quick navigation.
 *
 * Reads sections directly from the `AdminSchemaRegistry` so any new schema
 * registered via `registerAdminSection()` automatically appears here without
 * any manual update to this file.
 */

import { useState } from 'react'
import { MagnifyingGlass, ArrowRight, CirclesFour, Columns } from '@phosphor-icons/react'
// Side-effect import: registers all 15 section schemas with the global registry
import '@/cms/section-schemas'
import { getSections } from '@/lib/admin-schema-registry'
import type { AdminSectionSchema } from '@/lib/admin-section-schema'
import { SchemaIcon } from './SchemaIcon'

// ─── Section groups ───────────────────────────────────────────────────────────

interface SectionGroup {
  id: string
  label: string
  sectionIds: string[]
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    id: 'content',
    label: 'Content',
    sectionIds: ['hero', 'bio', 'music', 'releases', 'gigs', 'social', 'contact'],
  },
  {
    id: 'media',
    label: 'Media',
    sectionIds: ['gallery', 'media'],
  },
  {
    id: 'configuration',
    label: 'Configuration',
    sectionIds: ['shell', 'partners', 'sponsoring', 'credit-highlights'],
  },
  {
    id: 'legal',
    label: 'Legal',
    sectionIds: ['footer', 'impressum'],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminDashboardProps {
  /** Called when the user clicks the Edit button on a section card. */
  onNavigate: (sectionId: string) => void
}

// ─── Highlight helper ─────────────────────────────────────────────────────────

/**
 * Returns an array of { text, highlight } segments for matching query substrings.
 */
function highlightText(text: string, query: string): { text: string; highlight: boolean }[] {
  if (!query) return [{ text, highlight: false }]
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerText.indexOf(lowerQuery)
  if (idx === -1) return [{ text, highlight: false }]
  return [
    { text: text.slice(0, idx), highlight: false },
    { text: text.slice(idx, idx + query.length), highlight: true },
    { text: text.slice(idx + query.length), highlight: false },
  ]
}

// ─── SectionCard ──────────────────────────────────────────────────────────────

interface SectionCardProps {
  schema: AdminSectionSchema
  onClick: () => void
  searchQuery: string
}

function SectionCard({ schema, onClick, searchQuery }: SectionCardProps) {
  const labelSegments = highlightText(schema.label, searchQuery)

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-4 bg-[#111] border border-zinc-800 rounded-lg hover:border-red-500/40 hover:bg-red-900/5 transition-colors duration-200 group focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:ring-offset-1 focus:ring-offset-[#0a0a0a]"
      aria-label={`Edit ${schema.label} section`}
      title="Press Enter to edit"
    >
      {/* Icon + title row */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded bg-zinc-900 border border-zinc-800 group-hover:border-red-500/30 transition-colors">
          <SchemaIcon
            iconName={schema.icon}
            size={18}
            className="text-zinc-400 group-hover:text-red-400 transition-colors"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-zinc-200 font-mono text-sm font-medium group-hover:text-red-300 transition-colors truncate">
            {labelSegments.map((seg, i) =>
              seg.highlight ? (
                <mark key={i} className="bg-red-500/20 text-red-300 rounded-sm px-0.5 not-italic">
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </div>
          <div className="text-zinc-600 text-xs mt-0.5 line-clamp-2 leading-relaxed">
            {schema.description}
          </div>
        </div>
      </div>

      {/* Metadata badges + arrow */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {schema.supportsPreview && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-green-900/20 border border-green-800/30 text-green-600">
              Preview
            </span>
          )}
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-600">
            {schema.fields.length} {schema.fields.length === 1 ? 'field' : 'fields'}
          </span>
        </div>
        <ArrowRight
          size={14}
          className="text-zinc-700 group-hover:text-red-500 group-hover:translate-x-0.5 transition-transform"
        />
      </div>
    </button>
  )
}

// ─── QuickStatsBar ────────────────────────────────────────────────────────────

function QuickStatsBar({ total, preview }: { total: number; preview: number }) {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
      <StatItem value={total} label="Sections" />
      <div className="h-3 w-px bg-zinc-800" />
      <StatItem value={preview} label="With preview" accent="green" />
      <div className="h-3 w-px bg-zinc-800" />
      <StatItem value={total - preview} label="Config only" />
    </div>
  )
}

function StatItem({
  value,
  label,
  accent,
}: {
  value: number
  label: string
  accent?: 'green' | 'red'
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`text-lg font-mono font-semibold tabular-nums ${
          accent === 'green'
            ? 'text-green-500'
            : accent === 'red'
              ? 'text-red-500'
              : 'text-zinc-200'
        }`}
      >
        {value}
      </span>
      <span className="text-zinc-600 text-xs font-mono">{label}</span>
    </div>
  )
}

// ─── AdminDashboard ───────────────────────────────────────────────────────────

/**
 * Section overview dashboard rendered at the `/admin` route.
 * Sections are auto-populated from the AdminSchemaRegistry and grouped logically.
 */
export function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  const [query, setQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped')
  const sections = getSections()
  const sectionMap = new Map(sections.map(s => [s.sectionId, s]))

  // Filter sections by search query (label or description)
  const normalizedQuery = query.trim().toLowerCase()
  const filteredSections = normalizedQuery
    ? sections.filter(
        s =>
          s.label.toLowerCase().includes(normalizedQuery) ||
          s.description.toLowerCase().includes(normalizedQuery),
      )
    : null

  const sectionsWithPreview = sections.filter(s => s.supportsPreview).length

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto overflow-auto">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-zinc-100 font-mono text-xl font-semibold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-zinc-500 text-sm font-mono">
          Select a section below to edit its content and configuration.
        </p>
      </div>

      {/* Quick stats */}
      <QuickStatsBar total={sections.length} preview={sectionsWithPreview} />

      {/* Toolbar: search + view toggle */}
      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search sections…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#111] border border-zinc-800 rounded text-zinc-300 text-sm font-mono placeholder-zinc-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors"
            aria-label="Search sections"
          />
        </div>

        {/* View toggle */}
        {filteredSections === null && (
          <div className="flex items-center gap-0.5 bg-zinc-900 rounded border border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                viewMode === 'grouped'
                  ? 'bg-zinc-800 text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
              aria-label="Grouped view"
              aria-pressed={viewMode === 'grouped'}
            >
              <Columns size={13} />
              <span className="hidden sm:inline">Groups</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('flat')}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono transition-colors ${
                viewMode === 'flat'
                  ? 'bg-zinc-800 text-zinc-200'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
              aria-label="Flat list view"
              aria-pressed={viewMode === 'flat'}
            >
              <CirclesFour size={13} />
              <span className="hidden sm:inline">All</span>
            </button>
          </div>
        )}
      </div>

      {/* Search results */}
      {filteredSections !== null ? (
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3">
            Results ({filteredSections.length})
          </h2>
          {filteredSections.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSections.map(section => (
                <SectionCard
                  key={section.sectionId}
                  schema={section}
                  onClick={() => onNavigate(section.sectionId)}
                  searchQuery={normalizedQuery}
                />
              ))}
            </div>
          ) : (
            <p className="text-zinc-600 text-sm font-mono">
              No sections match &ldquo;{query}&rdquo;.
            </p>
          )}
        </div>
      ) : viewMode === 'flat' ? (
        /* Flat list view */
        <div>
          <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3 pb-2 border-b border-zinc-800">
            All Sections ({sections.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sections.map(section => (
              <SectionCard
                key={section.sectionId}
                schema={section}
                onClick={() => onNavigate(section.sectionId)}
                searchQuery=""
              />
            ))}
          </div>
        </div>
      ) : (
        /* Grouped sections */
        SECTION_GROUPS.map(group => {
          const groupSections = group.sectionIds
            .map(id => sectionMap.get(id))
            .filter((s): s is AdminSectionSchema => s !== undefined)

          if (groupSections.length === 0) return null

          return (
            <div key={group.id}>
              <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3 pb-2 border-b border-zinc-800">
                {group.label}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupSections.map(section => (
                  <SectionCard
                    key={section.sectionId}
                    schema={section}
                    onClick={() => onNavigate(section.sectionId)}
                    searchQuery=""
                  />
                ))}
              </div>
            </div>
          )
        })
      )}

      {/* Sections not in any group (future-proof) */}
      {filteredSections === null && (() => {
        const allGroupedIds = new Set(SECTION_GROUPS.flatMap(g => g.sectionIds))
        const ungrouped = sections.filter(s => !allGroupedIds.has(s.sectionId))
        if (ungrouped.length === 0) return null
        return (
          <div>
            <h2 className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3 pb-2 border-b border-zinc-800">
              Other
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ungrouped.map(section => (
                <SectionCard
                  key={section.sectionId}
                  schema={section}
                  onClick={() => onNavigate(section.sectionId)}
                  searchQuery=""
                />
              ))}
            </div>
          </div>
        )
      })()}

      {/* Keyboard hint footer */}
      <p className="text-zinc-800 text-[10px] font-mono text-center pt-2">
        Press <kbd className="px-1 py-0.5 rounded border border-zinc-800 text-zinc-700">Enter</kbd> on a card to edit · <kbd className="px-1 py-0.5 rounded border border-zinc-800 text-zinc-700">Ctrl+S</kbd> to save
      </p>
    </div>
  )
}
