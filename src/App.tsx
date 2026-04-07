import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import React, { Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useKV } from '@/hooks/use-kv'
import { useKonami } from '@/hooks/use-konami'
import { trackPageView, trackHeatmapClick } from '@/hooks/use-analytics'
import { useAdminAuth } from '@/hooks/use-admin-auth'
import type { AdminSettings } from '@/lib/types'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSiteDataSync } from '@/hooks/use-site-data-sync'
import type { SiteData, CyberpunkOverlayState } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'
export type { SiteData } from '@/lib/app-types'
import { Separator } from '@/components/ui/separator'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { SwipeableGallery } from '@/components/SwipeableGallery'
import { LoadingScreen } from '@/components/LoadingScreen'
import { CircuitBackground } from '@/components/CircuitBackground'
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
  const wantsSetup = useRef(false)
  
  useEffect(() => {
    if (konamiActivated) {
      setTerminalOpen(true)
      toast.success('Terminal activated!')
    }
  }, [konamiActivated])

  // Check for ?admin-setup URL parameter on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('admin-setup')) {
      wantsSetup.current = true
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('admin-setup')
      window.history.replaceState({}, '', url.toString())
    }
  }, [])

  // Open setup dialog when auth check confirms no password exists and user requested setup
  useEffect(() => {
    if (wantsSetup.current && needsSetup) {
      wantsSetup.current = false
      setShowSetupDialog(true)
    }
  }, [needsSetup])

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

  const [kvSiteData, , isSiteDataLoaded] = useKV<SiteData>('band-data', DEFAULT_SITE_DATA)
  const [kvAdminSettings, , isAdminSettingsLoaded] = useKV<AdminSettings | undefined>('admin:settings', undefined)

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

  const [currentTrackIndex] = useState(0)
  const [volume] = useState([80])
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

  const DEFAULT_SECTION_ORDER = ['bio', 'shell', 'creditHighlights', 'music', 'gigs', 'releases', 'gallery', 'media', 'connect', 'contact']
  const sectionOrder = adminSettings?.sectionOrder ?? DEFAULT_SECTION_ORDER
  const getSectionOrder = useCallback((section: string) => {
    const idx = sectionOrder.indexOf(section)
    return idx >= 0 ? idx : DEFAULT_SECTION_ORDER.indexOf(section)
  }, [sectionOrder])

  useAppTheme(adminSettings)
  const { iTunesFetching, bandsintownFetching, hasAutoLoaded } = useSiteDataSync(siteData, setSiteData)

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
  const [language, setLanguage] = useState<'en' | 'de'>('en')

  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100
    }
  }, [volume])

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

  const currentTrack = siteData?.tracks[currentTrackIndex]

  if (!siteData) {
    return <LoadingScreen onLoadComplete={() => setLoading(false)} precacheUrls={precacheUrls} />
  }

  return (
    <>
      <AnimatePresence>
        {loading && (
          <LoadingScreen onLoadComplete={() => setLoading(false)} precacheUrls={precacheUrls} />
        )}
      </AnimatePresence>

      <div className={`min-h-screen bg-background text-foreground relative${anim.glitchEnabled === false ? ' no-glitch' : ''}${anim.chromaticEnabled === false ? ' no-chromatic' : ''}`}>
      {anim.crtEnabled !== false && <div className="crt-overlay" />}
      {anim.crtEnabled !== false && <div className="crt-vignette" />}
      {anim.scanlineEnabled !== false && <div className="crt-scanline-bg" />}
      {anim.noiseEnabled !== false && <div className="full-page-noise periodic-noise-glitch" />}
      {anim.circuitBackgroundEnabled !== false && <CircuitBackground />}
      <SystemMonitorHUD />
      
      <Toaster />
      <audio ref={audioRef} src={currentTrack?.url} />

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

      <AppBioSection
        bio={siteData.bio}
        sectionOrder={getSectionOrder('bio')}
        visible={vis.bio !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.biography || ''}
        adminSettings={adminSettings}
      />

      <ShellSection
        editMode={editMode}
        adminSettings={adminSettings}
        sectionOrder={getSectionOrder('shell')}
        visible={vis.shell !== false}
        sectionLabel={sectionLabels.shell || ''}
      />

      <CreditHighlightsSection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('creditHighlights')}
        visible={vis.creditHighlights !== false}
        sectionLabel={sectionLabels.creditHighlights || ''}
      />

      <AppMusicSection
        sectionOrder={getSectionOrder('music')}
        visible={vis.music !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.musicPlayer || ''}
        adminSettings={adminSettings}
      />

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

      <GallerySection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('gallery')}
        visible={vis.gallery !== false}
        sectionLabel={sectionLabels.gallery || ''}
        setGalleryIndex={setGalleryIndex}
        adminSettings={adminSettings}
      />

      <div style={{ order: getSectionOrder('media') }}>
      <Separator className="bg-border" />

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
      </div>

      <AppSocialSection
        social={siteData.social}
        sectionOrder={getSectionOrder('connect')}
        visible={vis.connect !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.connect || ''}
        adminSettings={adminSettings}
        onContactClick={() => setCyberpunkOverlay({ type: 'contact' })}
      />

      {/* Contact Section */}
      <div style={{ order: getSectionOrder('contact') }}>
      {vis.contact !== false && (
        <ContactSection
          contactSettings={contactSettings}
          editMode={editMode}
          sectionLabels={sectionLabels}
        />
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
        setLanguage={setLanguage}
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
        language={language}
        setLanguage={setLanguage}
      />


      {isOwner && (
        <EditControls
          editMode={editMode}
          onToggleEdit={() => setEditMode(!editMode)}
          hasPassword={!needsSetup}
          onChangePassword={handleSetAdminPassword}
          onSetPassword={handleSetAdminPassword}
          adminSettings={adminSettings}
          onOpenConfigEditor={() => setShowConfigEditor(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenSecurityIncidents={() => setShowSecurityIncidents(true)}
          onOpenSecuritySettings={() => setShowSecuritySettings(true)}
          onOpenBlocklist={() => setShowBlocklist(true)}
          onOpenContactInbox={() => setShowContactInbox(true)}
          onOpenSubscriberList={() => setShowSubscriberList(true)}
        />
      )}

      <Suspense fallback={null}>
        <ConfigEditorDialog
          open={showConfigEditor}
          onClose={() => setShowConfigEditor(false)}
          overrides={adminSettings?.configOverrides || {}}
          onSave={(configOverrides) => setAdminSettings((prev) => ({ ...(prev || {}), configOverrides }))}
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
