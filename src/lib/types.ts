export interface SectionVisibility {
  bio?: boolean
  music?: boolean
  gigs?: boolean
  releases?: boolean
  gallery?: boolean
  connect?: boolean
  creditHighlights?: boolean
  shell?: boolean
  contact?: boolean
}

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
}

export interface AnimationSettings {
  glitchEnabled?: boolean
  scanlineEnabled?: boolean
  chromaticEnabled?: boolean
  crtEnabled?: boolean
  noiseEnabled?: boolean
  circuitBackgroundEnabled?: boolean
  crtOverlayOpacity?: number
  crtVignetteOpacity?: number
}

export interface ProgressiveOverlayModes {
  progressiveReveal?: boolean
  dataStream?: boolean
  sectorAssembly?: boolean
  holographicMaterialization?: boolean
}

export interface SectionLabels {
  biography?: string
  musicPlayer?: string
  upcomingGigs?: string
  releases?: string
  gallery?: string
  connect?: string
  creditHighlights?: string
  media?: string
  tourDates?: string
  shell?: string
  contact?: string
  headingPrefix?: string
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
}

export interface MediaFile {
  id: string
  name: string
  url: string
  folder?: string
  type?: 'audio' | 'youtube' | 'download'
  description?: string
}

export interface AdminSettings {
  sectionVisibility?: SectionVisibility
  theme?: ThemeCustomization
  animations?: AnimationSettings
  progressiveOverlayModes?: ProgressiveOverlayModes
  configOverrides?: Record<string, unknown>
  faviconUrl?: string
  sectionLabels?: SectionLabels
  terminalCommands?: TerminalCommand[]
  sectionOrder?: string[]
  contactInfo?: ContactInfo
  contactSettings?: ContactSettings
  legalContent?: LegalContent
  shellMember?: ShellMember
  shellMembers?: ShellMember[]
  customSocialLinks?: CustomSocialLink[]
  glitchTextSettings?: {
    enabled?: boolean
    intervalMs?: number
    durationMs?: number
  }
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
}
