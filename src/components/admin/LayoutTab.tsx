// @deprecated — functionality superseded by src/cms/editors/. Do not extend; use the CMS editors instead.
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import type { AdminSettings, DisclosureLevel } from '@/lib/types'
import { isFieldVisible, getBioBodyFontSize } from '@/lib/admin-settings'

interface LayoutTabProps {
  adminSettings: AdminSettings | null | undefined
  setAdminSettings: ((s: AdminSettings) => void) | undefined
  disclosureLevel?: DisclosureLevel
}

export default function LayoutTab({ adminSettings, setAdminSettings, disclosureLevel = 'basic' }: LayoutTabProps) {
  const isAdvanced = isFieldVisible('advanced', disclosureLevel)
  const layoutSpacing = adminSettings?.design?.layout ?? {}
  const navStyling = adminSettings?.design?.navigation ?? {}
  const footerStyling = adminSettings?.design?.footer ?? {}
  const heroSection = adminSettings?.sections?.styleOverrides?.hero ?? {}
  const bioSection = adminSettings?.sections?.styleOverrides?.bio ?? {}

  const updateLayoutSpacing = (patch: Record<string, string | undefined>) => {
    setAdminSettings?.({ ...(adminSettings ?? {}), design: { ...(adminSettings?.design ?? {}), layout: { ...layoutSpacing, ...patch } } })
  }
  const updateNavStyling = (patch: Record<string, string | number | boolean | undefined>) => {
    setAdminSettings?.({ ...(adminSettings ?? {}), design: { ...(adminSettings?.design ?? {}), navigation: { ...navStyling, ...patch } } })
  }
  const updateFooterStyling = (patch: Record<string, string | undefined>) => {
    setAdminSettings?.({ ...(adminSettings ?? {}), design: { ...(adminSettings?.design ?? {}), footer: { ...footerStyling, ...patch } } })
  }
  const updateHeroSection = (patch: Record<string, string | number | undefined>) => {
    setAdminSettings?.({ ...(adminSettings ?? {}), sections: { ...(adminSettings?.sections ?? {}), styleOverrides: { ...(adminSettings?.sections?.styleOverrides ?? {}), hero: { ...heroSection, ...patch } } } })
  }
  const updateBioSection = (patch: Record<string, string | undefined>) => {
    setAdminSettings?.({ ...(adminSettings ?? {}), sections: { ...(adminSettings?.sections ?? {}), styleOverrides: { ...(adminSettings?.sections?.styleOverrides ?? {}), bio: { ...bioSection, ...patch } } } })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
      {/* Layout & Spacing */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Layout &amp; Spacing
        </h3>
        <div className="space-y-2">
          <Label className="font-mono text-xs">Section Padding Y</Label>
          <Input
            className="font-mono text-xs h-8"
            placeholder="6rem"
            value={layoutSpacing.sectionPaddingY ?? ''}
            onChange={(e) => updateLayoutSpacing({ sectionPaddingY: e.target.value || undefined })}
          />
        </div>
        {isAdvanced && (
          <>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Section Padding X</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="1rem"
                value={layoutSpacing.sectionPaddingX ?? ''}
                onChange={(e) => updateLayoutSpacing({ sectionPaddingX: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Container Max Width</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="56rem"
                value={layoutSpacing.containerMaxWidth ?? ''}
                onChange={(e) => updateLayoutSpacing({ containerMaxWidth: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Container Max Width (Wide)</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="72rem"
                value={layoutSpacing.containerMaxWidthWide ?? ''}
                onChange={(e) => updateLayoutSpacing({ containerMaxWidthWide: e.target.value || undefined })}
              />
            </div>
          </>
        )}
      </section>

      <Separator />

      {/* Navigation Styling */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Navigation Styling
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="font-mono text-xs">Background Opacity</Label>
            <span className="font-mono text-xs text-muted-foreground">{navStyling.backgroundOpacity ?? 98}%</span>
          </div>
          <Slider
            value={[navStyling.backgroundOpacity ?? 98]}
            min={0}
            max={100}
            step={1}
            onValueChange={([v]) => updateNavStyling({ backgroundOpacity: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs">Backdrop Blur</Label>
          <Switch
            checked={navStyling.backdropBlur !== false}
            onCheckedChange={(v) => updateNavStyling({ backdropBlur: v })}
          />
        </div>
        {isAdvanced && (
          <>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Logo Height</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="2.5rem"
                value={navStyling.logoHeight ?? ''}
                onChange={(e) => updateNavStyling({ logoHeight: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Item Gap</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="1.5rem"
                value={navStyling.itemGap ?? ''}
                onChange={(e) => updateNavStyling({ itemGap: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Nav Height</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="4rem"
                value={navStyling.height ?? ''}
                onChange={(e) => updateNavStyling({ height: e.target.value || undefined })}
              />
            </div>
          </>
        )}
      </section>

      <Separator />

      {/* Footer Styling */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Footer Styling
        </h3>
        <div className="space-y-2">
          <Label className="font-mono text-xs">Padding Y</Label>
          <Input
            className="font-mono text-xs h-8"
            placeholder="3rem"
            value={footerStyling.paddingY ?? ''}
            onChange={(e) => updateFooterStyling({ paddingY: e.target.value || undefined })}
          />
        </div>
        {isAdvanced && (
          <>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Padding X</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="1rem"
                value={footerStyling.paddingX ?? ''}
                onChange={(e) => updateFooterStyling({ paddingX: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Text Color</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="oklch(0.55 0 0)"
                value={footerStyling.textColor ?? ''}
                onChange={(e) => updateFooterStyling({ textColor: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Link Color</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="oklch(0.50 0.22 25)"
                value={footerStyling.linkColor ?? ''}
                onChange={(e) => updateFooterStyling({ linkColor: e.target.value || undefined })}
              />
            </div>
          </>
        )}
      </section>

      <Separator />

      {/* Hero Section */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Hero Section
        </h3>
        <div className="space-y-2">
          <Label className="font-mono text-xs">Hero Minimum Height</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {(['min-h-screen', 'min-h-[80vh]', 'min-h-[60vh]', 'min-h-[50vh]'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => updateHeroSection({ minHeight: opt })}
                className={`text-left px-3 py-2 border rounded font-mono text-xs transition-colors ${
                  (heroSection.minHeight ?? 'min-h-screen') === opt
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="font-mono text-xs">Hero Image Opacity</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {Math.round((heroSection.heroImageOpacity ?? 0.5) * 100)}%
            </span>
          </div>
          <Slider
            value={[(heroSection.heroImageOpacity ?? 0.5) * 100]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => updateHeroSection({ heroImageOpacity: v / 100 })}
          />
        </div>
        {isAdvanced && (
          <>
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="font-mono text-xs">Hero Image Blur</Label>
                <span className="font-mono text-xs text-muted-foreground">
                  {heroSection.heroImageBlur ?? 0}px
                </span>
              </div>
              <Slider
                value={[heroSection.heroImageBlur ?? 0]}
                min={0}
                max={20}
                step={1}
                onValueChange={([v]) => updateHeroSection({ heroImageBlur: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="font-mono text-xs">Padding Top</Label>
              <Input
                className="font-mono text-xs h-8"
                placeholder="5rem"
                value={heroSection.paddingTop ?? ''}
                onChange={(e) => updateHeroSection({ paddingTop: e.target.value || undefined })}
              />
            </div>
          </>
        )}
      </section>

      <Separator />

      {/* Bio Section */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Bio Section
        </h3>
        <div className="space-y-2">
          <Label className="font-mono text-xs">Text Size</Label>
          <div className="grid grid-cols-1 gap-1.5">
            {(['text-sm', 'text-base', 'text-lg', 'text-xl'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => updateBioSection({ bodyFontSize: opt })}
                className={`text-left px-3 py-2 border rounded font-mono text-xs transition-colors ${
                  (getBioBodyFontSize(adminSettings)) === opt
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        {isAdvanced && (
          <div className="space-y-2">
            <Label className="font-mono text-xs">Read More Max Height</Label>
            <Input
              className="font-mono text-xs h-8"
              placeholder="17.5rem"
              value={bioSection.readMoreMaxHeight ?? ''}
              onChange={(e) => updateBioSection({ readMoreMaxHeight: e.target.value || undefined })}
            />
          </div>
        )}
      </section>
    </div>
  )
}
