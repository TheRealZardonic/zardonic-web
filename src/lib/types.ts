/** @deprecated Use Record<string, boolean> directly. Kept as alias for backward compat with legacy code. */
export type SectionVisibility = Record<string, boolean>

export interface ThemeCustomization {
  // Base colors
  primaryColor?: string
  accentColor?: string
  backgroundColor?: string
  foregroundColor?: string
  borderColor?: string
  hoverColor?: string
  
  // Card colors
  cardColor?: string
  cardForegroundColor?: string
  
  // Popover colors
  popoverColor?: string
  popoverForegroundColor?: string
  
  // Primary foreground
  primaryForegroundColor?: string
  
  // Secondary colors
  secondaryColor?: string
  secondaryForegroundColor?: string
  
  // Muted colors
  mutedColor?: string
  mutedForegroundColor?: string
  
  // Accent foreground
  accentForegroundColor?: string
  
  // Destructive colors
  destructiveColor?: string
  destructiveForegroundColor?: string
  
  // Input and ring
  inputColor?: string
  ringColor?: string
  
  // Border radius
  borderRadius?: string
  
  // Fonts
  fontHeading?: string
  fontBody?: string
  fontMono?: string
  fontSizes?: Record<string, string>

  // Data-label (small red annotation text like "// CREDIT.HIGHLIGHTS")
  dataLabelColor?: string
  dataLabelFontSize?: string
  dataLabelFontFamily?: string

  // Modal glow color
  modalGlowColor?: string

  // Spotify embed hue-rotation override (degrees, integer).
  // When set, overrides the auto-computed value (primaryHue - 141) so the
  // admin can fine-tune the embedded player's accent colour manually.
  // Range: -180 … 180 (or any integer; CSS hue-rotate wraps automatically).
  spotifyHueRotate?: number
  /** Saturation multiplier for the Spotify embed filter. Default 1.2. Range 0–3. */
  spotifySaturate?: number
  /** Brightness multiplier for the Spotify embed filter. Default 1. Range 0–2. */
  spotifyBrightness?: number
}

export type BackgroundType = 'circuit' | 'cyberpunk-hud' | 'matrix' | 'stars' | 'minimal' | 'cloud-chamber' | 'glitch-grid'

export type LoadingScreenType = 'cyberpunk' | 'minimal-bar' | 'glitch-decode' | 'none'
export type LoadingScreenMode = 'timed' | 'real'

export interface AnimationSettings {
  glitchEnabled?: boolean
  scanlineEnabled?: boolean
  chromaticEnabled?: boolean
  crtEnabled?: boolean
  noiseEnabled?: boolean
  circuitBackgroundEnabled?: boolean
  crtOverlayOpacity?: number
  crtVignetteOpacity?: number
  backgroundType?: BackgroundType
  blinkingCursor?: boolean
  // Background image
  backgroundImageUrl?: string
  backgroundImageFit?: 'cover' | 'contain' | 'fill' | 'none'
  backgroundImageOpacity?: number
  backgroundImageOverlay?: boolean
  backgroundImageParallax?: boolean
  // Loading screen
  loadingScreenType?: LoadingScreenType
  loadingScreenMode?: LoadingScreenMode
  loadingScreenDuration?: number
  // Circuit background options
  circuitSpeed?: number
  circuitDensity?: number
  circuitGlow?: number
  // Matrix rain options
  matrixSpeed?: number
  matrixDensity?: number
  matrixColor?: string
  // Stars options
  starCount?: number
  starSpeed?: number
  // Cloud chamber options
  cloudParticleCount?: number
  cloudGlowColor?: string
  // Glitch grid options
  glitchGridSize?: number
  glitchScanSpeed?: number
  glitchFrequency?: number
}

export interface LoaderTexts {
  hackingTexts?: string[]
  codeFragments?: string[]
  bootLabel?: string
  // LoadingScreen specific
  titleLabel?: string
  stageMessages?: string[]
  buildInfo?: string
  platformInfo?: string
  connectionStatus?: string
  systemChecks?: [string, string, string]
}

export interface ProgressiveOverlayModes {
  progressiveReveal?: boolean
  dataStream?: boolean
  sectorAssembly?: boolean
  holographicMaterialization?: boolean
}

export interface SectionLabels {
  hero?: string
  biography?: string
  musicPlayer?: string
  upcomingGigs?: string
  gigs?: string
  news?: string
  releases?: string
  gallery?: string
  connect?: string
  creditHighlights?: string
  media?: string
  tourDates?: string
  shell?: string
  contact?: string
  headingPrefix?: string
  collabs?: string
  closeButtonText?: string
  partnersAndFriends?: string
  sessionStatusText?: string
  profileStatusText?: string
  profileFields?: Array<{ label: string; value: string }>
  // Decorative labels in music section
  musicStreamLabel?: string
  musicStatusLabel?: string
  // Gigs section labels
  gigsLoadingLabel?: string
  gigsSyncingText?: string
  gigsFetchingText?: string
  gigsNoShowsText?: string
  // Releases section labels
  releasesLoadingLabel?: string
  releasesSyncingText?: string
  releasesFetchingText?: string
  releasesEmptyText?: string
  releasesShowAllText?: string
  releasesShowLessText?: string
  // Bio section labels
  bioReadMoreText?: string
  bioShowLessText?: string
  // Credit Highlights section labels
  creditHighlightsPrefix?: string
  creditHighlightsHeadingVisible?: boolean
  // Sponsoring section labels
  sponsoring?: string
  sponsoringPrefix?: string
  sponsoringHeadingVisible?: boolean
  // Release card visibility toggles
  releaseShowType?: boolean
  releaseShowYear?: boolean
  releaseShowDescription?: boolean
  releaseShowTracks?: boolean
  releaseStreamLabel?: string
  releaseStatusLabel?: string
  releaseInfoLabel?: string
  releaseTracksLabel?: string
}

export interface ContactInfo {
  managementName?: string
  managementEmail?: string
  bookingEmail?: string
  pressEmail?: string
  formTitle?: string
  formNameLabel?: string
  formNamePlaceholder?: string
  formEmailLabel?: string
  formEmailPlaceholder?: string
  formSubjectLabel?: string
  formSubjectPlaceholder?: string
  formMessageLabel?: string
  formMessagePlaceholder?: string
  formButtonText?: string
}

export interface LegalContent {
  impressumCustom?: string
  privacyCustom?: string
}

export interface ShellMember {
  name?: string
  role?: string
  bio?: string
  photo?: string
  social?: Record<string, string>
}

export interface CustomSocialLink {
  id: string
  label: string
  url: string
  icon?: string
}

export interface TerminalCommand {
  name: string
  description: string
  output: string[]
  fileName?: string
  fileUrl?: string
}

export interface MediaFile {
  id: string
  name: string
  url: string
  folder?: string
  type?: 'audio' | 'youtube' | 'download'
  description?: string
}

export interface LayoutSpacingSettings {
  sectionPaddingY?: string
  sectionPaddingX?: string
  containerMaxWidth?: string
  containerMaxWidthWide?: string
}

export interface NavigationStylingSettings {
  height?: string
  backgroundOpacity?: number
  backdropBlur?: boolean
  logoHeight?: string
  itemGap?: string
}

export interface FooterStylingSettings {
  paddingY?: string
  paddingX?: string
  textColor?: string
  linkColor?: string
}

export interface TypographyDetailSettings {
  headingFontFamily?: string
  headingFontSize?: string
  headingFontWeight?: string
  headingLineHeight?: string
  headingLetterSpacing?: string
  headingTextShadow?: boolean
  bodyFontSize?: string
  bodyLineHeight?: string
  monoFontSize?: string
}

export interface EffectColorSettings {
  chromaticColorLeft?: string
  chromaticColorRight?: string
  glitchShadowColor1?: string
  glitchShadowColor2?: string
  scanlineOpacity?: number
  scrollbarThumbColor?: string
}

export interface AnimationTimingSettings {
  fadeInDuration?: number
  scanlineDuration?: number
  crtFlickerDuration?: number
  glitchDuration?: number
  logoEntranceDuration?: number
}

export interface GlitchParamSettings {
  probability?: number
  intervalMs?: number
  durationMs?: number
  enabled?: boolean
}

export interface CRTIntensitySettings {
  vignetteOpacity?: number
  scanlineHeight?: number
  noiseFrequency?: number
}

export interface HeroSectionSettings {
  minHeight?: string
  paddingTop?: string
}

export interface BioSectionSettings {
  readMoreMaxHeight?: string
  textSize?: string
}

/** Controls which fields are visible in the admin panel via Progressive Disclosure. */
export type DisclosureLevel = 'basic' | 'advanced' | 'expert'

/** Per-section style overrides, used under sections.styleOverrides.<sectionId>. */
export interface SectionStyleOverride {
  headingFontSize?: string
  headingFontWeight?: string
  headingFontFamily?: string
  bodyFontSize?: string
  bodyLineHeight?: string
  textAlign?: 'left' | 'center' | 'right'
  primaryColor?: string
  backgroundColor?: string
  cardColor?: string
  borderColor?: string
  paddingY?: string
  paddingX?: string
  maxWidth?: string
  glitchEnabled?: boolean
  headingTextShadow?: boolean
  // Section-specific extended fields
  minHeight?: string
  paddingTop?: string
  readMoreMaxHeight?: string
  textSize?: string
  // Hero-specific
  heroImageOpacity?: number
  heroImageBlur?: number
  // Gallery-specific
  columns?: string
  aspectRatio?: string
  lightbox?: boolean
  maxVisible?: number
  gap?: string
  // Media-specific
  layout?: string
  // Releases-specific
  releaseLayout?: 'grid' | 'swipe' | 'carousel-3d'
  releaseColumns?: '2' | '3' | '4'
  releaseCardVariant?: 'default' | 'square-minimal' | 'square-titled' | 'compact' | 'square-cover'
  releaseHoverEffect?: 'default' | 'zoom' | 'glow' | 'lift' | 'scan' | 'chromatic' | 'flip'
}

export interface AdminSettings {
  // UI preferences
  ui?: {
    disclosureLevel?: DisclosureLevel
  }

  // Section management
  sections?: {
    /** section id → visibility (default: true) */
    visibility?: Record<string, boolean>
    /** Custom section display order */
    order?: string[]
    /** Per-section style overrides */
    styleOverrides?: Record<string, SectionStyleOverride>
  }

  // Design system
  design?: {
    theme?: ThemeCustomization
    typography?: TypographyDetailSettings
    effects?: EffectColorSettings
    timings?: AnimationTimingSettings
    glitch?: GlitchParamSettings
    crt?: CRTIntensitySettings
    layout?: LayoutSpacingSettings
    navigation?: NavigationStylingSettings
    footer?: FooterStylingSettings
    colorPresets?: CustomColorPreset[]
    faviconUrl?: string
  }

  // Background & animation
  background?: AnimationSettings

  // Progressive overlay modes
  progressiveOverlayModes?: ProgressiveOverlayModes

  // Content labels
  labels?: SectionLabels

  // Contact & legal
  contact?: ContactInfo & ContactSettings
  legal?: LegalContent

  // Shell / member
  shell?: ShellMember

  // Terminal
  terminal?: {
    commands?: TerminalCommand[]
    glitchText?: {
      enabled?: boolean
      intervalMs?: number
      durationMs?: number
    }
  }

  // HUD / decorative
  hud?: HudTexts
  decorative?: DecorativeTexts
  loader?: LoaderTexts

  // i18n
  locale?: string
  customTranslations?: Record<string, Record<string, string>>

  // Advanced config overrides
  configOverrides?: Record<string, unknown>

  // Custom social links (not covered by SiteData.social)
  customSocialLinks?: CustomSocialLink[]

  // Sound / audio settings
  sound?: SoundSettings

  // Analytics settings
  analytics?: {
    enabled?: boolean
    trackPageViews?: boolean
    trackEvents?: boolean
  }
}

export interface CustomColorPreset {
  id: string
  name: string
  theme: ThemeCustomization
}

export interface ContactMessage {
  id: string
  name: string
  email: string
  subject: string
  message: string
  date: string
  read?: boolean
}

export interface ContactSettings {
  enabled?: boolean
  title?: string
  description?: string
  emailForwardTo?: string
  successMessage?: string
  showSection?: boolean
  formNameLabel?: string
  formNamePlaceholder?: string
  formEmailLabel?: string
  formEmailPlaceholder?: string
  formSubjectLabel?: string
  formSubjectPlaceholder?: string
  formMessageLabel?: string
  formMessagePlaceholder?: string
  formButtonText?: string
}

export interface Member {
  name: string
  photo?: string
  bio?: string
  role?: string
  social?: Record<string, string>
  subjectLabel?: string
  statusLabel?: string
  statusValue?: string
}

export interface Biography {
  story: string
  founded?: string
  members?: (string | Member)[]
  achievements?: string[]
  collabs?: string[]
  photos?: string[]
  friends?: Friend[]
}

export interface FontSizeSettings {
  biographyStory?: string
  gigsText?: string
  releasesText?: string
  connectText?: string
}

export interface SocialLinks {
  instagram?: string
  facebook?: string
  spotify?: string
  youtube?: string
  soundcloud?: string
  bandcamp?: string
  tiktok?: string
  appleMusic?: string
  twitter?: string
  twitch?: string
  beatport?: string
  linktree?: string
}

export interface Gig {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  support?: string
  lineup?: string[]
  supportingArtists?: string[]
  streetAddress?: string
  postalCode?: string
  soldOut?: boolean
  startsAt?: string
  description?: string
  title?: string
  gigType?: '' | 'concert' | 'dj'
  allDay?: boolean
  status?: '' | 'confirmed' | 'cancelled' | 'soldout' | 'announced'
  eventLinks?: {
    facebook?: string
    instagram?: string
    residentAdvisor?: string
    other?: string
  }
  photo?: string
}

export interface HudTexts {
  topLeft1?: string
  topLeft2?: string
  topLeftStatus?: string
  topRight?: string
  topRight1?: string
  topRight2?: string
  bottomLeft?: string
  bottomLeft1?: string
  bottomLeft2?: string
  bottomRight?: string
  bottomRight1?: string
  bottomRight2?: string
}

/**
 * Configurable decorative HUD-style texts displayed throughout the website.
 * Supports template variables in `{var}` syntax that get replaced at runtime:
 *   {session.id}          - 8-char hex session ID
 *   {session.sector}      - timezone-based region (e.g. EU-CENTRAL)
 *   {session.browser}     - browser name + version (e.g. CHROME.131)
 *   {session.os}          - operating system (e.g. MACOS)
 *   {session.platform}    - browser + os combined
 *   {session.downlink}    - connection speed in Mbps
 *   {session.build}       - app version + git hash
 *   {session.connection}  - HTTPS status
 *   {data.releases}       - number of releases loaded
 *   {data.gigs}           - number of upcoming gigs
 *   {data.tracks}         - number of tracks loaded
 *   {data.members}        - number of members
 */
export interface DecorativeTexts {
  // Overlay headers
  overlaySystemLabel?: string
  // Gig overlay
  gigDataStreamLabel?: string
  gigStatusPrefix?: string
  // Contact overlay
  contactStreamLabel?: string
  contactFormLabel?: string
  contactStatusLabel?: string
  // Privacy overlay
  privacyStreamLabel?: string
  privacyStatusLabel?: string
  // Impressum overlay
  impressumStreamLabel?: string
  impressumStatusLabel?: string
  // Member overlay
  memberProfileLabel?: string
  // HUD labels
  hudTimeLabel?: string
  hudSessionLabel?: string
  hudUptimeLabel?: string
  hudSectorLabel?: string
  hudDataRateLabel?: string
  // Loading screen
  loaderBuildInfo?: string
  loaderPlatformInfo?: string
  loaderConnectionStatus?: string
  // GlitchDecodeLoader status texts
  glitchStage1?: string
  glitchStage2?: string
  glitchStage3?: string
  glitchStage4?: string
  glitchStage5?: string
  glitchStageComplete?: string
  glitchBootLabel?: string
}

export interface Datenschutz {
  customText?: string
  customTextEn?: string
}

export interface Impressum {
  name: string
  careOf?: string
  street?: string
  zipCity?: string
  phone?: string
  email?: string
  responsibleName?: string
  responsibleAddress?: string
  nameEn?: string
  careOfEn?: string
  streetEn?: string
  zipCityEn?: string
  responsibleNameEn?: string
  responsibleAddressEn?: string
}

export interface GalleryImage {
  id: string
  url: string
  caption?: string
}

export interface NewsItem {
  id: string
  date: string
  text: string
  title?: string
  image?: string
  photo?: string
  link?: string
  details?: string
}

export interface OverlayEffect {
  enabled: boolean
  intensity: number
}

export interface OverlayEffects {
  dotMatrix?: OverlayEffect
  scanlines?: OverlayEffect
  crt?: OverlayEffect
  noise?: OverlayEffect
  vignette?: OverlayEffect
  chromatic?: OverlayEffect
  movingScanline?: OverlayEffect
}

export interface ThemeSettings {
  primary?: string
  accent?: string
  background?: string
  card?: string
  foreground?: string
  mutedForeground?: string
  border?: string
  secondary?: string
  fontBody?: string
  fontMono?: string
  fontHeading?: string
  borderRadius?: number
  fontSize?: number
  overlayEffects?: OverlayEffects
  activePreset?: string
}

export interface Release {
  id: string
  title: string
  artwork?: string
  year?: string
  releaseDate?: string
  featured?: boolean
  type?: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  description?: string
  tracks?: Array<{
    title: string
    duration?: string
    artist?: string
    featuredArtists?: string[]
  }>
  streamingLinks?: {
    spotify?: string
    soundcloud?: string
    bandcamp?: string
    youtube?: string
    appleMusic?: string
    beatport?: string
    deezer?: string
    tidal?: string
    amazonMusic?: string
  }
  customLinks?: Array<{ label: string; url: string }>
  manuallyEdited?: boolean
}

export interface Friend {
  id: string
  name: string
  photo?: string
  iconPhoto?: string
  profilePhoto?: string
  description?: string
  url?: string
  subjectLabel?: string
  statusLabel?: string
  statusValue?: string
  socials?: {
    instagram?: string
    facebook?: string
    spotify?: string
    soundcloud?: string
    youtube?: string
    website?: string
    bandcamp?: string
    tiktok?: string
    appleMusic?: string
  }
}

export interface SoundSettings {
  defaultMuted?: boolean
  terminalSound?: string
  typingSound?: string
  buttonSound?: string
  loadingFinishedSound?: string
  backgroundMusic?: string
  backgroundMusicVolume?: number
}
