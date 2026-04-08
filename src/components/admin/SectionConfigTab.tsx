import { useState } from 'react'
import { TabsContent, Tabs } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import type { AdminSettings, SectionLabels, ContactInfo, ContactSettings, ShellMember } from '@/lib/types'
import type { SiteData } from '@/App'

interface SectionConfigTabProps {
  adminSettings?: AdminSettings | null
  setAdminSettings?: (s: AdminSettings) => void
  siteData?: SiteData
  onUpdateSiteData?: (updater: SiteData | ((current: SiteData) => SiteData)) => void
}

function Field({ label, value, onChange, placeholder, multiline }: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className="font-mono text-xs text-muted-foreground uppercase tracking-wider">{label}</Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-xs min-h-[80px] resize-y"
        />
      ) : (
        <Input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="font-mono text-xs"
        />
      )}
    </div>
  )
}

export default function SectionConfigTab({
  adminSettings,
  setAdminSettings,
  siteData,
  onUpdateSiteData,
}: SectionConfigTabProps) {
  const [activeSection, setActiveSection] = useState('hero')

  const labels: SectionLabels = adminSettings?.sectionLabels ?? {}
  const contactInfo: ContactInfo = adminSettings?.contactInfo ?? {}
  const contactSettings: ContactSettings = adminSettings?.contactSettings ?? {}

  const updateLabel = (key: keyof SectionLabels, value: string) => {
    setAdminSettings?.({
      ...(adminSettings ?? {}),
      sectionLabels: { ...labels, [key]: value },
    })
  }

  const updateContactInfo = (key: keyof ContactInfo, value: string) => {
    setAdminSettings?.({
      ...(adminSettings ?? {}),
      contactInfo: { ...contactInfo, [key]: value },
    })
  }

  const updateContactSettings = (key: keyof ContactSettings, value: string | boolean) => {
    setAdminSettings?.({
      ...(adminSettings ?? {}),
      contactSettings: { ...contactSettings, [key]: value },
    })
  }

  const updateSiteField = (field: keyof SiteData, value: string) => {
    onUpdateSiteData?.((current) => ({ ...current, [field]: value }))
  }

  const updateSocial = (key: string, value: string) => {
    onUpdateSiteData?.((current) => ({
      ...current,
      social: { ...(current.social ?? {}), [key]: value },
    }))
  }

  const updateShellMember = (key: keyof ShellMember, value: string) => {
    setAdminSettings?.({
      ...(adminSettings ?? {}),
      shellMember: { ...(adminSettings?.shellMember ?? { name: '' }), [key]: value },
    })
  }

  return (
    <TabsContent value="section-config" className="flex-1 overflow-y-auto mt-0">
      <Tabs value={activeSection} onValueChange={setActiveSection} orientation="vertical">
        <div className="flex h-full">
          {/* Inner section tab list */}
          <div className="w-32 shrink-0 border-r border-border p-2 space-y-1">
            {[
              { value: 'hero', label: 'Hero' },
              { value: 'bio', label: 'Biography' },
              { value: 'shell', label: 'Shell' },
              { value: 'music', label: 'Music' },
              { value: 'gigs', label: 'Gigs' },
              { value: 'releases', label: 'Releases' },
              { value: 'gallery', label: 'Gallery' },
              { value: 'connect', label: 'Connect' },
              { value: 'credits', label: 'Credits' },
              { value: 'contact', label: 'Contact' },
              { value: 'footer', label: 'Footer' },
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setActiveSection(item.value)}
                className={`w-full text-left px-2 py-1.5 rounded font-mono text-xs transition-colors ${
                  activeSection === item.value
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Section panels */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {activeSection === 'hero' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Hero Section</h3>
                <Field
                  label="Artist Name"
                  value={siteData?.artistName ?? ''}
                  onChange={v => updateSiteField('artistName', v)}
                  placeholder="ZARDONIC"
                />
                <Field
                  label="Hero Image URL"
                  value={siteData?.heroImage ?? ''}
                  onChange={v => updateSiteField('heroImage', v)}
                  placeholder="https://..."
                />
                <Separator />
                <Field
                  label="Heading Prefix"
                  value={labels.headingPrefix ?? ''}
                  onChange={v => updateLabel('headingPrefix', v)}
                  placeholder="//"
                />
              </div>
            )}

            {activeSection === 'bio' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Biography Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.biography ?? ''}
                  onChange={v => updateLabel('biography', v)}
                  placeholder="BIOGRAPHY"
                />
                <Field
                  label="Bio Text"
                  value={siteData?.bio ?? ''}
                  onChange={v => updateSiteField('bio', v)}
                  placeholder="Artist biography..."
                  multiline
                />
              </div>
            )}

            {activeSection === 'shell' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Shell / Member Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.shell ?? ''}
                  onChange={v => updateLabel('shell', v)}
                  placeholder="SHELL"
                />
                <Field
                  label="Member Name"
                  value={adminSettings?.shellMember?.name ?? ''}
                  onChange={v => updateShellMember('name', v)}
                  placeholder="Member name"
                />
                <Field
                  label="Member Role"
                  value={adminSettings?.shellMember?.role ?? ''}
                  onChange={v => updateShellMember('role', v)}
                  placeholder="e.g. Producer / DJ"
                />
                <Field
                  label="Member Bio"
                  value={adminSettings?.shellMember?.bio ?? ''}
                  onChange={v => updateShellMember('bio', v)}
                  placeholder="Short member bio..."
                  multiline
                />
              </div>
            )}

            {activeSection === 'music' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Music Player Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.musicPlayer ?? ''}
                  onChange={v => updateLabel('musicPlayer', v)}
                  placeholder="MUSIC"
                />
              </div>
            )}

            {activeSection === 'gigs' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Gigs Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.upcomingGigs ?? labels.gigs ?? ''}
                  onChange={v => updateLabel('upcomingGigs', v)}
                  placeholder="UPCOMING GIGS"
                />
              </div>
            )}

            {activeSection === 'releases' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Releases Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.releases ?? ''}
                  onChange={v => updateLabel('releases', v)}
                  placeholder="RELEASES"
                />
              </div>
            )}

            {activeSection === 'gallery' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Gallery Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.gallery ?? ''}
                  onChange={v => updateLabel('gallery', v)}
                  placeholder="GALLERY"
                />
              </div>
            )}

            {activeSection === 'connect' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Connect / Social Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.connect ?? ''}
                  onChange={v => updateLabel('connect', v)}
                  placeholder="CONNECT"
                />
                <Separator />
                <h4 className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">Social Links</h4>
                {([
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
                ] as { key: string; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                  <Field
                    key={key}
                    label={label}
                    value={(siteData?.social as Record<string, string> | undefined)?.[key] ?? ''}
                    onChange={v => updateSocial(key, v)}
                    placeholder={placeholder}
                  />
                ))}
              </div>
            )}

            {activeSection === 'credits' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Credit Highlights Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.creditHighlights ?? ''}
                  onChange={v => updateLabel('creditHighlights', v)}
                  placeholder="CREDITS"
                />
              </div>
            )}

            {activeSection === 'contact' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Contact Section</h3>
                <Field
                  label="Section Heading"
                  value={labels.contact ?? ''}
                  onChange={v => updateLabel('contact', v)}
                  placeholder="CONTACT"
                />
                <Separator />
                <Field
                  label="Form Title"
                  value={contactInfo.formTitle ?? ''}
                  onChange={v => updateContactInfo('formTitle', v)}
                  placeholder="GET IN TOUCH"
                />
                <Field
                  label="Submit Button Text"
                  value={contactInfo.formButtonText ?? ''}
                  onChange={v => updateContactInfo('formButtonText', v)}
                  placeholder="SEND MESSAGE"
                />
                <Field
                  label="Success Message"
                  value={contactSettings.successMessage ?? ''}
                  onChange={v => updateContactSettings('successMessage', v)}
                  placeholder="Message sent successfully!"
                />
                <Field
                  label="Forward Emails To"
                  value={contactSettings.emailForwardTo ?? ''}
                  onChange={v => updateContactSettings('emailForwardTo', v)}
                  placeholder="admin@example.com"
                />
                <Separator />
                <Field
                  label="Management Name"
                  value={contactInfo.managementName ?? ''}
                  onChange={v => updateContactInfo('managementName', v)}
                  placeholder="Management Co."
                />
                <Field
                  label="Management Email"
                  value={contactInfo.managementEmail ?? ''}
                  onChange={v => updateContactInfo('managementEmail', v)}
                  placeholder="mgmt@example.com"
                />
                <Field
                  label="Booking Email"
                  value={contactInfo.bookingEmail ?? ''}
                  onChange={v => updateContactInfo('bookingEmail', v)}
                  placeholder="booking@example.com"
                />
                <Field
                  label="Press Email"
                  value={contactInfo.pressEmail ?? ''}
                  onChange={v => updateContactInfo('pressEmail', v)}
                  placeholder="press@example.com"
                />
              </div>
            )}

            {activeSection === 'footer' && (
              <div className="space-y-4">
                <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Footer</h3>
                <Field
                  label="Artist Name (Copyright)"
                  value={siteData?.artistName ?? ''}
                  onChange={v => updateSiteField('artistName', v)}
                  placeholder="ZARDONIC"
                />
                <Field
                  label="Impressum / Legal Notice"
                  value={adminSettings?.legalContent?.impressum ?? ''}
                  onChange={v => setAdminSettings?.({
                    ...(adminSettings ?? {}),
                    legalContent: { ...(adminSettings?.legalContent ?? {}), impressum: v },
                  })}
                  placeholder="Legal notice text..."
                  multiline
                />
                <Field
                  label="Privacy Policy (Datenschutz)"
                  value={adminSettings?.legalContent?.datenschutz ?? ''}
                  onChange={v => setAdminSettings?.({
                    ...(adminSettings ?? {}),
                    legalContent: { ...(adminSettings?.legalContent ?? {}), datenschutz: v },
                  })}
                  placeholder="Privacy policy text..."
                  multiline
                />
              </div>
            )}
          </div>
        </div>
      </Tabs>
    </TabsContent>
  )
}
