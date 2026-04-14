/**
 * @deprecated AdminPanel is the legacy admin UI (God Component, 24KB).
 *
 * Use the unified Admin Shell instead:
 *   - Navigate to `#admin` to open the new schema-driven admin.
 *   - The new system is in `src/cms/AdminShell.tsx` and is accessed via `CmsApp`.
 *   - All entry points (keyboard shortcut Ctrl+K, `#admin` hash) still work.
 *
 * This file is kept for reference and backward-compatibility with legacy imports.
 * Do NOT add new features here — add them to the Phase 1/2 schema-driven system.
 */
import React from 'react'
import {
  X,
  Palette,
  Eye,
  GearSix,
  SignOut,
  FileText,
  ArrowCounterClockwise,
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState, useCallback, useEffect, useMemo, type ChangeEvent } from 'react'
import AdminLoginDialog from '@/components/AdminLoginDialog'
import { AdminSearch } from '@/components/admin/AdminSearch'
import type {
  AdminSettings,
  ThemeCustomization,
  AnimationSettings,
  ProgressiveOverlayModes,
  DisclosureLevel,
} from '@/lib/types'
import type { SiteData } from '@/App'
import { toast } from 'sonner'
import AppearanceTab from '@/components/admin/AppearanceTab'
import BackgroundTab from '@/components/admin/BackgroundTab'
import LayoutTab from '@/components/admin/LayoutTab'
import SectionsTab from '@/components/admin/SectionsTab'
import SectionPanel from '@/components/admin/SectionPanel'
import OverviewTab from '@/components/admin/OverviewTab'
import SecurityTab from '@/components/admin/SecurityTab'
import AnalyticsTab from '@/components/admin/AnalyticsTab'
import DataTab from '@/components/admin/DataTab'
import TranslationsTab from '@/components/admin/TranslationsTab'
import { SECTION_REGISTRY } from '@/lib/sections-registry'
import { getDisclosureLevel, getSectionOrder } from '@/lib/admin-settings'

type AdminCategory = 'content' | 'design' | 'sections' | 'system'

/** Maps legacy search tab names to the new sidebar category/page */
const TAB_NAVIGATION_MAP: Record<string, { cat: AdminCategory; pg: string }> = {
  overview: { cat: 'system', pg: 'overview' },
  security: { cat: 'system', pg: 'security' },
  analytics: { cat: 'system', pg: 'analytics' },
  data: { cat: 'system', pg: 'data' },
  translations: { cat: 'system', pg: 'translations' },
  appearance: { cat: 'design', pg: 'colors' },
  background: { cat: 'design', pg: 'background' },
  layout: { cat: 'design', pg: 'layout' },
  sections: { cat: 'sections', pg: 'visibility' },
}

interface AdminPanelProps {
  open: boolean
  onClose: () => void
  siteData?: SiteData
  adminSettings?: AdminSettings | null
  setAdminSettings?: (settings: AdminSettings) => void
  onImportData?: (data: SiteData) => void
  onRefreshSiteData?: () => void
  onUpdateSiteData?: (updater: SiteData | ((current: SiteData) => SiteData)) => void
  onOpenConfigEditor?: () => void
  onOpenStats?: () => void
  onOpenSecurityIncidents?: () => void
  onOpenSecuritySettings?: () => void
  onOpenBlocklist?: () => void
  onOpenContactInbox?: () => void
  onOpenSubscriberList?: () => void
  onFetchBandsintown?: () => Promise<void>
  onFetchITunes?: () => Promise<void>
  onResetReleases?: () => Promise<void>
  onResetGigs?: () => Promise<void>
  editMode: boolean
  onToggleEdit: () => void
  hasPassword: boolean
  onChangePassword: (password: string) => Promise<void>
  onSetPassword: (password: string) => Promise<void>
  onLogout?: () => Promise<void>
}

export default function AdminPanel({
  open,
  onClose,
  siteData,
  adminSettings,
  setAdminSettings,
  onImportData,
  onRefreshSiteData,
  onUpdateSiteData,
  onOpenConfigEditor,
  onOpenStats,
  onOpenSecurityIncidents,
  onOpenSecuritySettings,
  onOpenBlocklist,
  onOpenContactInbox,
  onOpenSubscriberList,
  onFetchBandsintown,
  onFetchITunes,
  onResetReleases,
  onResetGigs,
  editMode,
  onToggleEdit,
  hasPassword,
  onChangePassword: _onChangePassword,
  onSetPassword,
  onLogout,
}: AdminPanelProps) {
  const [category, setCategory] = useState<AdminCategory>('content')
  const [page, setPage] = useState<string>(SECTION_REGISTRY[0]?.id ?? 'bio')
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const translationImportRef = useRef<HTMLInputElement>(null)

  const disclosureLevel: DisclosureLevel = getDisclosureLevel(adminSettings)

  const [newPresetName, setNewPresetName] = useState('')
  const [apiHealth, setApiHealth] = useState<{ status: string; services: Record<string, unknown> } | null>(null)

  // ── Undo stack ─────────────────────────────────────────────────────────────
  const undoStack = useRef<AdminSettings[]>([])
  const [canUndo, setCanUndo] = useState(false)

  /** Wrap the external setAdminSettings so every change is pushed onto the undo stack. */
  const setAdminSettingsWithUndo = useCallback((next: AdminSettings) => {
    if (!setAdminSettings) return
    if (adminSettings) {
      undoStack.current = [...undoStack.current.slice(-49), adminSettings]
      setCanUndo(true)
    }
    setAdminSettings(next)
  }, [adminSettings, setAdminSettings])

  const handleUndo = useCallback(() => {
    const prev = undoStack.current.pop()
    if (!prev || !setAdminSettings) return
    setAdminSettings(prev)
    setCanUndo(undoStack.current.length > 0)
    toast.success('Undone')
  }, [setAdminSettings])

  // Section order helpers
  const currentOrder: string[] = useMemo(
    () => getSectionOrder(adminSettings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [adminSettings?.sections?.order],
  )

  const moveSectionUp = useCallback(
    (index: number) => {
      if (index <= 0 || !setAdminSettings) return
      const newOrder = [...currentOrder]
      ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      setAdminSettingsWithUndo({ ...adminSettings, sections: { ...(adminSettings?.sections ?? {}), order: newOrder } })
    },
    [currentOrder, adminSettings, setAdminSettings, setAdminSettingsWithUndo],
  )

  const moveSectionDown = useCallback(
    (index: number) => {
      if (index >= currentOrder.length - 1 || !setAdminSettings) return
      const newOrder = [...currentOrder]
      ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      setAdminSettingsWithUndo({ ...adminSettings, sections: { ...(adminSettings?.sections ?? {}), order: newOrder } })
    },
    [currentOrder, adminSettings, setAdminSettings, setAdminSettingsWithUndo],
  )

  const updateTheme = useCallback(
    (key: keyof ThemeCustomization, value: string) => {
      if (!setAdminSettings) return
      const numericKeys: (keyof ThemeCustomization)[] = ['spotifyHueRotate', 'spotifySaturate', 'spotifyBrightness']
      if (numericKeys.includes(key)) {
        const parsed = value === '' ? undefined : parseFloat(value)
        const newTheme = { ...adminSettings?.design?.theme }
        if (parsed === undefined) {
          delete newTheme[key]
        } else if (!isNaN(parsed)) {
          (newTheme as Record<string, unknown>)[key] = parsed
        }
        setAdminSettingsWithUndo({ ...adminSettings, design: { ...(adminSettings?.design ?? {}), theme: newTheme } })
      } else {
        setAdminSettingsWithUndo({ ...adminSettings, design: { ...(adminSettings?.design ?? {}), theme: { ...adminSettings?.design?.theme, [key]: value } } })
      }
    },
    [adminSettings, setAdminSettings, setAdminSettingsWithUndo],
  )

  const applyPreset = useCallback(
    (themeUpdate: Partial<ThemeCustomization>) => {
      if (!setAdminSettings) return
      setAdminSettingsWithUndo({ ...adminSettings, design: { ...(adminSettings?.design ?? {}), theme: { ...adminSettings?.design?.theme, ...themeUpdate } } })
    },
    [adminSettings, setAdminSettings, setAdminSettingsWithUndo],
  )

  const updateAnimation = useCallback(
    (key: keyof AnimationSettings, value: boolean) => {
      if (!setAdminSettings) return
      setAdminSettingsWithUndo({ ...adminSettings, background: { ...adminSettings?.background, [key]: value } })
    },
    [adminSettings, setAdminSettings, setAdminSettingsWithUndo],
  )

  const updateAnimationNumber = useCallback(
    (key: keyof AnimationSettings, value: number) => {
      if (!setAdminSettings) return
      setAdminSettingsWithUndo({ ...adminSettings, background: { ...adminSettings?.background, [key]: value } })
    },
    [adminSettings, setAdminSettings, setAdminSettingsWithUndo],
  )

  const updateProgressiveMode = useCallback(
    (key: keyof ProgressiveOverlayModes, value: boolean) => {
      if (!setAdminSettings) return
      setAdminSettingsWithUndo({
        ...adminSettings,
        progressiveOverlayModes: { ...adminSettings?.progressiveOverlayModes, [key]: value },
      })
    },
    [adminSettings, setAdminSettings, setAdminSettingsWithUndo],
  )

  const fetchApiHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      if (res.ok) {
        const data = await res.json() as { status: string; services: Record<string, unknown> }
        setApiHealth(data)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!open) return
    void fetchApiHealth()
  }, [open, fetchApiHealth])

  const handleExport = () => {
    if (!siteData) return
    const exportData = { ...siteData, _adminSettings: adminSettings || {} }
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `site-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Data exported (including settings)')
  }

  const handleImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onImportData) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Record<string, unknown>
        if (!parsed.artistName) { toast.error('Invalid site data file'); return }
        const { _adminSettings, ...siteDataOnly } = parsed
        onImportData(siteDataOnly as unknown as SiteData)
        if (_adminSettings && setAdminSettings) {
          setAdminSettings(_adminSettings as AdminSettings)
          toast.success('Data & settings imported successfully')
        } else {
          toast.success('Data imported successfully')
        }
      } catch { toast.error('Failed to parse JSON file') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const theme = adminSettings?.design?.theme ?? {}
  const anim = adminSettings?.background ?? {}
  const progModes = adminSettings?.progressiveOverlayModes ?? {}

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia('(min-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Sidebar navigation definition (memoized since registry and icons are static)
  const sidebarItems = useMemo(() => [
    {
      category: 'content' as AdminCategory,
      label: 'Content',
      icon: <FileText size={14} />,
      pages: SECTION_REGISTRY.map((e) => ({ id: e.id, label: e.label })),
    },
    {
      category: 'design' as AdminCategory,
      label: 'Design',
      icon: <Palette size={14} />,
      pages: [
        { id: 'colors', label: 'Appearance' },
        { id: 'background', label: 'Background' },
        { id: 'layout', label: 'Layout' },
      ],
    },
    {
      category: 'sections' as AdminCategory,
      label: 'Sections',
      icon: <Eye size={14} />,
      pages: [{ id: 'visibility', label: 'Visibility & Order' }],
    },
    {
      category: 'system' as AdminCategory,
      label: 'System',
      icon: <GearSix size={14} />,
      pages: [
        { id: 'overview', label: 'Overview' },
        { id: 'security', label: 'Security' },
        { id: 'analytics', label: 'Analytics' },
        { id: 'data', label: 'Data' },
        { id: 'translations', label: 'Translations' },
      ],
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [SECTION_REGISTRY])

  const renderContent = () => {
    if (category === 'content') {
      return (
        <SectionPanel
          sectionId={page}
          adminSettings={adminSettings ?? undefined}
          setAdminSettings={setAdminSettingsWithUndo}
          siteData={siteData}
          onUpdateSiteData={onUpdateSiteData}
          disclosureLevel={disclosureLevel}
        />
      )
    }
    if (category === 'design') {
      if (page === 'colors') {
        return (
          <AppearanceTab
            adminSettings={adminSettings}
            setAdminSettings={setAdminSettingsWithUndo}
            theme={theme}
            updateTheme={updateTheme}
            applyPreset={applyPreset}
            anim={anim}
            updateAnimation={updateAnimation}
            updateAnimationNumber={updateAnimationNumber}
            progModes={progModes}
            updateProgressiveMode={updateProgressiveMode}
            onClose={onClose}
            onOpenConfigEditor={onOpenConfigEditor}
            newPresetName={newPresetName}
            setNewPresetName={setNewPresetName}
            disclosureLevel={disclosureLevel}
          />
        )
      }
      if (page === 'background') {
        return (
          <BackgroundTab
            adminSettings={adminSettings}
            setAdminSettings={setAdminSettingsWithUndo}
            anim={anim}
            updateAnimationNumber={updateAnimationNumber}
          />
        )
      }
      if (page === 'layout') {
        return (
          <LayoutTab
            adminSettings={adminSettings}
            setAdminSettings={setAdminSettingsWithUndo}
            disclosureLevel={disclosureLevel}
          />
        )
      }
    }
    if (category === 'sections') {
      return (
        <SectionsTab
          adminSettings={adminSettings}
          setAdminSettings={setAdminSettingsWithUndo}
          currentOrder={currentOrder}
          moveSectionUp={moveSectionUp}
          moveSectionDown={moveSectionDown}
        />
      )
    }
    if (category === 'system') {
      if (page === 'overview') {
        return (
          <OverviewTab
            siteData={siteData}
            editMode={editMode}
            hasPassword={hasPassword}
            apiHealth={apiHealth}
            setActiveTab={(p) => setPage(p)}
            onToggleEdit={onToggleEdit}
            onExport={handleExport}
            onImportClick={() => importInputRef.current?.click()}
            onImportData={onImportData}
            onOpenPasswordDialog={() => setShowPasswordDialog(true)}
            fetchApiHealth={fetchApiHealth}
          />
        )
      }
      if (page === 'security') {
        return (
          <SecurityTab
            hasPassword={hasPassword}
            onOpenSecurityIncidents={onOpenSecurityIncidents}
            onOpenSecuritySettings={onOpenSecuritySettings}
            onOpenBlocklist={onOpenBlocklist}
            onOpenSubscriberList={onOpenSubscriberList}
            onClose={onClose}
            onOpenPasswordDialog={() => setShowPasswordDialog(true)}
          />
        )
      }
      if (page === 'analytics') {
        return (
          <AnalyticsTab
            onOpenStats={onOpenStats}
            onOpenContactInbox={onOpenContactInbox}
            onClose={onClose}
            adminSettings={adminSettings}
            setAdminSettings={setAdminSettingsWithUndo}
          />
        )
      }
      if (page === 'data') {
        return (
          <DataTab
            siteData={siteData}
            onFetchBandsintown={onFetchBandsintown}
            onFetchITunes={onFetchITunes}
            onResetReleases={onResetReleases}
            onResetGigs={onResetGigs}
            onRefreshSiteData={onRefreshSiteData}
            onExport={handleExport}
            onImportClick={() => importInputRef.current?.click()}
          />
        )
      }
      if (page === 'translations') {
        return (
          <TranslationsTab
            adminSettings={adminSettings}
            setAdminSettings={setAdminSettingsWithUndo}
            translationImportRef={translationImportRef}
          />
        )
      }
    }
    return null
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop — only on mobile */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm md:hidden"
            style={{ zIndex: 'var(--z-modal-backdrop)' } as React.CSSProperties}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel — slides from bottom on mobile, from right on desktop */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Admin Panel"
            data-admin-ui="true"
            className="fixed bg-card border-border flex flex-col
              bottom-0 left-0 right-0 h-[92dvh] border-t
              md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[720px] md:h-full md:border-t-0 md:border-l"
            style={{ zIndex: 'var(--z-overlay)' } as React.CSSProperties}
            initial={isDesktop ? { x: '100%' } : { y: '100%' }}
            animate={isDesktop ? { x: 0 } : { y: 0 }}
            exit={isDesktop ? { x: '100%' } : { y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <GearSix size={20} weight="bold" className="text-primary" />
                <span className="font-mono font-bold text-sm tracking-widest text-foreground uppercase">
                  Admin Panel
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                  editMode
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-muted border-border text-muted-foreground'
                }`}>
                  {editMode ? 'EDIT MODE' : 'VIEW MODE'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <AdminSearch onNavigate={(tab) => {
                  const mapped = TAB_NAVIGATION_MAP[tab]
                  if (mapped) { setCategory(mapped.cat); setPage(mapped.pg) }
                  else {
                    const reg = SECTION_REGISTRY.find((e) => e.id === tab)
                    if (reg) { setCategory('content'); setPage(tab) }
                  }
                }} />

                {/* Undo button */}
                <button
                  onClick={handleUndo}
                  disabled={!canUndo}
                  className="text-muted-foreground hover:text-primary transition-colors p-1 disabled:opacity-30 disabled:cursor-not-allowed"
                  aria-label="Undo last change"
                  title="Undo last change"
                >
                  <ArrowCounterClockwise size={18} />
                </button>

                {/* Disclosure level 3-segment button */}
                <div className="flex border border-border rounded overflow-hidden text-[10px] font-mono">
                  {(['basic', 'advanced', 'expert'] as DisclosureLevel[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setAdminSettings?.({
                        ...(adminSettings ?? {}),
                        ui: { ...(adminSettings?.ui ?? {}), disclosureLevel: level },
                      })}
                      className={`px-2 py-1 uppercase tracking-wide transition-colors ${
                        disclosureLevel === level
                          ? 'bg-primary/20 text-primary border-r border-border last:border-r-0'
                          : 'text-muted-foreground hover:text-foreground border-r border-border last:border-r-0'
                      }`}
                      title={`${level.charAt(0).toUpperCase() + level.slice(1)} mode`}
                      aria-label={`Set ${level} disclosure level`}
                      aria-pressed={disclosureLevel === level}
                    >
                      {level === 'basic' ? 'Basic' : level === 'advanced' ? 'Adv' : 'Exp'}
                    </button>
                  ))}
                </div>

                {onLogout && (
                  <button
                    onClick={async () => { await onLogout(); onClose() }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    aria-label="Logout"
                    title="Logout"
                  >
                    <SignOut size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label="Close admin panel"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body: sidebar + content */}
            <div className="flex flex-1 min-h-0">
              {/* Sidebar */}
              <nav className="w-[160px] shrink-0 border-r border-border overflow-y-auto py-2">
                {sidebarItems.map(({ category: cat, label, icon, pages }) => (
                  <div key={cat} className="mb-1">
                    {/* Category header */}
                    <button
                      onClick={() => {
                        setCategory(cat)
                        setPage(pages[0].id)
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left font-mono text-[11px] uppercase tracking-wider transition-colors ${
                        category === cat
                          ? 'text-primary font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                    {/* Sub-pages when category active */}
                    {category === cat && (
                      <div className="pl-2 pb-1 space-y-0.5">
                        {pages.map(({ id, label: pageLabel }) => (
                          <button
                            key={id}
                            onClick={() => setPage(id)}
                            className={`w-full text-left px-3 py-1.5 font-mono text-[11px] rounded-sm transition-colors truncate ${
                              page === id
                                ? 'bg-primary/15 text-primary'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            }`}
                          >
                            {pageLabel}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              {/* Content area */}
              <div className="flex-1 overflow-y-auto">
                {renderContent()}
              </div>
            </div>

            {/* Hidden import input */}
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
              aria-hidden="true"
            />
            <input
              ref={translationImportRef}
              type="file"
              accept=".json"
              className="hidden"
              aria-hidden="true"
            />
          </motion.div>

          {/* Password Change Dialog */}
          {showPasswordDialog && (
            <AdminLoginDialog
              open={showPasswordDialog}
              onOpenChange={setShowPasswordDialog}
              mode="setup"
              onSetPassword={onSetPassword}
            />
          )}
        </>
      )}
    </AnimatePresence>
  )
}
