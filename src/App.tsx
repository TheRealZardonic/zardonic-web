import { useState, useEffect, useCallback } from 'react'
import React, { Suspense } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useKonami } from '@/hooks/use-konami'
import { CookieConsent } from '@/components/CookieConsent'
import type { Release as FullRelease } from '@/lib/types'
import { fullReleaseToStored, mergeFullReleaseIntoStored } from '@/lib/release-adapters'
import { useAppTheme } from '@/hooks/use-app-theme'
import { useSiteDataSync } from '@/hooks/use-site-data-sync'
import { useAppState } from '@/hooks/use-app-state'
import { useSound } from '@/hooks/use-sound'
import { usePerfLog } from '@/hooks/use-perf-log'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { useLenisContext } from '@/contexts/LenisContext'
import type { SiteData, CyberpunkOverlayState } from '@/lib/app-types'
import { DEFAULT_SITE_DATA } from '@/lib/app-types'
export type { SiteData } from '@/lib/app-types'
import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'
import { LoadingScreen } from '@/components/LoadingScreen'
const MinimalBarLoader = React.lazy(() => import('@/components/MinimalBarLoader'))
const GlitchDecodeLoader = React.lazy(() => import('@/components/GlitchDecodeLoader'))
const SwipeableGallery = React.lazy(() => import('@/components/SwipeableGallery'))
const CyberpunkOverlay = React.lazy(() => import('@/components/CyberpunkOverlay'))
import AppNavBar from '@/components/AppNavBar'
import AppHeroSection from '@/components/AppHeroSection'
import { StructuredData } from '@/components/StructuredData'
import { SectionErrorBoundary } from '@/components/SectionErrorBoundary'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { PageLayout } from '@/layouts/PageLayout'
import { BackgroundStack } from '@/components/BackgroundStack'
import { GlobalEffects } from '@/components/GlobalEffects'
const AppBioSection = React.lazy(() => import('@/components/AppBioSection'))
const AppMusicSection = React.lazy(() => import('@/components/AppMusicSection'))
const AppGigsSection = React.lazy(() => import('@/components/AppGigsSection'))
const AppReleasesSection = React.lazy(() => import('@/components/AppReleasesSection'))
const AppSocialSection = React.lazy(() => import('@/components/AppSocialSection'))
const NewsletterSection = React.lazy(() => import('@/components/NewsletterSection'))
const CreditHighlightsSection = React.lazy(() => import('@/components/CreditHighlightsSection'))
const SponsoringSection = React.lazy(() => import('@/components/SponsoringSection'))
const AppMediaSection = React.lazy(() => import('@/components/AppMediaSection'))
const GallerySection = React.lazy(() => import('@/components/GallerySection'))
const ShellSection = React.lazy(() => import('@/components/ShellSection'))
const AppFooter = React.lazy(() => import('@/components/AppFooter'))
const AdminDialogManager = React.lazy(() =>
  import('@/components/AdminDialogManager').then(m => ({ default: m.AdminDialogManager }))
)
const SystemMonitorHUD = React.lazy(() =>
  import('@/components/SystemMonitorHUD').then(m => ({ default: m.SystemMonitorHUD }))
)

// Code splitting for heavy components
const Terminal = React.lazy(() => import('@/components/Terminal').then(m => ({ default: m.Terminal })))



function App() {
  const konamiActivated = useKonami()
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null)
  const [cyberpunkOverlay, setCyberpunkOverlay] = useState<CyberpunkOverlayState | null>(null)

  const {
    siteData,
    handleUpdateSiteData,
    isSiteDataLoaded,
    refetchSiteData,
    adminSettings,
    handleUpdateAdminSettings,
    handleLabelChange,
    handleSaveTerminalCommands,
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
    precacheUrls,
    anim,
    vis,
    sectionLabels,
    terminalCommands,
    getSectionOrder,
    handleResetReleases,
    handleResetGigs,
  } = useAppState()

  useAppTheme(adminSettings)
  useSound(adminSettings?.sound)
  usePerfLog({ enabled: adminSettings?.devTools?.performanceLogEnabled ?? false })
  const { iTunesFetching, bandsintownFetching, hasAutoLoaded, iTunesProgress, handleFetchBandsintownEvents, handleFetchITunesReleases } = useSiteDataSync(siteData, isSiteDataLoaded, refetchSiteData, isOwner)
  useDocumentTitle(siteData?.artistName ?? '')

  // ── Stable release mutation callbacks (useCallback prevents re-renders of
  //    memoised children when unrelated state changes) ──────────────────────
  const handleUpdateRelease = useCallback((updated: FullRelease) => {
    handleUpdateSiteData(prev => ({
      ...prev,
      releases: prev.releases.map(r =>
        r.id === updated.id ? mergeFullReleaseIntoStored(updated, r) : r
      ),
    }))
  }, [handleUpdateSiteData])

  const handleDeleteRelease = useCallback((id: string) => {
    handleUpdateSiteData(prev => ({
      ...prev,
      releases: prev.releases.filter(r => r.id !== id),
    }))
  }, [handleUpdateSiteData])

  const handleAddRelease = useCallback((release: FullRelease) => {
    handleUpdateSiteData(prev => ({
      ...prev,
      releases: [...prev.releases, fullReleaseToStored(release)],
    }))
  }, [handleUpdateSiteData])

  useEffect(() => {
    if (konamiActivated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTerminalOpen(true)
      toast.success('Terminal activated!')
    }
  }, [konamiActivated])

  const { scrollTo: lenisScrollTo } = useLenisContext()

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    setTimeout(() => {
      const element = document.getElementById(id)
      if (element) {
        const navHeight = document.querySelector('nav')?.getBoundingClientRect().height ?? 80
        lenisScrollTo(element, { offset: -navHeight })
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
            animatedBackgroundEnabled={anim.animationsEnabled !== false && anim.circuitBackgroundEnabled !== false}
            hudTexts={adminSettings?.hud}
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
            adminSettings={adminSettings}
          />
        }
        footer={
          <Suspense fallback={null}>
            <AppFooter
              artistName={siteData?.artistName || ''}
              isOwner={isOwner}
              hasPassword={!needsSetup}
              setShowLoginDialog={setShowLoginDialog}
              setShowSetupDialog={setShowSetupDialog}
              setCyberpunkOverlay={setCyberpunkOverlay}
            />
          </Suspense>
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
              <CyberpunkOverlay
                overlay={cyberpunkOverlay}
                onClose={() => setCyberpunkOverlay(null)}
                adminSettings={adminSettings}
                artistName={siteData?.artistName}
              />
            </Suspense>

            <Suspense fallback={null}>
              <AdminDialogManager
                isOwner={isOwner}
                needsSetup={needsSetup}
                editMode={editMode}
                onToggleEdit={() => setEditMode(!editMode)}
                adminSettings={adminSettings}
                setAdminSettings={handleUpdateAdminSettings}
                siteData={siteData}
                onImportData={(data) => handleUpdateSiteData(data as SiteData)}
                onRefreshSiteData={refetchSiteData}
                onUpdateSiteData={handleUpdateSiteData}
                onLogout={handleLogout}
                onFetchBandsintown={handleFetchBandsintownEvents}
                onFetchITunes={handleFetchITunesReleases}
                onResetReleases={handleResetReleases}
                onResetGigs={handleResetGigs}
                onChangePassword={handleSetAdminPassword}
                onSetPassword={handleSetAdminPassword}
                onAdminLogin={handleAdminLogin}
                onSetupAdminPassword={handleSetupAdminPassword}
                showLoginDialog={showLoginDialog}
                setShowLoginDialog={setShowLoginDialog}
                showSetupDialog={showSetupDialog}
                setShowSetupDialog={setShowSetupDialog}
                terminalCommands={terminalCommands}
              />
            </Suspense>
          </>
        }
        system={
          <>
            <AnimatePresence>
              {(!siteData || loading) && (() => {
                const lsType = activeLoaderType
                if (lsType === 'none') return null
                if (lsType === 'minimal-bar') {
                  return (
                    <Suspense key="minimal-bar" fallback={null}>
                      <MinimalBarLoader
                        onLoadComplete={() => setLoading(false)}
                        precacheUrls={precacheUrls}
                        mode={anim.loadingScreenMode ?? 'real'}
                        duration={anim.loadingScreenDuration ?? 3}
                        loaderTexts={adminSettings?.loader}
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
                        loaderTexts={adminSettings?.loader}
                      />
                    </Suspense>
                  )
                }
                return (
                  <LoadingScreen
                    key="cyberpunk"
                    onLoadComplete={() => setLoading(false)}
                    precacheUrls={precacheUrls}
                    loaderTexts={adminSettings?.loader}
                    mode={anim.loadingScreenMode ?? 'real'}
                    duration={anim.loadingScreenDuration ?? 3}
                  />
                )
              })()}
            </AnimatePresence>
            <CookieConsent
              onOpenPrivacyPolicy={() => setCyberpunkOverlay({ type: 'privacy' })}
            />
            <Toaster />
            <Suspense fallback={null}>
              <SystemMonitorHUD
                decorativeTexts={adminSettings?.decorative}
                dataCounts={siteData ? {
                  releases: siteData.releases?.length ?? 0,
                  gigs: siteData.gigs?.length ?? 0,
                  tracks: siteData.tracks?.length ?? 0,
                  members: siteData.members?.length ?? 0,
                } : undefined}
              />
            </Suspense>
          </>
        }
      >
        {siteData?.tracks && siteData.tracks.length > 0 && siteData.tracks[0]?.url && (
          <audio src={siteData.tracks[0].url} aria-hidden="true" />
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
      <Suspense fallback={null}>
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
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Shell">
      <Suspense fallback={null}>
      <ShellSection
        editMode={editMode}
        adminSettings={adminSettings}
        setAdminSettings={handleUpdateAdminSettings}
        sectionOrder={getSectionOrder('shell')}
        visible={vis.shell !== false}
        sectionLabel={sectionLabels.shell || ''}
      />
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Credit Highlights">
      <Suspense fallback={null}>
      <CreditHighlightsSection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('creditHighlights')}
        visible={vis.creditHighlights !== false}
        sectionLabel={sectionLabels.creditHighlights || ''}
        sectionLabels={sectionLabels}
        adminSettings={adminSettings}
        onLabelChange={editMode ? handleLabelChange : undefined}
        onUpdateSiteData={editMode ? handleUpdateSiteData : undefined}
      />
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Music">
      <Suspense fallback={null}>
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
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Gigs">
      <Suspense fallback={null}>
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
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Releases">
      <Suspense fallback={null}>
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
        onUpdateRelease={editMode ? handleUpdateRelease : undefined}
        onDeleteRelease={editMode ? handleDeleteRelease : undefined}
        onAddRelease={editMode ? handleAddRelease : undefined}
        onRefreshReleases={editMode ? handleFetchITunesReleases : undefined}
      />
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Gallery">
      <Suspense fallback={null}>
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
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Media">
      <Suspense fallback={null}>
      <AppMediaSection
        mediaFiles={siteData.mediaFiles?.map(f => ({
          id: f.id,
          name: f.name,
          url: f.url,
          type: f.type,
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
            type: (f.type ?? 'download') as 'audio' | 'youtube' | 'download',
            size: f.description ?? '',
          })),
        })) : undefined}
      />
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Newsletter">
      <Suspense fallback={null}>
      <NewsletterSection
        newsletterSettings={adminSettings?.newsletter}
        sectionOrder={getSectionOrder('newsletter')}
        editMode={editMode}
        sectionLabels={sectionLabels}
        onLabelChange={editMode ? handleLabelChange : undefined}
        adminSettings={adminSettings}
        onUpdate={editMode ? (s) => handleUpdateAdminSettings({ ...adminSettings, newsletter: s }) : undefined}
      />
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Connect">
      <Suspense fallback={null}>
      <AppSocialSection
        social={siteData.social}
        sectionOrder={getSectionOrder('connect')}
        visible={vis.connect !== false}
        editMode={editMode}
        sectionLabel={sectionLabels.connect || ''}
        headingPrefix={sectionLabels.headingPrefix}
        adminSettings={adminSettings}
        onContactClick={() => setCyberpunkOverlay({ type: 'contact' })}
        setAdminSettings={editMode ? handleUpdateAdminSettings : undefined}
      />
      </Suspense>
      </SectionErrorBoundary>

      <SectionErrorBoundary sectionName="Sponsoring">
      <Suspense fallback={null}>
      <SponsoringSection
        siteData={siteData}
        editMode={editMode}
        sectionOrder={getSectionOrder('sponsoring')}
        visible={vis.sponsoring !== false}
        sectionLabel={sectionLabels.sponsoring || ''}
        sectionLabels={sectionLabels}
        adminSettings={adminSettings}
        onLabelChange={editMode ? handleLabelChange : undefined}
        onUpdateSiteData={editMode ? handleUpdateSiteData : undefined}
      />
      </Suspense>
      </SectionErrorBoundary>

      </>)}
        </div>
      </PageLayout>
    </>
    </LocaleProvider>
  )
}

export default App
