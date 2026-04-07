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
  spotify?: string
  soundcloud?: string
  youtube?: string
  bandcamp?: string
  appleMusic?: string
  deezer?: string
  tidal?: string
  amazonMusic?: string
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
  type: 'image' | 'pdf' | 'zip'
  url: string
  size: string
}

export interface CreditHighlight {
  src: string
  alt: string
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
  }
}

export const DEFAULT_SITE_DATA: SiteData = {
  artistName: 'ZARDONIC',
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
