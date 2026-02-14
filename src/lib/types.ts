export interface SectionVisibility {
  bio?: boolean
  music?: boolean
  gigs?: boolean
  releases?: boolean
  gallery?: boolean
  connect?: boolean
  creditHighlights?: boolean
}

export interface ThemeCustomization {
  primaryColor?: string
  accentColor?: string
  backgroundColor?: string
  foregroundColor?: string
  fontHeading?: string
  fontBody?: string
  fontMono?: string
}

export interface AnimationSettings {
  glitchEnabled?: boolean
  scanlineEnabled?: boolean
  chromaticEnabled?: boolean
  crtEnabled?: boolean
  noiseEnabled?: boolean
  circuitBackgroundEnabled?: boolean
}

export interface ProgressiveOverlayModes {
  progressiveReveal?: boolean
  dataStream?: boolean
  sectorAssembly?: boolean
  holographicMaterialization?: boolean
}

export interface AdminSettings {
  sectionVisibility?: SectionVisibility
  theme?: ThemeCustomization
  animations?: AnimationSettings
  progressiveOverlayModes?: ProgressiveOverlayModes
  configOverrides?: Record<string, unknown>
  faviconUrl?: string
}
