import { useState, useEffect, useCallback, useMemo } from 'react'
import React, { Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useKV } from '@/hooks/use-kv'
import { useKonami } from '@/hooks/use-konami'
import { trackPageView, trackHeatmapClick } from '@/hooks/use-analytics'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import type { AdminSettings, BackgroundType, SectionLabels } from '@/lib/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSiteDataSync } from '@/hooks/use-site-data-sync'
import type { SiteData, CyberpunkOverlayState } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'
import { DEFAULT_SECTION_ORDER } from '@/lib/config'
export type { SiteData } from '@/lib/app-types'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { SwipeableGallery } from '@/components/SwipeableGallery'
import { LoadingScreen } from '@/components/LoadingScreen'
import { CircuitBackground } from '@/components/CircuitBackground'
import CyberpunkBackground from '@/components/CyberpunkBackground'
const MatrixRain = React.lazy(() => import('@/components/MatrixRain'))
const StarField = React.lazy(() => import('@/components/StarField'))
import AdminLoginDialog from '@/components/AdminLoginDialog'
import EditControls from '@/components/EditControls'
const ConfigEditorDialog = React.lazy(() => import('@/components/ConfigEditorDialog'))
import { MediaBrowser } from '@/components/MediaBrowser'
import { SystemMonitorHUD } from '@/components/SystemMonitorHUD'
import ContactSection from '@/components/ContactSection'
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
import CyberpunkOverlay from '@/components/CyberpunkOverlay'
import { StructuredData } from '@/components/StructuredData'
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary'
import { useDocumentTitle } from '@/hooks/use-document-title'

/** Render the correct background component based on the configured type */
function BackgroundLayer({ type }: { type: BackgroundType | undefined }) {
  const bg = type ?? 'circuit'
  if (bg === 'circuit') return <CircuitBackground />
  if (bg === 'cyberpunk-hud') return <CyberpunkBackground />
  if (bg === 'matrix') return <Suspense fallback={null}><MatrixRain /></Suspense>
  if (bg === 'stars') return <Suspense fallback={null}><StarField /></Suspense>
  // 'minimal' – no decorative background
  return null
}

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

  // Track page view on mount
  useEffect(() => {
    trackPageView()
  }, [])

  // Track heatmap clicks globally
  useEffect(() => {
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
  }, [])

  const [siteData, setSiteData] = useState<SiteData | undefined>(undefined)
  const [adminSettings, setAdminSettings] = useState<AdminSettings | undefined>(undefined)

  const [kvSiteData, setKvSiteData, isSiteDataLoaded] = useKV<SiteData>('band-data', DEFAULT_SITE_DATA)
  const [kvAdminSettings, setKvAdminSettings, isAdminSettingsLoaded] = useKV<AdminSettings | undefined>('admin:settings', undefined)

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

  const handleLabelChange = useCallback((key: keyof SectionLabels, value: string) => {
    setAdminSettings(prev => {
      const next = { ...(prev ?? {}), sectionLabels: { ...(prev?.sectionLabels ?? {}), [key]: value } }
      setKvAdminSettings(next)
      return next
    })
  }, [setKvAdminSettings])

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
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

  const sectionOrder = adminSettings?.sectionOrder ?? DEFAULT_SECTION_ORDER
  const getSectionOrder = useCallback((section: string) => {
    const idx = sectionOrder.indexOf(section)
    return idx >= 0 ? idx : DEFAULT_SECTION_ORDER.indexOf(section)
  }, [sectionOrder])

  useAppTheme(adminSettings)
  const { iTunesFetching, bandsintownFetching, hasAutoLoaded } = useSiteDataSync(siteData, setSiteData)
  useDocumentTitle(siteData?.artistName ?? '')

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
    if (result === true) return { success: true }
    if (result === 'totp-required') return { success: false, totpRequired: true }
    return { success: false }
  }, [_handleAdminLogin])

  const handleSetAdminPassword = useCallback(async (password: string): Promise<void> => {
    await handleChangeAdminPassword(password)
  }, [handleChangeAdminPassword])

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

  if (!siteData) {
    return <LoadingScreen onLoadComplete={() => setLoading(false)} precacheUrls={precacheUrls} loaderTexts={adminSettings?.loaderTexts} />
  }

  return (
    <>
      <StructuredData artistName={siteData.artistName} siteData={siteData} />
      <AnimatePresence>
        {loading && (
          <LoadingScreen onLoadComplete={() => setLoading(false)} precacheUrls={precacheUrls} loaderTexts={adminSettings?.loaderTexts} />
        )}
      </AnimatePresence>

      <div className={`min-h-screen bg-background text-foreground relative${anim.glitchEnabled === false ? ' no-glitch' : ''}${anim.chromaticEnabled === false ? ' no-chromatic' : ''}`}>
      {anim.crtEnabled !== false && <div className="crt-overlay" />}
      {anim.crtEnabled !== false && <div className="crt-vignette" />}
      {anim.scanlineEnabled !== false && <div className="crt-scanline-bg" />}
      {anim.noiseEnabled !== false && <div className="full-page-noise periodic-noise-glitch" />}
      {anim.circuitBackgroundEnabled !== false && <BackgroundLayer type={anim.backgroundType} />}
      <SystemMonitorHUD />
      
      <Toaster />
      {siteData.tracks.length > 0 && siteData.tracks[0]?.url && (
        <audio src={siteData.tracks[0].url} aria-label="Background music player" />
      )}

      <AppNavBar
        artistName={siteData.artistName}
        editMode={editMode}
        isOwner={isOwner}
        setEditMode={setEditMode}
        hasPassword={!needsSetup}
        setShowLoginDialog={setShowLoginDialog}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        scrollToSection={scrollToSection}
      />

      <AppHeroSection
        contentLoaded={contentLoaded}
        editMode={editMode}
        scrollToSection={scrollToSection}
        artistName={siteData.artistName}
      />

      <div className="flex flex-col">

      <SectionErrorBoundary sectionName="Biography">
      <AppBioSection
        bio={siteData.bio}
        sectionOrder={getSectionOrder('bio')}
        visible={vis.bio !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.biography || ''}
        adminSettings={adminSettings}
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
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Gigs">
      <AppGigsSection
        gigs={siteData.gigs}
        sectionOrder={getSectionOrder('gigs')}
        visible={vis.gigs !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.upcomingGigs || ''}
        adminSettings={adminSettings}
        bandsintownFetching={bandsintownFetching}
        onGigClick={(gig) => setCyberpunkOverlay({ type: 'gig', data: gig })}
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
        iTunesFetching={iTunesFetching}
        hasAutoLoaded={hasAutoLoaded}
        onReleaseClick={(release) => setCyberpunkOverlay({ type: 'release', data: release })}
      />
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Gallery">
      <GallerySection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('gallery')}
        visible={vis.gallery !== false}
        sectionLabel={sectionLabels.gallery || ''}
        setGalleryIndex={setGalleryIndex}
        adminSettings={adminSettings}
      />
      </SectionErrorBoundary>

      <div style={{ order: getSectionOrder('media') }}>
      <Separator className="bg-border" />

      <SectionErrorBoundary sectionName="Media">
      <MediaBrowser
        mediaFiles={siteData.mediaFiles?.map(f => ({
          id: f.id,
          name: f.name,
          url: f.url,
          type: f.type === 'image' || f.type === 'pdf' || f.type === 'zip' ? 'download' as const : (f.type as 'audio' | 'youtube' | 'download' | undefined),
          description: f.size,
        })) || []}
        editMode={editMode}
      />
      </SectionErrorBoundary>
      </div>

      <SectionErrorBoundary sectionName="Connect">
      <AppSocialSection
        social={siteData.social}
        sectionOrder={getSectionOrder('connect')}
        visible={vis.connect !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.connect || ''}
        adminSettings={adminSettings}
        onContactClick={() => setCyberpunkOverlay({ type: 'contact' })}
      />
      </SectionErrorBoundary>

      {/* Contact Section */}
      <div style={{ order: getSectionOrder('contact') }}>
      {vis.contact !== false && (
        <SectionErrorBoundary sectionName="Contact">
        <ContactSection
          contactSettings={contactSettings}
          editMode={editMode}
          sectionLabels={sectionLabels}
        />
        </SectionErrorBoundary>
      )}
      </div>

      </div>{/* end flex container for reorderable sections */}

      <AppFooter
        artistName={siteData?.artistName || ''}
        isOwner={isOwner}
        hasPassword={!needsSetup}
        setShowLoginDialog={setShowLoginDialog}
        setShowSetupDialog={setShowSetupDialog}
        setCyberpunkOverlay={setCyberpunkOverlay}
      />

      <AnimatePresence>
        {galleryIndex !== null && siteData && (
          <SwipeableGallery
            images={siteData.gallery}
            initialIndex={galleryIndex}
            onClose={() => setGalleryIndex(null)}
          />
        )}
      </AnimatePresence>

      <Suspense fallback={null}>
        <Terminal
          isOpen={terminalOpen}
          onClose={() => setTerminalOpen(false)}
          customCommands={terminalCommands}
          editMode={editMode}
          onSaveCommands={(() => {})}
        />
      </Suspense>

      <Suspense fallback={null}>
        <StatsDashboard open={showStats} onClose={() => setShowStats(false)} />
      </Suspense>

      <CyberpunkOverlay
        overlay={cyberpunkOverlay}
        onClose={() => setCyberpunkOverlay(null)}
        adminSettings={adminSettings}
      />


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
          onOpenConfigEditor={() => setShowConfigEditor(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenSecurityIncidents={() => setShowSecurityIncidents(true)}
          onOpenSecuritySettings={() => setShowSecuritySettings(true)}
          onOpenBlocklist={() => setShowBlocklist(true)}
          onOpenContactInbox={() => setShowContactInbox(true)}
          onOpenSubscriberList={() => setShowSubscriberList(true)}
          onUpdateSiteData={handleUpdateSiteData}
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
    </div>
    </>
  )
}

export default App
