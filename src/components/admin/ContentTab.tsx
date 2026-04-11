// @deprecated — functionality superseded by src/cms/editors/. Do not extend; use the CMS editors instead.
import { useState } from 'react'
import { Separator } from '@/components/ui/separator'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { AdminSettings, SectionLabels, ContactInfo, LoaderTexts, DecorativeTexts } from '@/lib/types'
import type { SiteData } from '@/App'

const SOCIAL_FIELDS: { key: keyof SiteData['social']; label: string; placeholder: string }[] = [
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/...' },
  { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/...' },
  { key: 'spotify', label: 'Spotify', placeholder: 'https://open.spotify.com/...' },
  { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/...' },
  { key: 'soundcloud', label: 'SoundCloud', placeholder: 'https://soundcloud.com/...' },
  { key: 'bandcamp', label: 'Bandcamp', placeholder: 'https://....bandcamp.com' },
  { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
  { key: 'appleMusic', label: 'Apple Music', placeholder: 'https://music.apple.com/...' },
  { key: 'twitter', label: 'Twitter / X', placeholder: 'https://x.com/...' },
  { key: 'twitch', label: 'Twitch', placeholder: 'https://twitch.tv/...' },
  { key: 'beatport', label: 'Beatport', placeholder: 'https://www.beatport.com/...' },
  { key: 'linktree', label: 'Linktree', placeholder: 'https://linktr.ee/...' },
]

const SECTION_LABEL_FIELDS: { key: keyof SectionLabels; label: string; placeholder: string }[] = [
  { key: 'biography', label: 'Biography Heading', placeholder: 'BIOGRAPHY' },
  { key: 'musicPlayer', label: 'Music Player Heading', placeholder: 'MUSIC' },
  { key: 'musicStreamLabel', label: 'Music Stream HUD Label', placeholder: '// SPOTIFY.STREAM.INTERFACE' },
  { key: 'musicStatusLabel', label: 'Music Status HUD Label', placeholder: '// STATUS: [STREAMING]' },
  { key: 'upcomingGigs', label: 'Upcoming Gigs Heading', placeholder: 'UPCOMING GIGS' },
  { key: 'gigsLoadingLabel', label: 'Gigs Loading HUD Label', placeholder: '// LOADING.BANDSINTOWN.EVENTS' },
  { key: 'gigsSyncingText', label: 'Gigs Syncing Text', placeholder: 'SYNCING...' },
  { key: 'gigsFetchingText', label: 'Gigs Fetching Text', placeholder: 'FETCHING LIVE EVENT DATA' },
  { key: 'gigsNoShowsText', label: 'Gigs Empty State Text', placeholder: 'No upcoming shows - Check back soon' },
  { key: 'releases', label: 'Releases Heading', placeholder: 'RELEASES' },
  { key: 'releasesLoadingLabel', label: 'Releases Loading HUD Label', placeholder: '// LOADING.ITUNES.RELEASES' },
  { key: 'releasesSyncingText', label: 'Releases Syncing Text', placeholder: 'SYNCING...' },
  { key: 'releasesFetchingText', label: 'Releases Fetching Text', placeholder: 'FETCHING DISCOGRAPHY + STREAMING LINKS' },
  { key: 'releasesEmptyText', label: 'Releases Empty State Text', placeholder: 'Releases coming soon' },
  { key: 'releasesShowAllText', label: 'Releases Show All Button', placeholder: 'Show All' },
  { key: 'releasesShowLessText', label: 'Releases Show Less Button', placeholder: 'Show Less' },
  { key: 'bioReadMoreText', label: 'Bio Read More Button', placeholder: 'Read More' },
  { key: 'bioShowLessText', label: 'Bio Show Less Button', placeholder: 'Show Less' },
  { key: 'gallery', label: 'Gallery Heading', placeholder: 'GALLERY' },
  { key: 'connect', label: 'Connect Heading', placeholder: 'CONNECT' },
  { key: 'creditHighlights', label: 'Credit Highlights Heading', placeholder: 'CREDITS' },
  { key: 'contact', label: 'Contact Heading', placeholder: 'CONTACT' },
  { key: 'shell', label: 'Shell Section Heading', placeholder: 'SHELL' },
  { key: 'media', label: 'Media Section Heading', placeholder: 'MEDIA' },
  { key: 'headingPrefix', label: 'Heading Prefix', placeholder: '// ' },
]

const CONTACT_INFO_FIELDS: { key: keyof ContactInfo; label: string; placeholder: string }[] = [
  { key: 'managementName', label: 'Management Name', placeholder: 'Management Co.' },
  { key: 'managementEmail', label: 'Management Email', placeholder: 'mgmt@example.com' },
  { key: 'bookingEmail', label: 'Booking Email', placeholder: 'booking@example.com' },
  { key: 'pressEmail', label: 'Press Email', placeholder: 'press@example.com' },
  { key: 'formTitle', label: 'Form Title', placeholder: 'GET IN TOUCH' },
  { key: 'formButtonText', label: 'Submit Button Text', placeholder: 'SEND MESSAGE' },
]

interface ContentTabProps {
  adminSettings?: AdminSettings | null
  setAdminSettings?: (s: AdminSettings) => void
  onUpdateSiteData?: (updater: SiteData | ((current: SiteData) => SiteData)) => void
  localArtistName: string
  setLocalArtistName: (v: string) => void
  localBio: string
  setLocalBio: (v: string) => void
  localHeroImage: string
  setLocalHeroImage: (v: string) => void
  localSocial: SiteData['social']
  setLocalSocial: (v: SiteData['social']) => void
  localSectionLabels: SectionLabels
  setLocalSectionLabels: (v: SectionLabels) => void
  localContactInfo: ContactInfo
  setLocalContactInfo: (v: ContactInfo | ((prev: ContactInfo) => ContactInfo)) => void
}

export default function ContentTab({
  adminSettings,
  setAdminSettings,
  onUpdateSiteData,
  localArtistName,
  setLocalArtistName,
  localBio,
  setLocalBio,
  localHeroImage,
  setLocalHeroImage,
  localSocial,
  setLocalSocial,
  localSectionLabels,
  setLocalSectionLabels,
  localContactInfo,
  setLocalContactInfo,
}: ContentTabProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
      {/* Artist Name */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Artist Name
        </h3>
        <Input
          value={localArtistName}
          onChange={(e) => setLocalArtistName(e.target.value)}
          placeholder="Artist Name"
          className="bg-background border-border font-mono text-sm"
        />
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => {
            onUpdateSiteData?.((prev) => ({ ...prev, artistName: localArtistName }))
            toast.success('Artist name saved')
          }}
          disabled={!onUpdateSiteData}
        >
          Save Artist Name
        </Button>
      </section>

      <Separator />

      {/* Biography */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Biography
        </h3>
        <textarea
          value={localBio}
          onChange={(e) => setLocalBio(e.target.value)}
          placeholder="Artist biography..."
          rows={6}
          className="w-full bg-background border border-border rounded-md px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => {
            onUpdateSiteData?.((prev) => ({ ...prev, bio: localBio }))
            toast.success('Biography saved')
          }}
          disabled={!onUpdateSiteData}
        >
          Save Biography
        </Button>
      </section>

      <Separator />

      {/* Hero Image */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Hero Image URL
        </h3>
        <Input
          value={localHeroImage}
          onChange={(e) => setLocalHeroImage(e.target.value)}
          placeholder="https://example.com/hero.jpg"
          className="bg-background border-border font-mono text-xs"
        />
        {localHeroImage && (() => {
          try {
            const parsed = new URL(localHeroImage)
            return parsed.protocol === 'https:' || parsed.protocol === 'http:'
          } catch { return false }
        })() && (
          <img
            src={localHeroImage}
            alt="Hero preview"
            className="w-full h-24 object-cover rounded border border-border"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        )}
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => {
            onUpdateSiteData?.((prev) => ({ ...prev, heroImage: localHeroImage }))
            toast.success('Hero image saved')
          }}
          disabled={!onUpdateSiteData}
        >
          Save Hero Image
        </Button>
      </section>

      <Separator />

      {/* Social Links */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Social Links
        </h3>
        <div className="space-y-2">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
              <Input
                value={localSocial[key] ?? ''}
                onChange={(e) =>
                  setLocalSocial({ ...localSocial, [key]: e.target.value })
                }
                placeholder={placeholder}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => {
            onUpdateSiteData?.((prev) => ({ ...prev, social: localSocial }))
            toast.success('Social links saved')
          }}
          disabled={!onUpdateSiteData}
        >
          Save Social Links
        </Button>
      </section>

      <Separator />

      {/* Section Labels */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Section Labels
        </h3>
        <div className="space-y-2">
          {SECTION_LABEL_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
              <Input
                value={(localSectionLabels[key] as string) ?? ''}
                onChange={(e) =>
                  setLocalSectionLabels({ ...localSectionLabels, [key]: e.target.value })
                }
                placeholder={placeholder}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => {
            setAdminSettings?.({ ...(adminSettings ?? {}), labels: localSectionLabels })
            toast.success('Section labels saved')
          }}
          disabled={!setAdminSettings}
        >
          Save Section Labels
        </Button>
      </section>

      <Separator />

      {/* Contact Info */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Contact Info
        </h3>
        <div className="space-y-2">
          {CONTACT_INFO_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="font-mono text-[11px] text-muted-foreground">{label}</Label>
              <Input
                value={localContactInfo[key] ?? ''}
                onChange={(e) =>
                  setLocalContactInfo((prev) => ({ ...prev, [key]: e.target.value }))
                }
                placeholder={placeholder}
                className="bg-background border-border font-mono text-xs"
              />
            </div>
          ))}
        </div>
        <Button
          size="sm"
          className="font-mono text-xs"
          onClick={() => {
            setAdminSettings?.({ ...adminSettings, contact: localContactInfo })
            toast.success('Contact info saved')
          }}
          disabled={!setAdminSettings}
        >
          Save Contact Info
        </Button>
      </section>

      <Separator />

      {/* Loader Texts Editor */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Loading Screen Texts
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          Customise every string shown during the loading screen. Leave blank to use the default text.
        </p>
        {([
          { field: 'titleLabel' as keyof LoaderTexts, label: 'Title label', placeholder: 'ZARDONIC.SYS v2.077' },
          { field: 'buildInfo' as keyof LoaderTexts, label: 'Build info (bottom left)', placeholder: 'BUILD: 2077.v1.23' },
          { field: 'platformInfo' as keyof LoaderTexts, label: 'Platform info (bottom left)', placeholder: 'PLATFORM: WEB.NEURAL' },
          { field: 'connectionStatus' as keyof LoaderTexts, label: 'Connection status (bottom right)', placeholder: 'CONNECTION: SECURE' },
        ] as { field: keyof LoaderTexts; label: string; placeholder: string }[]).map(({ field, label, placeholder }) => (
          <div key={field} className="space-y-1">
            <Label className="font-mono text-xs text-muted-foreground">{label}</Label>
            <Input
              value={(adminSettings?.loader?.[field] ?? '') as string}
              onChange={e => {
                const val = e.target.value
                setAdminSettings?.({
                  ...adminSettings,
                  loader: { ...adminSettings?.loader, [field]: val || undefined },
                })
              }}
              className="font-mono text-xs"
              placeholder={placeholder}
            />
          </div>
        ))}
        <div className="space-y-1">
          <Label className="font-mono text-xs text-muted-foreground">Stage messages (5 lines, one per line)</Label>
          <textarea
            rows={5}
            className="w-full bg-transparent border border-primary/30 text-foreground font-mono text-xs p-2 resize-y focus:outline-none focus:border-primary/60"
            placeholder={'INITIALIZING NEURAL INTERFACE\nLOADING CORE SYSTEMS\nSYNCHRONIZING WETWARE\nESTABLISHING CONNECTION\nSYSTEM READY'}
            value={(adminSettings?.loader?.stageMessages ?? []).join('\n')}
            onChange={e => {
              const lines = e.target.value.split('\n').slice(0, 5)
              setAdminSettings?.({
                ...adminSettings,
                loader: { ...adminSettings?.loader, stageMessages: lines.length ? lines : undefined },
              })
            }}
          />
        </div>

        {/* systemChecks inputs */}
        {([
          { index: 0, label: 'System check label 1', placeholder: 'WETWARE' },
          { index: 1, label: 'System check label 2', placeholder: 'NEURAL' },
          { index: 2, label: 'System check label 3', placeholder: 'CYBERDECK' },
        ] as { index: 0 | 1 | 2; label: string; placeholder: string }[]).map(({ index, label, placeholder }) => (
          <div key={`systemCheck-${index}`} className="space-y-1">
            <Label className="font-mono text-xs text-muted-foreground">{label}</Label>
            <Input
              value={adminSettings?.loader?.systemChecks?.[index] ?? ''}
              onChange={e => {
                const val = e.target.value
                const cur = adminSettings?.loader?.systemChecks ?? ['', '', '']
                const next: [string, string, string] = index === 0
                  ? [val, cur[1], cur[2]]
                  : index === 1
                  ? [cur[0], val, cur[2]]
                  : [cur[0], cur[1], val]
                setAdminSettings?.({ ...adminSettings, loader: { ...adminSettings?.loader, systemChecks: next } })
              }}
              className="font-mono text-xs"
              placeholder={placeholder}
            />
          </div>
        ))}

        <Separator />

        {/* CyberpunkLoader Texts */}
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          CyberpunkLoader Texts
        </h3>
        <div className="space-y-1">
          <Label className="font-mono text-xs text-muted-foreground">Boot label</Label>
          <Input
            value={adminSettings?.loader?.bootLabel ?? ''}
            onChange={e => {
              const val = e.target.value
              setAdminSettings?.({ ...adminSettings, loader: { ...adminSettings?.loader, bootLabel: val || undefined } })
            }}
            className="font-mono text-xs"
            placeholder="NK-SYS [v2.0] // BOOT SEQUENCE"
          />
        </div>
        <div className="space-y-1">
          <Label className="font-mono text-xs text-muted-foreground">Hacking texts (one per line)</Label>
          <textarea
            rows={8}
            className="w-full bg-transparent border border-primary/30 text-foreground font-mono text-xs p-2 resize-y focus:outline-none focus:border-primary/60"
            placeholder={'BYPASSING SECURITY...\nACCESSING MAINFRAME...\nDECRYPTING NEURAL PATHWAYS...'}
            value={(adminSettings?.loader?.hackingTexts ?? []).join('\n')}
            onChange={e => {
              const lines = e.target.value.split('\n').filter(l => l.trim())
              setAdminSettings?.({ ...adminSettings, loader: { ...adminSettings?.loader, hackingTexts: lines.length ? lines : undefined } })
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="font-mono text-xs text-muted-foreground">Code fragments (one per line)</Label>
          <textarea
            rows={6}
            className="w-full bg-transparent border border-primary/30 text-foreground font-mono text-xs p-2 resize-y focus:outline-none focus:border-primary/60"
            placeholder={'0x7F3A\nNULL\nvoid(*ptr)()'}
            value={(adminSettings?.loader?.codeFragments ?? []).join('\n')}
            onChange={e => {
              const lines = e.target.value.split('\n').filter(l => l.trim())
              setAdminSettings?.({ ...adminSettings, loader: { ...adminSettings?.loader, codeFragments: lines.length ? lines : undefined } })
            }}
          />
        </div>
      </section>
      <Separator />

      {/* Decorative Texts (// labels) */}
      <DecorativeTextsSection
        adminSettings={adminSettings}
        setAdminSettings={setAdminSettings}
      />
    </div>
  )
}

/* ── Decorative Texts Section ─────────────────────────────────────────────────
 * Collapsible accordion for editing all `//` style decorative texts throughout
 * the site. Supports template variables like {session.id}, {data.releases}.
 */

const DECORATIVE_TEXT_GROUPS: {
  title: string
  fields: { key: keyof DecorativeTexts; label: string; placeholder: string }[]
}[] = [
  {
    title: 'Overlay Headers',
    fields: [
      { key: 'overlaySystemLabel', label: 'Overlay Top Label', placeholder: '// SYSTEM.INTERFACE // v1.0.0' },
    ],
  },
  {
    title: 'Gig Overlay',
    fields: [
      { key: 'gigDataStreamLabel', label: 'Data Stream Label', placeholder: '// EVENT.DATA.STREAM' },
      { key: 'gigStatusPrefix', label: 'Status Prefix', placeholder: '// SYSTEM.STATUS:' },
    ],
  },
  {
    title: 'Contact Overlay',
    fields: [
      { key: 'contactStreamLabel', label: 'Stream Label', placeholder: '// CONTACT.INTERFACE' },
      { key: 'contactFormLabel', label: 'Form Label', placeholder: '// CONTACT.FORM' },
      { key: 'contactStatusLabel', label: 'Status Label', placeholder: '// SYSTEM.STATUS: [ACTIVE]' },
    ],
  },
  {
    title: 'Privacy Overlay',
    fields: [
      { key: 'privacyStreamLabel', label: 'Stream Label', placeholder: '// PRIVACY.POLICY' },
      { key: 'privacyStatusLabel', label: 'Status Label', placeholder: '// SYSTEM.STATUS: [ACTIVE]' },
    ],
  },
  {
    title: 'Impressum Overlay',
    fields: [
      { key: 'impressumStreamLabel', label: 'Stream Label', placeholder: '// LEGAL.INFORMATION' },
      { key: 'impressumStatusLabel', label: 'Status Label', placeholder: '// SYSTEM.STATUS: [ACTIVE]' },
    ],
  },
  {
    title: 'Member Overlay',
    fields: [
      { key: 'memberProfileLabel', label: 'Profile Label', placeholder: '// MEMBER.PROFILE' },
    ],
  },
  {
    title: 'HUD Labels',
    fields: [
      { key: 'hudTimeLabel', label: 'Time Label', placeholder: 'SYS_TIME:' },
      { key: 'hudSessionLabel', label: 'Session Label', placeholder: 'SESSION:' },
      { key: 'hudUptimeLabel', label: 'Uptime Label', placeholder: 'UPTIME:' },
      { key: 'hudSectorLabel', label: 'Sector Label', placeholder: 'SECTOR:' },
      { key: 'hudDataRateLabel', label: 'Data Rate Label', placeholder: 'DATA_RATE:' },
    ],
  },
  {
    title: 'Loading Screen',
    fields: [
      { key: 'loaderBuildInfo', label: 'Build Info', placeholder: 'BUILD: {session.build}' },
      { key: 'loaderPlatformInfo', label: 'Platform Info', placeholder: 'PLATFORM: {session.platform}' },
      { key: 'loaderConnectionStatus', label: 'Connection Status', placeholder: '{session.connection}' },
    ],
  },
]

function DecorativeTextsSection({
  adminSettings,
  setAdminSettings,
}: {
  adminSettings?: AdminSettings | null
  setAdminSettings?: (s: AdminSettings) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  const decorativeTexts = adminSettings?.decorative ?? {}

  const updateText = (key: keyof DecorativeTexts, value: string) => {
    if (!setAdminSettings) return
    setAdminSettings({
      ...adminSettings,
      decorative: { ...decorativeTexts, [key]: value || undefined },
    })
  }

  return (
    <section className="space-y-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between font-mono text-xs font-bold text-primary uppercase tracking-wider hover:text-primary/80 transition-colors"
        type="button"
      >
        <span>Decorative Texts (// Labels)</span>
        <span className="text-muted-foreground">{isOpen ? '▲' : '▼'}</span>
      </button>
      <p className="text-[10px] text-muted-foreground font-mono">
        Template vars: {'{session.id}'} {'{session.sector}'} {'{session.build}'} {'{session.platform}'} {'{data.releases}'} {'{data.gigs}'}
      </p>

      {isOpen && (
        <div className="space-y-4 pt-2">
          {DECORATIVE_TEXT_GROUPS.map(({ title, fields }) => (
            <div key={title} className="space-y-2">
              <h4 className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {title}
              </h4>
              {fields.map(({ key, label, placeholder }) => (
                <div key={key} className="space-y-1">
                  <Label className="font-mono text-[10px] text-muted-foreground">{label}</Label>
                  <Input
                    value={(decorativeTexts[key] as string) ?? ''}
                    onChange={(e) => updateText(key, e.target.value)}
                    placeholder={placeholder}
                    className="bg-background border-border font-mono text-xs h-7"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
