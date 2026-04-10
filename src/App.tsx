import { useState, useEffect, useCallback, useMemo } from 'react'
import React, { Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useKV } from '@/hooks/use-kv'
import { useKonami } from '@/hooks/use-konami'
import { trackPageView, trackHeatmapClick } from '@/hooks/use-analytics'
import { useAnalyticsConsent, CookieConsent } from '@/components/CookieConsent'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import type { AdminSettings, SectionLabels, Release as FullRelease, TerminalCommand, AnimationSettings } from '@/lib/types'
import { fullReleaseToStored, mergeFullReleaseIntoStored } from '@/lib/release-adapters'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSiteDataSync } from '@/hooks/use-site-data-sync'
import { LocaleProvider } from '@/contexts/LocaleContext'
import type { SiteData, CyberpunkOverlayState } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'
import { DEFAULT_SECTION_ORDER } from '@/lib/config'
export type { SiteData } from '@/lib/app-types'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { LoadingScreen } from '@/components/LoadingScreen'
const MinimalBarLoader = React.lazy(() => import('@/components/MinimalBarLoader'))
const GlitchDecodeLoader = React.lazy(() => import('@/components/GlitchDecodeLoader'))
const SwipeableGallery = React.lazy(() => import('@/components/SwipeableGallery'))
const CyberpunkOverlay = React.lazy(() => import('@/components/CyberpunkOverlay'))
import AdminLoginDialog from '@/components/AdminLoginDialog'
import EditControls from '@/components/EditControls'
const ConfigEditorDialog = React.lazy(() => import('@/components/ConfigEditorDialog'))
import AppMediaSection from '@/components/AppMediaSection'
import { SystemMonitorHUD } from '@/components/SystemMonitorHUD'

const ContactInboxDialog = React.lazy(() => import('@/components/ContactInboxDialog'))
const SubscriberListDialog = React.lazy(() => import('@/components/SubscriberListDialog'))
import AppNavBar from '@/components/AppNavBar'
import AppHeroSection from '@/components/AppHeroSection'
import ShellSection from '@/components/ShellSection'
import CreditHighlightsSection from '@/components/CreditHighlightsSection'
import GallerySection from '@/components/GallerySection'
import AppFooter from '@/components/AppFooter'
import AppBioSection from '@/components/AppBioSection'
import AppMusicSection from '@/components/AppMusicSection'
import AppGigsSection from '@/components/AppGigsSection'
import AppReleasesSection from '@/components/AppReleasesSection'
import AppSocialSection from '@/components/AppSocialSection'
import { StructuredData } from '@/components/StructuredData'
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { PageLayout } from '@/layouts/PageLayout'
import { BackgroundStack } from '@/components/BackgroundStack'
import { GlobalEffects } from '@/components/GlobalEffects'


// Code splitting for heavy components
const Terminal = React.lazy(() => import('@/components/Terminal').then(m => ({ default: m.Terminal })))
const StatsDashboard = React.lazy(() => import('@/components/StatsDashboard'))
const SecurityIncidentsDashboard = React.lazy(() => import('@/components/SecurityIncidentsDashboard'))
const SecuritySettingsDialog = React.lazy(() => import('@/components/SecuritySettingsDialog'))
const BlocklistManagerDialog = React.lazy(() => import('@/components/BlocklistManagerDialog'))
const AttackerProfileDialog = React.lazy(() => import('@/components/AttackerProfileDialog'))



function App() {
  const konamiActivated = useKonami()
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [contentLoaded, setContentLoaded] = useState(false)

  // Admin authentication via cookie-based session (no KV read on page load)
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

  // Check for ?admin-setup URL parameter once at mount (read from URL before first render)
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
    if (konamiActivated) {
      setTerminalOpen(true)
      toast.success('Terminal activated!')
    }
  }, [konamiActivated])

  // Open setup dialog when auth check confirms no password exists and user requested setup
  useEffect(() => {
    if (wantsSetup && needsSetup) {
      setShowSetupDialog(true)
    }
  }, [wantsSetup, needsSetup])

  useEffect(() => {
    if (!loading) {
      setTimeout(() => setContentLoaded(true), 100)
    }
  }, [loading])

  // Track page view on mount — only if analytics consent was given
  const analyticsConsent = useAnalyticsConsent()
  useEffect(() => {
    if (analyticsConsent) {
      trackPageView()
    }
  // Only run once on mount; analyticsConsent may become true later (after banner)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyticsConsent])

  // Track heatmap clicks globally — guard with consent
  useEffect(() => {
    if (!analyticsConsent) return
    const handleClick = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth
      const y = (e.clientY + window.scrollY) / document.documentElement.scrollHeight
      const target = e.target as HTMLElement
      // Find the closest interactive element for meaningful names
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
  }, [analyticsConsent])

  const [siteData, setSiteData] = useState<SiteData | undefined>(undefined)
  const [adminSettings, setAdminSettings] = useState<AdminSettings | undefined>(undefined)

  const [kvSiteData, setKvSiteData, isSiteDataLoaded, refetchSiteData] = useKV<SiteData>('band-data', DEFAULT_SITE_DATA)
  const [kvAdminSettings, setKvAdminSettings, isAdminSettingsLoaded, refetchAdminSettings] = useKV<AdminSettings | undefined>('admin:settings', undefined)

  useEffect(() => {
    if (isSiteDataLoaded) {
      setSiteData(kvSiteData)
    }
  }, [kvSiteData, isSiteDataLoaded])

  useEffect(() => {
    if (isAdminSettingsLoaded && kvAdminSettings) {
      setAdminSettings(kvAdminSettings)
    }
  }, [kvAdminSettings, isAdminSettingsLoaded])

  /** Update siteData both in local React state and in KV (persists to server). */
  const handleUpdateSiteData = useCallback((updater: SiteData | ((current: SiteData) => SiteData)) => {
    setSiteData(prev => {
      const next = typeof updater === 'function' ? updater(prev ?? DEFAULT_SITE_DATA) : updater
      setKvSiteData(next)
      return next
    })
  }, [setKvSiteData])

  /** Update adminSettings both in local React state and in KV. */
  const handleUpdateAdminSettings = useCallback((settings: AdminSettings) => {
    setAdminSettings(settings)
    setKvAdminSettings(settings)
  }, [setKvAdminSettings])

  const handleLabelChange = useCallback((key: keyof SectionLabels, value: string | boolean) => {
    setAdminSettings(prev => {
      const next = { ...(prev ?? {}), sectionLabels: { ...(prev?.sectionLabels ?? {}), [key]: value } }
      setKvAdminSettings(next)
      return next
    })
  }, [setKvAdminSettings])

  const handleSaveTerminalCommands = useCallback((commands: TerminalCommand[]) => {
    handleUpdateAdminSettings({ ...(adminSettings ?? {}), terminalCommands: commands })
  }, [adminSettings, handleUpdateAdminSettings])

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // Toggle text-selection lock based on edit mode
  useEffect(() => {
    document.body.classList.toggle('no-select', !editMode)
  }, [editMode])
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showSecurityIncidents, setShowSecurityIncidents] = useState(false)
  const [showSecuritySettings, setShowSecuritySettings] = useState(false)
  const [showBlocklist, setShowBlocklist] = useState(false)
  const [showAttackerProfile, setShowAttackerProfile] = useState(false)
  const [selectedAttackerIp, setSelectedAttackerIp] = useState<string>('')
  const [showContactInbox, setShowContactInbox] = useState(false)
  const [showSubscriberList, setShowSubscriberList] = useState(false)

  const vis = adminSettings?.sectionVisibility ?? {}
  const anim = adminSettings?.animations ?? {}
  const sectionLabels = adminSettings?.sectionLabels ?? {}
  const terminalCommands = adminSettings?.terminalCommands ?? []
  const contactSettings = adminSettings?.contactSettings ?? {}

  // Persist the loading screen type to localStorage so it can be read synchronously
  // on the next page load, preventing a FOUC from the default 'cyberpunk' loader.
  const LOADER_TYPE_KEY = 'nk-loader-type'

  // Read loading screen type synchronously from localStorage for the first render.
  // This is safe: useKV/adminSettings takes time to arrive from the network, but
  // localStorage is available immediately, so the correct loader renders from frame 1.
  const [initialLoaderType] = useState<string>(() => {
    try { return localStorage.getItem(LOADER_TYPE_KEY) ?? 'cyberpunk' } catch { return 'cyberpunk' }
  })

  // When KV settings arrive, persist the type so the next load is instant.
  useEffect(() => {
    if (anim.loadingScreenType) {
      try { localStorage.setItem(LOADER_TYPE_KEY, anim.loadingScreenType) } catch { /* quota */ }
    }
  }, [anim.loadingScreenType])

  // Effective loader type: KV value takes precedence once loaded; localStorage used before that.
  const effectiveLoaderType = anim.loadingScreenType ?? initialLoaderType

  const sectionOrder = adminSettings?.sectionOrder ?? DEFAULT_SECTION_ORDER
  const getSectionOrder = useCallback((section: string) => {
    const idx = sectionOrder.indexOf(section)
    return idx >= 0 ? idx : DEFAULT_SECTION_ORDER.indexOf(section)
  }, [sectionOrder])

  useAppTheme(adminSettings)
  const { iTunesFetching, bandsintownFetching, hasAutoLoaded, iTunesProgress, handleFetchBandsintownEvents, handleFetchITunesReleases } = useSiteDataSync(siteData, setSiteData, isSiteDataLoaded)
  useDocumentTitle(siteData?.artistName ?? '')

  // When loading screen type is 'none', skip loading immediately
  useEffect(() => {
    if (effectiveLoaderType === 'none') {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveLoaderType])

  // Collect image URLs for precaching during loading screen
  const precacheUrls = useMemo(() => {
    if (!siteData) return []
    const urls: string[] = []
    siteData.gallery?.forEach(url => { if (url) urls.push(url) })
    siteData.releases?.forEach(r => { if (r.artwork) urls.push(r.artwork) })
    siteData.creditHighlights?.forEach(c => { if (c.src) urls.push(c.src) })
    return urls
  }, [siteData])
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [cyberpunkOverlay, setCyberpunkOverlay] = useState<CyberpunkOverlayState | null>(null)

  // Admin authentication handlers
  const handleAdminLogin = useCallback(async (password: string, totpCode?: string): Promise<{ success: boolean; totpRequired?: boolean }> => {
    const result = await _handleAdminLogin(password, totpCode)
    if (result === true) {
      // Re-fetch admin settings now that we're authenticated — the initial
      // unauthenticated load strips sensitive fields (terminalCommands,
      // configOverrides, contactInfo.emailForwardTo). Refetching gives the
      // admin the full, unredacted settings for the current session.
      refetchAdminSettings()
      return { success: true }
    }
    if (result === 'totp-required') return { success: false, totpRequired: true }
    return { success: false }
  }, [_handleAdminLogin, refetchAdminSettings])

  const handleSetAdminPassword = useCallback(async (password: string): Promise<void> => {
    await handleChangeAdminPassword(password)
  }, [handleChangeAdminPassword])

  // Wrap logout to also exit edit mode automatically
  const handleLogout = useCallback(async () => {
    setEditMode(false)
    await handleAdminLogout()
  }, [handleAdminLogout])

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    // Small delay to let mobile menu close before scrolling
    setTimeout(() => {
      const element = document.getElementById(id)
      if (element) {
        const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 80
        const y = element.getBoundingClientRect().top + window.scrollY - navHeight
        window.scrollTo({ top: y, behavior: 'smooth' })
      }
    }, 100)
  }

  return (
    <LocaleProvider customTranslations={adminSettings?.customTranslations}>
    <>
      {siteData && <StructuredData artistName={siteData.artistName} siteData={siteData} />}
      <PageLayout
        contentClassName={`text-foreground${anim.backgroundImageUrl ? ' bg-transparent' : ' bg-background'}${anim.glitchEnabled === false ? ' no-glitch' : ''}${anim.chromaticEnabled === false ? ' no-chromatic' : ''}`}
        backgroundLayers={
          <BackgroundStack
            backgroundImageUrl={anim.backgroundImageUrl}
            backgroundImageFit={anim.backgroundImageFit}
            backgroundImageOpacity={typeof anim.backgroundImageOpacity === 'number' ? anim.backgroundImageOpacity : 1}
            backgroundImageParallax={anim.backgroundImageParallax === true}
            backgroundImageOverlay={anim.backgroundImageOverlay === true}
            backgroundType={anim.backgroundType}
            circuitBackgroundEnabled={anim.circuitBackgroundEnabled !== false}
            hudTexts={adminSettings?.hudTexts}
            animSettings={anim}
          />
        }
        nav={
          <AppNavBar
            artistName={siteData?.artistName ?? ''}
            editMode={editMode}
            isOwner={isOwner}
            setEditMode={setEditMode}
            hasPassword={!needsSetup}
            setShowLoginDialog={setShowLoginDialog}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            scrollToSection={scrollToSection}
            sectionLabels={sectionLabels}
            sectionVisibility={vis}
          />
        }
        footer={
          <AppFooter
            artistName={siteData?.artistName || ''}
            isOwner={isOwner}
            hasPassword={!needsSetup}
            setShowLoginDialog={setShowLoginDialog}
            setShowSetupDialog={setShowSetupDialog}
            setCyberpunkOverlay={setCyberpunkOverlay}
          />
        }
        globalEffects={
          <GlobalEffects
            crtEnabled={anim.crtEnabled !== false}
            scanlineEnabled={anim.scanlineEnabled !== false}
            noiseEnabled={anim.noiseEnabled !== false}
          />
        }
        overlays={
          <>
            <AnimatePresence>
              {galleryIndex !== null && siteData && (
                <Suspense fallback={null}>
                  <SwipeableGallery
                    images={siteData.gallery}
                    initialIndex={galleryIndex}
                    onClose={() => setGalleryIndex(null)}
                  />
                </Suspense>
              )}
            </AnimatePresence>

            <Suspense fallback={null}>
              <Terminal
                isOpen={terminalOpen}
                onClose={() => setTerminalOpen(false)}
                customCommands={terminalCommands}
                editMode={editMode}
                onSaveCommands={handleSaveTerminalCommands}
                artistName={siteData?.artistName}
              />
            </Suspense>

            <Suspense fallback={null}>
              <StatsDashboard open={showStats} onClose={() => setShowStats(false)} />
            </Suspense>

            <Suspense fallback={null}>
              <CyberpunkOverlay
                overlay={cyberpunkOverlay}
                onClose={() => setCyberpunkOverlay(null)}
                adminSettings={adminSettings}
                artistName={siteData?.artistName}
              />
            </Suspense>

            {isOwner && (
              <EditControls
                editMode={editMode}
                onToggleEdit={() => setEditMode(!editMode)}
                hasPassword={!needsSetup}
                onChangePassword={handleSetAdminPassword}
                onSetPassword={handleSetAdminPassword}
                adminSettings={adminSettings}
                setAdminSettings={handleUpdateAdminSettings}
                siteData={siteData}
                onImportData={(data) => handleUpdateSiteData(data as SiteData)}
                onRefreshSiteData={refetchSiteData}
                onOpenConfigEditor={() => setShowConfigEditor(true)}
                onOpenStats={() => setShowStats(true)}
                onOpenSecurityIncidents={() => setShowSecurityIncidents(true)}
                onOpenSecuritySettings={() => setShowSecuritySettings(true)}
                onOpenBlocklist={() => setShowBlocklist(true)}
                onOpenContactInbox={() => setShowContactInbox(true)}
                onOpenSubscriberList={() => setShowSubscriberList(true)}
                onUpdateSiteData={handleUpdateSiteData}
                onLogout={handleLogout}
              />
            )}

            <Suspense fallback={null}>
              <ConfigEditorDialog
                open={showConfigEditor}
                onClose={() => setShowConfigEditor(false)}
                overrides={adminSettings?.configOverrides || {}}
                onSave={(configOverrides) => handleUpdateAdminSettings({ ...(adminSettings || {}), configOverrides })}
              />
            </Suspense>

            {/* Security admin dialogs — only rendered when admin is logged in */}
            {isOwner && (
              <Suspense fallback={null}>
                <SecurityIncidentsDashboard
                  open={showSecurityIncidents}
                  onClose={() => setShowSecurityIncidents(false)}
                  onViewProfile={(hashedIp) => {
                    setSelectedAttackerIp(hashedIp)
                    setShowAttackerProfile(true)
                  }}
                />
                <SecuritySettingsDialog
                  open={showSecuritySettings}
                  onClose={() => setShowSecuritySettings(false)}
                />
                <BlocklistManagerDialog
                  open={showBlocklist}
                  onClose={() => setShowBlocklist(false)}
                />
                <AttackerProfileDialog
                  open={showAttackerProfile}
                  onClose={() => setShowAttackerProfile(false)}
                  hashedIp={selectedAttackerIp}
                />
                <ContactInboxDialog
                  open={showContactInbox}
                  onClose={() => setShowContactInbox(false)}
                />
                <SubscriberListDialog
                  open={showSubscriberList}
                  onClose={() => setShowSubscriberList(false)}
                />
              </Suspense>
            )}

            {/* Admin Login Dialogs */}
            <AdminLoginDialog
              open={showLoginDialog}
              onOpenChange={setShowLoginDialog}
              mode="login"
              onLogin={handleAdminLogin}
              onSetPassword={handleSetAdminPassword}
            />

            <AdminLoginDialog
              open={showSetupDialog}
              onOpenChange={setShowSetupDialog}
              mode="setup"
              onSetPassword={handleSetupAdminPassword}
            />
          </>
        }
        system={
          <>
            <AnimatePresence>
              {(!siteData || loading) && (() => {
                const lsType = effectiveLoaderType
                if (lsType === 'none') {
                  return null
                }
                if (lsType === 'minimal-bar') {
                  return (
                    <Suspense key="minimal-bar" fallback={null}>
                      <MinimalBarLoader
                        onLoadComplete={() => setLoading(false)}
                        precacheUrls={precacheUrls}
                        mode={anim.loadingScreenMode ?? 'real'}
                        duration={anim.loadingScreenDuration ?? 3}
                        loaderTexts={adminSettings?.loaderTexts}
                      />
                    </Suspense>
                  )
                }
                if (lsType === 'glitch-decode') {
                  return (
                    <Suspense key="glitch-decode" fallback={null}>
                      <GlitchDecodeLoader
                        onLoadComplete={() => setLoading(false)}
                        precacheUrls={precacheUrls}
                        mode={anim.loadingScreenMode ?? 'real'}
                        duration={anim.loadingScreenDuration ?? 3}
                        loaderTexts={adminSettings?.loaderTexts}
                      />
                    </Suspense>
                  )
                }
                // default: 'cyberpunk'
                return (
                  <LoadingScreen
                    key="cyberpunk"
                    onLoadComplete={() => setLoading(false)}
                    precacheUrls={precacheUrls}
                    loaderTexts={adminSettings?.loaderTexts}
                    mode={anim.loadingScreenMode ?? 'real'}
                    duration={anim.loadingScreenDuration ?? 3}
                  />
                )
              })()}
            </AnimatePresence>
            {/* GDPR Cookie Consent Banner */}
            <CookieConsent
              onOpenPrivacyPolicy={() => setCyberpunkOverlay({ type: 'privacy' })}
            />
            <Toaster />
            <SystemMonitorHUD
              decorativeTexts={adminSettings?.decorativeTexts}
              dataCounts={siteData ? {
                releases: siteData.releases?.length ?? 0,
                gigs: siteData.gigs?.length ?? 0,
                tracks: siteData.tracks?.length ?? 0,
                members: siteData.members?.length ?? 0,
              } : undefined}
            />
          </>
        }
      >
        {/* Main content — inside <main className="flex-1 flex flex-col"> */}
        {siteData?.tracks && siteData.tracks.length > 0 && siteData.tracks[0]?.url && (
          <audio src={siteData.tracks[0].url} aria-label="Background music player" />
        )}
        <AppHeroSection
          contentLoaded={contentLoaded}
          editMode={editMode}
          scrollToSection={scrollToSection}
          artistName={siteData?.artistName ?? ''}
          adminSettings={adminSettings}
          sectionVisibility={vis}
          onUpdateSiteData={editMode ? handleUpdateSiteData : undefined}
          siteData={siteData}
          hasCustomBackground={Boolean(anim.backgroundImageUrl)}
        />
        <div className="flex flex-col flex-1">

      {siteData && (<>
      <SectionErrorBoundary sectionName="Biography">
      <AppBioSection
        bio={siteData.bio}
        sectionOrder={getSectionOrder('bio')}
        visible={vis.bio !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.biography || ''}
        adminSettings={adminSettings}
        headingPrefix={sectionLabels.headingPrefix}
        sectionLabels={sectionLabels}
        onLabelChange={editMode ? handleLabelChange : undefined}
        onUpdate={(bio) => handleUpdateSiteData(prev => ({ ...(prev ?? DEFAULT_SITE_DATA), bio }))}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Shell">
      <ShellSection
        editMode={editMode}
        adminSettings={adminSettings}
        setAdminSettings={handleUpdateAdminSettings}
        sectionOrder={getSectionOrder('shell')}
        visible={vis.shell !== false}
        sectionLabel={sectionLabels.shell || ''}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Credit Highlights">
      <CreditHighlightsSection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('creditHighlights')}
        visible={vis.creditHighlights !== false}
        sectionLabel={sectionLabels.creditHighlights || ''}
        sectionLabels={sectionLabels}
        onLabelChange={editMode ? handleLabelChange : undefined}
        onUpdateSiteData={editMode ? handleUpdateSiteData : undefined}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Music">
      <AppMusicSection
        sectionOrder={getSectionOrder('music')}
        visible={vis.music !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.musicPlayer || ''}
        adminSettings={adminSettings}
        sectionLabels={sectionLabels}
        onLabelChange={editMode ? handleLabelChange : undefined}
        spotifyUrl={siteData?.social?.spotify}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Gigs">
      <AppGigsSection
        gigs={siteData.gigs}
        sectionOrder={getSectionOrder('gigs')}
        visible={vis.gigs !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.upcomingGigs || ''}
        headingPrefix={sectionLabels.headingPrefix}
        adminSettings={adminSettings}
        bandsintownFetching={bandsintownFetching}
        sectionLabels={sectionLabels}
        onLabelChange={editMode ? handleLabelChange : undefined}
        onGigClick={(gig) => setCyberpunkOverlay({ type: 'gig', data: gig })}
        onRefresh={editMode ? handleFetchBandsintownEvents : undefined}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Releases">
      <AppReleasesSection
        releases={siteData.releases}
        sectionOrder={getSectionOrder('releases')}
        visible={vis.releases !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.releases || ''}
        adminSettings={adminSettings}
        headingPrefix={sectionLabels.headingPrefix}
        iTunesFetching={iTunesFetching}
        hasAutoLoaded={hasAutoLoaded}
        syncProgress={iTunesProgress}
        sectionLabels={sectionLabels}
        onLabelChange={editMode ? handleLabelChange : undefined}
        onReleaseClick={(release) => setCyberpunkOverlay({ type: 'release', data: release })}
        onUpdateRelease={editMode ? (updated: FullRelease) => {
          handleUpdateSiteData(prev => ({
            ...prev,
            releases: prev.releases.map(r =>
              r.id === updated.id ? mergeFullReleaseIntoStored(updated, r) : r
            ),
          }))
        } : undefined}
        onDeleteRelease={editMode ? (id) => {
          handleUpdateSiteData(prev => ({
            ...prev,
            releases: prev.releases.filter(r => r.id !== id),
          }))
        } : undefined}
        onAddRelease={editMode ? (release: FullRelease) => {
          handleUpdateSiteData(prev => ({
            ...prev,
            releases: [...prev.releases, fullReleaseToStored(release)],
          }))
        } : undefined}
        onRefreshReleases={editMode ? handleFetchITunesReleases : undefined}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Gallery">
      <GallerySection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('gallery')}
        visible={vis.gallery !== false}
        sectionLabel={sectionLabels.gallery || ''}
        headingPrefix={sectionLabels.headingPrefix}
        setGalleryIndex={setGalleryIndex}
        adminSettings={adminSettings}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Media">
      <AppMediaSection
        mediaFiles={siteData.mediaFiles?.map(f => ({
          id: f.id,
          name: f.name,
          url: f.url,
          type: f.type === 'image' || f.type === 'pdf' || f.type === 'zip' ? 'download' as const : (f.type as 'audio' | 'youtube' | 'download' | undefined),
          description: f.size,
        })) || []}
        sectionOrder={getSectionOrder('media')}
        visible={vis.media !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.media || ''}
        headingPrefix={sectionLabels.headingPrefix}
        adminSettings={adminSettings}
        onLabelChange={editMode ? handleLabelChange : undefined}
        onUpdate={editMode ? (files) => handleUpdateSiteData(prev => ({
          ...prev,
          mediaFiles: files.map(f => ({
            id: f.id,
            name: f.name,
            url: f.url,
            type: f.type === 'audio' || f.type === 'youtube' ? f.type : 'download' as const,
            size: f.description ?? '',
          })),
        })) : undefined}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Connect">
      <AppSocialSection
        social={siteData.social}
        sectionOrder={getSectionOrder('connect')}
        visible={vis.connect !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.connect || ''}
        headingPrefix={sectionLabels.headingPrefix}
        adminSettings={adminSettings}
        onContactClick={() => setCyberpunkOverlay({ type: 'contact' })}
      />
      </SectionErrorBoundary>

      </>)}
        </div>{/* end flex-1 sections container */}
      </PageLayout>
    </>
    </LocaleProvider>
  )
}

export default App
