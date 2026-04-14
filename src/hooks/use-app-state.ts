/**
 * useAppState — centralises all application-level state for App.tsx.
 *
 * Extracted to satisfy the Single Responsibility Principle: App.tsx becomes
 * a pure layout/render file while this hook owns all state management,
 * KV synchronisation, authentication wiring, and derived values.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useKV } from '@/hooks/use-kv'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import { useAnalyticsConsent } from '@/lib/consent'
import { trackPageView, trackHeatmapClick } from '@/hooks/use-analytics'
import { normalizeStoredRelease } from '@/lib/release-adapters'
import type { AdminSettings, SectionLabels, TerminalCommand } from '@/lib/types'
import type { SiteData } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'
import { DEFAULT_SECTION_ORDER, type SectionKey } from '@/lib/config'

// localStorage key used to persist the loader type for instant restoration
const LOADER_TYPE_KEY = 'nk-loader-type'

export interface AppState {
  // ── Site data ──────────────────────────────────────────────────────────────
  siteData: SiteData | undefined
  handleUpdateSiteData: (updater: SiteData | ((current: SiteData) => SiteData)) => void
  isSiteDataLoaded: boolean
  refetchSiteData: () => void

  // ── Admin settings ─────────────────────────────────────────────────────────
  adminSettings: AdminSettings | undefined
  handleUpdateAdminSettings: (settings: AdminSettings) => void
  handleLabelChange: (key: keyof SectionLabels, value: string | boolean) => void
  handleSaveTerminalCommands: (commands: TerminalCommand[]) => void
  refetchAdminSettings: () => void

  // ── Authentication ─────────────────────────────────────────────────────────
  isOwner: boolean
  needsSetup: boolean
  handleAdminLogin: (password: string, totpCode?: string) => Promise<{ success: boolean; totpRequired?: boolean }>
  handleSetAdminPassword: (password: string) => Promise<void>
  handleSetupAdminPassword: (password: string) => Promise<void>
  handleLogout: () => Promise<void>
  showLoginDialog: boolean
  setShowLoginDialog: (v: boolean) => void
  showSetupDialog: boolean
  setShowSetupDialog: (v: boolean) => void

  // ── UI state ───────────────────────────────────────────────────────────────
  editMode: boolean
  setEditMode: (v: boolean) => void
  mobileMenuOpen: boolean
  setMobileMenuOpen: (v: boolean) => void

  // ── Loading screen ─────────────────────────────────────────────────────────
  loading: boolean
  setLoading: (v: boolean) => void
  contentLoaded: boolean
  activeLoaderType: string
  effectiveLoaderType: string
  precacheUrls: string[]

  // ── Release / gig reset ───────────────────────────────────────────────────
  handleResetReleases: () => Promise<void>
  handleResetGigs: () => Promise<void>

  // ── Derived values (memoised) ──────────────────────────────────────────────
  anim: NonNullable<AdminSettings['background']>
  vis: Record<string, boolean>
  sectionLabels: NonNullable<AdminSettings['labels']>
  terminalCommands: TerminalCommand[]
  sectionOrder: SectionKey[]
  getSectionOrder: (section: string) => number
}

export function useAppState(): AppState {
  // ── Loader type (read synchronously from localStorage for FOUC prevention) ─
  const [initialLoaderType] = useState<string>(() => {
    try { return localStorage.getItem(LOADER_TYPE_KEY) ?? 'minimal-bar' } catch { return 'minimal-bar' }
  })
  const [loading, setLoading] = useState(() => initialLoaderType !== 'none')
  const [contentLoaded, setContentLoaded] = useState(false)
  const [activeLoaderType] = useState(initialLoaderType)

  // ── Admin authentication ───────────────────────────────────────────────────
  const {
    isOwner,
    needsSetup,
    handleAdminLogin: _handleAdminLogin,
    handleAdminLogout,
    handleSetupAdminPassword,
    handleChangeAdminPassword,
  } = useAdminAuth()
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showSetupDialog, setShowSetupDialog] = useState(false)

  const [wantsSetup] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('admin-setup')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('admin-setup')
      window.history.replaceState({}, '', url.toString())
      return true
    }
    return false
  })

  useEffect(() => {
    if (wantsSetup && needsSetup) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSetupDialog(true)
    }
  }, [wantsSetup, needsSetup])

  // ── KV data (site data + admin settings) ──────────────────────────────────
  const [siteData, setSiteData] = useState<SiteData | undefined>(undefined)
  const [adminSettings, setAdminSettings] = useState<AdminSettings | undefined>(undefined)

  const [kvSiteData, setKvSiteData, isSiteDataLoaded, refetchSiteData] = useKV<SiteData>('band-data', DEFAULT_SITE_DATA)
  const [kvAdminSettings, setKvAdminSettings, isAdminSettingsLoaded, refetchAdminSettings] = useKV<AdminSettings | undefined>('admin:settings', undefined)

  useEffect(() => {
    if (isSiteDataLoaded) {
      const normalized = kvSiteData
        ? { ...kvSiteData, releases: (kvSiteData.releases ?? []).map(normalizeStoredRelease) }
        : kvSiteData
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSiteData(normalized)
    }
  }, [kvSiteData, isSiteDataLoaded])

  useEffect(() => {
    if (isAdminSettingsLoaded && kvAdminSettings) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAdminSettings(kvAdminSettings)
    }
  }, [kvAdminSettings, isAdminSettingsLoaded])

  const handleUpdateSiteData = useCallback((updater: SiteData | ((current: SiteData) => SiteData)) => {
    setSiteData(prev => {
      const next = typeof updater === 'function' ? updater(prev ?? DEFAULT_SITE_DATA) : updater
      setKvSiteData(next)
      return next
    })
  }, [setKvSiteData])

  const handleUpdateAdminSettings = useCallback((settings: AdminSettings) => {
    setAdminSettings(settings)
    setKvAdminSettings(settings)
  }, [setKvAdminSettings])

  const handleLabelChange = useCallback((key: keyof SectionLabels, value: string | boolean) => {
    setAdminSettings(prev => {
      const next = { ...(prev ?? {}), labels: { ...(prev?.labels ?? {}), [key]: value } }
      setKvAdminSettings(next)
      return next
    })
  }, [setKvAdminSettings])

  const handleSaveTerminalCommands = useCallback((commands: TerminalCommand[]) => {
    handleUpdateAdminSettings({ ...(adminSettings ?? {}), terminal: { ...(adminSettings?.terminal ?? {}), commands } })
  }, [adminSettings, handleUpdateAdminSettings])

  // ── Loading screen / content ───────────────────────────────────────────────
  const anim = adminSettings?.background ?? {}

  useEffect(() => {
    if (anim.loadingScreenType) {
      try { localStorage.setItem(LOADER_TYPE_KEY, anim.loadingScreenType) } catch { /* quota */ }
    }
  }, [anim.loadingScreenType])

  const effectiveLoaderType = anim.loadingScreenType ?? initialLoaderType

  useEffect(() => {
    if (effectiveLoaderType === 'none') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false)
    }
  }, [effectiveLoaderType])

  useEffect(() => {
    if (!loading) {
      setTimeout(() => setContentLoaded(true), 100)
    }
  }, [loading])

  // ── Analytics (consent-gated + admin toggle) ──────────────────────────────
  const analyticsConsent = useAnalyticsConsent()
  const analyticsAdminEnabled = adminSettings?.analytics?.enabled !== false
  const analyticsPageViewsEnabled = analyticsAdminEnabled && adminSettings?.analytics?.trackPageViews !== false
  const analyticsEventsEnabled = analyticsAdminEnabled && adminSettings?.analytics?.trackEvents !== false
  useEffect(() => {
    if (analyticsConsent && analyticsPageViewsEnabled) trackPageView()
  }, [analyticsConsent, analyticsPageViewsEnabled])

  useEffect(() => {
    if (!analyticsConsent || !analyticsEventsEnabled) return
    const handleClick = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = (e.clientY + window.scrollY) / document.documentElement.scrollHeight
      const target = e.target as HTMLElement
      const interactive = target.closest('button, a, [role="button"]') as HTMLElement | null
      let el: string
      if (interactive) {
        const text = interactive.textContent?.trim().slice(0, 30) || ''
        const tag = interactive.tagName.toLowerCase()
        const ariaLabel = interactive.getAttribute('aria-label') || interactive.getAttribute('title') || ''
        el = ariaLabel || text || `${tag}`
      } else {
        el = target.textContent?.trim().slice(0, 30) || target.tagName.toLowerCase()
      }
      trackHeatmapClick(x, y, el)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [analyticsConsent, analyticsEventsEnabled])

  // ── Edit mode / selection lock ─────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    document.body.classList.toggle('no-select', !editMode)
  }, [editMode])

  // ── Authentication handlers ────────────────────────────────────────────────
  const handleAdminLogin = useCallback(async (password: string, totpCode?: string): Promise<{ success: boolean; totpRequired?: boolean }> => {
    const result = await _handleAdminLogin(password, totpCode)
    if (result === true) {
      refetchAdminSettings()
      return { success: true }
    }
    if (result === 'totp-required') return { success: false, totpRequired: true }
    return { success: false }
  }, [_handleAdminLogin, refetchAdminSettings])

  const handleSetAdminPassword = useCallback(async (password: string): Promise<void> => {
    await handleChangeAdminPassword(password)
  }, [handleChangeAdminPassword])

  const handleLogout = useCallback(async () => {
    setEditMode(false)
    await handleAdminLogout()
  }, [handleAdminLogout])

  // ── Release / gig reset ───────────────────────────────────────────────────
  const handleResetReleases = useCallback(async () => {
    const resp = await fetch('/api/data-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target: 'releases' }),
    })
    if (resp.ok) {
      handleUpdateSiteData(prev => ({ ...prev, releases: [] }))
      refetchSiteData()
    } else {
      const err = await resp.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `HTTP ${resp.status}`)
    }
  }, [handleUpdateSiteData, refetchSiteData])

  const handleResetGigs = useCallback(async () => {
    const resp = await fetch('/api/data-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ target: 'gigs' }),
    })
    if (resp.ok) {
      handleUpdateSiteData(prev => ({ ...prev, gigs: [] }))
      refetchSiteData()
    } else {
      const err = await resp.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error ?? `HTTP ${resp.status}`)
    }
  }, [handleUpdateSiteData, refetchSiteData])

  // ── Precache URLs for loading screen ──────────────────────────────────────
  const precacheUrls = useMemo(() => {
    if (!siteData) return []
    const urls: string[] = []
    siteData.gallery?.forEach(url => { if (url) urls.push(url) })
    siteData.releases?.forEach(r => { if (r.artwork) urls.push(r.artwork) })
    siteData.creditHighlights?.forEach(c => { if (c.src) urls.push(c.src) })
    return urls
  }, [siteData])

  // ── Derived section state ──────────────────────────────────────────────────
  const vis = (adminSettings?.sections?.visibility ?? {}) as Record<string, boolean>
  const sectionLabels = adminSettings?.labels ?? {}
  const terminalCommands = adminSettings?.terminal?.commands ?? []
  const sectionOrder = (adminSettings?.sections?.order ?? DEFAULT_SECTION_ORDER) as SectionKey[]

  const getSectionOrder = useCallback((section: string) => {
    const idx = sectionOrder.indexOf(section as SectionKey)
    return idx >= 0 ? idx : DEFAULT_SECTION_ORDER.indexOf(section as SectionKey)
  }, [sectionOrder])

  return {
    handleResetReleases,
    handleResetGigs,
    siteData,
    handleUpdateSiteData,
    isSiteDataLoaded,
    refetchSiteData,
    adminSettings,
    handleUpdateAdminSettings,
    handleLabelChange,
    handleSaveTerminalCommands,
    refetchAdminSettings,
    isOwner,
    needsSetup,
    handleAdminLogin,
    handleSetAdminPassword,
    handleSetupAdminPassword,
    handleLogout,
    showLoginDialog,
    setShowLoginDialog,
    showSetupDialog,
    setShowSetupDialog,
    editMode,
    setEditMode,
    mobileMenuOpen,
    setMobileMenuOpen,
    loading,
    setLoading,
    contentLoaded,
    activeLoaderType,
    effectiveLoaderType,
    precacheUrls,
    anim,
    vis,
    sectionLabels,
    terminalCommands,
    sectionOrder,
    getSectionOrder,
  }
}
