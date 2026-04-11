export interface Track {
  id: string
  title: string
  artist: string
  url: string
  artwork?: string
}

export interface Gig {
  id: string
  venue: string
  location: string
  date: string
  ticketUrl?: string
  support?: string
  lineup?: string[]
  streetAddress?: string
  postalCode?: string
  latitude?: string
  longitude?: string
  soldOut?: boolean
  startsAt?: string
  description?: string
  title?: string
}

export interface Release {
  id: string
  title: string
  artwork: string
  year: string
  releaseDate?: string
  streamingLinks?: Array<{ platform: string; url: string }>
  type?: '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation'
  description?: string
  tracks?: Array<{ title: string; duration?: string }>
}

export interface Member {
  id: string
  name: string
  role: string
  bio: string
  image?: string
  instagram?: string
}

export interface MediaFile {
  id: string
  name: string
  type: 'audio' | 'youtube' | 'download'
  url: string
  size: string
}

export interface CreditHighlight {
  src: string
  alt: string
  /** Optional caption displayed below the image */
  caption?: string
  /** Optional URL opened when the image is clicked */
  url?: string
}

export interface HeroLink {
  id: string
  label: string
  /** 'section' = scrolls to a section ID, 'url' = external URL */
  type: 'section' | 'url'
  target: string
  icon?: string
}

export interface SiteData {
  artistName: string
  heroImage: string
  bio: string
  tracks: Track[]
  gigs: Gig[]
  releases: Release[]
  gallery: string[]
  instagramFeed: string[]
  members: Member[]
  mediaFiles: MediaFile[]
  creditHighlights: CreditHighlight[]
  sponsoring?: CreditHighlight[]
  heroLinks?: HeroLink[]
  social: {
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
    merch?: string
  }
  website?: string
}

export const DEFAULT_SITE_DATA: SiteData = {
  artistName: '',
  heroImage: '',
  bio: '',
  tracks: [],
  gigs: [],
  releases: [],
  gallery: [],
  instagramFeed: [],
  members: [],
  mediaFiles: [],
  creditHighlights: [],
  social: {},
}

/** Discriminated union so TypeScript narrows `data` to the correct type per overlay variant. */
export type CyberpunkOverlayState =
  | { type: 'impressum' | 'privacy' | 'contact'; data?: never }
  | { type: 'gig'; data: Gig }
  | { type: 'release'; data: Release }
  | { type: 'member'; data: Member }
