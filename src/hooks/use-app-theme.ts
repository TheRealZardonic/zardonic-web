import { useEffect } from 'react'
import type { AdminSettings } from '@/lib/types'
import { applyConfigOverrides } from '@/lib/config'

export function useAppTheme(adminSettings: AdminSettings | undefined): void {
  // Effect 1: Apply theme CSS variables
  useEffect(() => {
    const t = adminSettings?.theme
    if (!t) return
    const root = document.documentElement

    if (t.primaryColor) root.style.setProperty('--primary', t.primaryColor)
    if (t.primaryForegroundColor) root.style.setProperty('--primary-foreground', t.primaryForegroundColor)
    if (t.accentColor) {
      root.style.setProperty('--accent', t.accentColor)
      if (!t.hoverColor) root.style.setProperty('--hover-color', t.accentColor)
    }
    if (t.accentForegroundColor) root.style.setProperty('--accent-foreground', t.accentForegroundColor)
    if (t.backgroundColor) root.style.setProperty('--background', t.backgroundColor)
    if (t.foregroundColor) root.style.setProperty('--foreground', t.foregroundColor)
    if (t.cardColor) root.style.setProperty('--card', t.cardColor)
    if (t.cardForegroundColor) root.style.setProperty('--card-foreground', t.cardForegroundColor)
    if (t.popoverColor) root.style.setProperty('--popover', t.popoverColor)
    if (t.popoverForegroundColor) root.style.setProperty('--popover-foreground', t.popoverForegroundColor)
    if (t.secondaryColor) root.style.setProperty('--secondary', t.secondaryColor)
    if (t.secondaryForegroundColor) root.style.setProperty('--secondary-foreground', t.secondaryForegroundColor)
    if (t.mutedColor) root.style.setProperty('--muted', t.mutedColor)
    if (t.mutedForegroundColor) root.style.setProperty('--muted-foreground', t.mutedForegroundColor)
    if (t.destructiveColor) root.style.setProperty('--destructive', t.destructiveColor)
    if (t.destructiveForegroundColor) root.style.setProperty('--destructive-foreground', t.destructiveForegroundColor)
    if (t.borderColor) {
      root.style.setProperty('--border-color', t.borderColor)
      root.style.setProperty('--border', t.borderColor)
    }
    if (t.inputColor) root.style.setProperty('--input', t.inputColor)
    if (t.ringColor) root.style.setProperty('--ring', t.ringColor)
    if (t.hoverColor) root.style.setProperty('--hover-color', t.hoverColor)
    if (t.borderRadius) root.style.setProperty('--radius', t.borderRadius)
    if (t.fontHeading) root.style.setProperty('--font-heading', t.fontHeading)
    if (t.fontBody) root.style.setProperty('--font-body', t.fontBody)
    if (t.fontMono) root.style.setProperty('--font-mono', t.fontMono)
    if (t.dataLabelColor) root.style.setProperty('--data-label-color', t.dataLabelColor)
    if (t.dataLabelFontSize) root.style.setProperty('--data-label-font-size', t.dataLabelFontSize)
    if (t.dataLabelFontFamily) root.style.setProperty('--data-label-font-family', t.dataLabelFontFamily)
    if (t.modalGlowColor) root.style.setProperty('--modal-glow-color', t.modalGlowColor)

    return () => {
      root.style.removeProperty('--primary')
      root.style.removeProperty('--primary-foreground')
      root.style.removeProperty('--accent')
      root.style.removeProperty('--accent-foreground')
      root.style.removeProperty('--background')
      root.style.removeProperty('--foreground')
      root.style.removeProperty('--card')
      root.style.removeProperty('--card-foreground')
      root.style.removeProperty('--popover')
      root.style.removeProperty('--popover-foreground')
      root.style.removeProperty('--secondary')
      root.style.removeProperty('--secondary-foreground')
      root.style.removeProperty('--muted')
      root.style.removeProperty('--muted-foreground')
      root.style.removeProperty('--destructive')
      root.style.removeProperty('--destructive-foreground')
      root.style.removeProperty('--border-color')
      root.style.removeProperty('--border')
      root.style.removeProperty('--input')
      root.style.removeProperty('--ring')
      root.style.removeProperty('--hover-color')
      root.style.removeProperty('--radius')
      root.style.removeProperty('--font-heading')
      root.style.removeProperty('--font-body')
      root.style.removeProperty('--font-mono')
      root.style.removeProperty('--data-label-color')
      root.style.removeProperty('--data-label-font-size')
      root.style.removeProperty('--data-label-font-family')
      root.style.removeProperty('--modal-glow-color')
    }
  }, [adminSettings?.theme])

  // Effect 2: CRT opacity
  useEffect(() => {
    const a = adminSettings?.animations
    const root = document.documentElement
    if (typeof a?.crtOverlayOpacity === 'number') {
      root.style.setProperty('--crt-overlay-opacity', String(a.crtOverlayOpacity))
    }
    if (typeof a?.crtVignetteOpacity === 'number') {
      root.style.setProperty('--crt-vignette-opacity', String(a.crtVignetteOpacity))
    }
    return () => {
      root.style.removeProperty('--crt-overlay-opacity')
      root.style.removeProperty('--crt-vignette-opacity')
    }
  }, [adminSettings?.animations])

  // Effect 3: Config overrides
  useEffect(() => {
    if (adminSettings?.configOverrides) {
      applyConfigOverrides(adminSettings.configOverrides)
    }
  }, [adminSettings?.configOverrides])

  // Effect 4: Favicon
  useEffect(() => {
    const faviconUrl = adminSettings?.faviconUrl
    if (!faviconUrl) return
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [adminSettings?.faviconUrl])
}
