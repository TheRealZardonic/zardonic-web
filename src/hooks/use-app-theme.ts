import { useEffect } from 'react'
import type { AdminSettings } from '@/lib/types'
import { applyConfigOverrides } from '@/lib/config'
import { extractGoogleFontName, loadGoogleFont } from '@/lib/font-loader'
import { toDirectImageUrl, cacheImage } from '@/lib/image-cache'

/** localStorage key used to persist the theme CSS variable map for instant
 *  restoration on the next page load (eliminates the red-flash on the loading
 *  screen before admin settings arrive from the KV store). */
const THEME_CACHE_KEY = 'nk-theme-cache'

/** Parse the hue component from an oklch color string: "oklch(L C H)" → H */
function parseOklchHue(oklchStr: string): number | null {
  const m = oklchStr.match(/oklch\(\s*[\d.]+\s+[\d.]+\s+([\d.]+)/)
  return m ? parseFloat(m[1]) : null
}

/** Parse all three oklch components from a color string. */
function parseOklchComponents(oklchStr: string): { l: number; c: number; h: number } | null {
  const m = oklchStr.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/)
  if (!m) return null
  return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) }
}

export function useAppTheme(adminSettings: AdminSettings | undefined): void {
  // Effect 1: Apply theme CSS variables
  useEffect(() => {
    const t = adminSettings?.design?.theme
    if (!t) return
    const root = document.documentElement

    // Map of CSS variable → value; built up as we apply each setting so we
    // can persist the entire set to localStorage for instant next-load restore.
    const applied: Record<string, string> = {}
    const set = (prop: string, value: string) => {
      root.style.setProperty(prop, value)
      applied[prop] = value
    }

    if (t.primaryColor) set('--primary', t.primaryColor)
    if (t.primaryForegroundColor) set('--primary-foreground', t.primaryForegroundColor)
    if (t.accentColor) {
      set('--accent', t.accentColor)
      if (!t.hoverColor) set('--hover-color', t.accentColor)
      // Keep the separated L/C/H vars in sync so CSS glow effects stay correct.
      const comps = parseOklchComponents(t.accentColor)
      if (comps) {
        set('--accent-l', String(comps.l))
        set('--accent-c', String(comps.c))
        set('--accent-h', String(comps.h))
      }
    }
    if (t.accentForegroundColor) set('--accent-foreground', t.accentForegroundColor)
    if (t.backgroundColor) set('--background', t.backgroundColor)
    if (t.foregroundColor) set('--foreground', t.foregroundColor)
    if (t.cardColor) set('--card', t.cardColor)
    if (t.cardForegroundColor) set('--card-foreground', t.cardForegroundColor)
    if (t.popoverColor) set('--popover', t.popoverColor)
    if (t.popoverForegroundColor) set('--popover-foreground', t.popoverForegroundColor)
    if (t.secondaryColor) set('--secondary', t.secondaryColor)
    if (t.secondaryForegroundColor) set('--secondary-foreground', t.secondaryForegroundColor)
    if (t.mutedColor) set('--muted', t.mutedColor)
    if (t.mutedForegroundColor) set('--muted-foreground', t.mutedForegroundColor)
    if (t.destructiveColor) set('--destructive', t.destructiveColor)
    if (t.destructiveForegroundColor) set('--destructive-foreground', t.destructiveForegroundColor)
    if (t.borderColor) {
      set('--border-color', t.borderColor)
      set('--border', t.borderColor)
    }
    if (t.inputColor) set('--input', t.inputColor)
    if (t.ringColor) set('--ring', t.ringColor)
    if (t.hoverColor) set('--hover-color', t.hoverColor)
    if (t.borderRadius) set('--radius', t.borderRadius)
    if (t.fontHeading) {
      set('--font-heading', t.fontHeading)
      const gfName = extractGoogleFontName(t.fontHeading)
      if (gfName) loadGoogleFont(gfName)
    }
    if (t.fontBody) {
      set('--font-body', t.fontBody)
      const gfName = extractGoogleFontName(t.fontBody)
      if (gfName) loadGoogleFont(gfName)
    }
    if (t.fontMono) {
      set('--font-mono', t.fontMono)
      const gfName = extractGoogleFontName(t.fontMono)
      if (gfName) loadGoogleFont(gfName)
    }
    if (t.dataLabelColor) set('--data-label-color', t.dataLabelColor)
    if (t.dataLabelFontSize) set('--data-label-font-size', t.dataLabelFontSize)
    if (t.dataLabelFontFamily) set('--data-label-font-family', t.dataLabelFontFamily)
    if (t.modalGlowColor) set('--modal-glow-color', t.modalGlowColor)

    // Compute or apply the Spotify hue-rotate offset so the embedded
    // player's accent colour matches the current CI preset.
    // If the admin has set a manual override, use that; otherwise derive
    // it automatically from the primary colour's hue.
    // Spotify's native accent is green ≈ hue 141°; we rotate from there.
    if (typeof t.spotifyHueRotate === 'number') {
      set('--spotify-hue-rotate', `${Math.round(t.spotifyHueRotate)}deg`)
    } else {
      const colorForHue = t.primaryColor ?? t.accentColor
      if (colorForHue) {
        const hue = parseOklchHue(colorForHue)
        if (hue !== null) {
          set('--spotify-hue-rotate', `${Math.round(hue - 141)}deg`)
        }
      }
    }

    if (typeof t.spotifySaturate === 'number') {
      set('--spotify-saturate', String(t.spotifySaturate))
    }
    if (typeof t.spotifyBrightness === 'number') {
      set('--spotify-brightness', String(t.spotifyBrightness))
    }

    // Persist to localStorage so the inline script in index.html can restore
    // these values synchronously on the very next page load, preventing the
    // default-colour flash during the loading screen.
    try {
      localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(applied))
    } catch { /* quota exceeded or private browsing — silently ignore */ }

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
      root.style.removeProperty('--accent-l')
      root.style.removeProperty('--accent-c')
      root.style.removeProperty('--accent-h')
      root.style.removeProperty('--spotify-hue-rotate')
      root.style.removeProperty('--spotify-saturate')
      root.style.removeProperty('--spotify-brightness')
    }
  }, [adminSettings?.design?.theme])

  // Effect 2: CRT opacity
  useEffect(() => {
    const a = adminSettings?.background
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
  }, [adminSettings?.background])

  // Effect 3: Config overrides
  useEffect(() => {
    if (adminSettings?.configOverrides) {
      applyConfigOverrides(adminSettings.configOverrides)
    }
  }, [adminSettings?.configOverrides])

  // Effect 4: Favicon
  useEffect(() => {
    const faviconUrl = adminSettings?.design?.faviconUrl
    if (!faviconUrl) return
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = faviconUrl
  }, [adminSettings?.design?.faviconUrl])

  // Effect 5: Apply effect colors, animation timings, and CRT intensity settings
  useEffect(() => {
    const ec = adminSettings?.design?.effects
    const at = adminSettings?.design?.timings
    const ci = adminSettings?.design?.crt
    const root = document.documentElement

    if (ec?.chromaticColorLeft) root.style.setProperty('--chromatic-color-left', ec.chromaticColorLeft)
    if (ec?.chromaticColorRight) root.style.setProperty('--chromatic-color-right', ec.chromaticColorRight)
    if (ec?.glitchShadowColor1) root.style.setProperty('--glitch-shadow-color-1', ec.glitchShadowColor1)
    if (ec?.glitchShadowColor2) root.style.setProperty('--glitch-shadow-color-2', ec.glitchShadowColor2)
    if (typeof ec?.scanlineOpacity === 'number') root.style.setProperty('--scanline-opacity', String(ec.scanlineOpacity))
    if (ec?.scrollbarThumbColor) root.style.setProperty('--scrollbar-thumb-color', ec.scrollbarThumbColor)

    if (typeof at?.fadeInDuration === 'number') root.style.setProperty('--fade-in-duration', `${at.fadeInDuration}s`)
    if (typeof at?.scanlineDuration === 'number') root.style.setProperty('--scanline-duration', `${at.scanlineDuration}s`)
    if (typeof at?.crtFlickerDuration === 'number') root.style.setProperty('--crt-flicker-duration', `${at.crtFlickerDuration}s`)
    if (typeof at?.glitchDuration === 'number') root.style.setProperty('--glitch-duration', `${at.glitchDuration}s`)
    if (typeof at?.logoEntranceDuration === 'number') root.style.setProperty('--logo-entrance-duration', `${at.logoEntranceDuration}s`)

    if (typeof ci?.vignetteOpacity === 'number') root.style.setProperty('--vignette-opacity', String(ci.vignetteOpacity))
    if (typeof ci?.scanlineHeight === 'number') root.style.setProperty('--scanline-height', `${ci.scanlineHeight}px`)
    if (typeof ci?.noiseFrequency === 'number') root.style.setProperty('--noise-frequency', String(ci.noiseFrequency))

    return () => {
      root.style.removeProperty('--chromatic-color-left')
      root.style.removeProperty('--chromatic-color-right')
      root.style.removeProperty('--glitch-shadow-color-1')
      root.style.removeProperty('--glitch-shadow-color-2')
      root.style.removeProperty('--scanline-opacity')
      root.style.removeProperty('--scrollbar-thumb-color')
      root.style.removeProperty('--fade-in-duration')
      root.style.removeProperty('--scanline-duration')
      root.style.removeProperty('--crt-flicker-duration')
      root.style.removeProperty('--glitch-duration')
      root.style.removeProperty('--logo-entrance-duration')
      root.style.removeProperty('--vignette-opacity')
      root.style.removeProperty('--scanline-height')
      root.style.removeProperty('--noise-frequency')
    }
  }, [adminSettings?.design?.effects, adminSettings?.design?.timings, adminSettings?.design?.crt])

  // Effect 6: Typography detail settings — wires design.typography to CSS custom
  // properties consumed by index.css heading / body / code rules.
  // Uses removeProperty (not the value itself) so that unset fields never leave
  // a stale CSS variable that overrides Tailwind utility classes.
  useEffect(() => {
    const ty = adminSettings?.design?.typography
    const root = document.documentElement

    const setOrRemove = (prop: string, value: string | undefined) => {
      if (value) root.style.setProperty(prop, value)
      else root.style.removeProperty(prop)
    }

    setOrRemove('--heading-font-size', ty?.headingFontSize)
    setOrRemove('--heading-font-weight', ty?.headingFontWeight)
    setOrRemove('--heading-line-height', ty?.headingLineHeight)
    setOrRemove('--heading-letter-spacing', ty?.headingLetterSpacing)
    setOrRemove('--body-font-size', ty?.bodyFontSize)
    setOrRemove('--body-line-height', ty?.bodyLineHeight)
    setOrRemove('--mono-font-size', ty?.monoFontSize)

    if (typeof ty?.headingTextShadow === 'boolean') {
      root.style.setProperty(
        '--heading-text-shadow',
        ty.headingTextShadow
          ? '0.5px 0 0 rgba(255,255,255,0.15),-0.5px 0 0 rgba(200,200,200,0.15)'
          : 'none',
      )
    } else {
      root.style.removeProperty('--heading-text-shadow')
    }

    return () => {
      root.style.removeProperty('--heading-font-size')
      root.style.removeProperty('--heading-font-weight')
      root.style.removeProperty('--heading-line-height')
      root.style.removeProperty('--heading-letter-spacing')
      root.style.removeProperty('--heading-text-shadow')
      root.style.removeProperty('--body-font-size')
      root.style.removeProperty('--body-line-height')
      root.style.removeProperty('--mono-font-size')
    }
  }, [adminSettings?.design?.typography])

  // Effect 7: Background image preload hint
  useEffect(() => {
    const rawUrl = adminSettings?.background?.backgroundImageUrl
    if (!rawUrl) return
    const resolvedUrl = toDirectImageUrl(rawUrl)
    if (!resolvedUrl) return

    const id = `bg-preload-${encodeURIComponent(rawUrl)}`
    if (document.querySelector(`link[data-bg-preload="${id}"]`)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.setAttribute('fetchpriority', 'high')
    link.href = resolvedUrl
    link.dataset.bgPreload = id
    document.head.appendChild(link)

    // Also warm the IndexedDB cache in the background
    cacheImage(rawUrl).catch(() => {/* silently fail */})

    return () => {
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }
  }, [adminSettings?.background?.backgroundImageUrl])
}
