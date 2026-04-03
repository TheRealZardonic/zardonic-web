/**
 * Sanity Data Loader
 *
 * Unified data fetching layer that reads from Sanity Content Lake
 * instead of the legacy Upstash Redis KV store.
 *
 * Provides the same data shapes as the original SiteData and AdminSettings
 * interfaces so existing components work without modification.
 */
import { sanityClient, resolveImageUrl } from './sanity.client'
import {
  siteSettingsQuery,
  adminSettingsQuery,
  releasesQuery,
  upcomingGigsQuery,
  allGigsQuery,
  membersQuery,
  shellMembersQuery,
  friendsQuery,
  newsQuery,
  galleryQuery,
  mediaFilesQuery,
  creditHighlightsQuery,
  terminalCommandsQuery,
  hudTextsQuery,
  legalContentQuery,
  syncLogQuery,
} from './sanity.queries'
import type {
  AdminSettings,
  Release,
  Gig,
  Member,
  Friend,
  NewsItem,
  GalleryImage,
  MediaFile,
  HudTexts,
  Impressum,
  Datenschutz,
  TerminalCommand,
  ShellMember,
  SoundSettings,
} from './types'

// ─── Type for the combined site data (mirrors SiteData from App.tsx) ────────

export interface SanitySiteData {
  artistName: string
  heroImage: string
  bio: string
  tracks: Array<{ id: string; title: string; artist: string; url: string; artwork?: string }>
  gigs: Gig[]
  releases: Release[]
  gallery: string[]
  instagramFeed: string[]
  members: Member[]
  mediaFiles: MediaFile[]
  creditHighlights: Array<{ id: string; title: string; description?: string; src?: string; link?: string }>
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
  friends: Friend[]
  founded?: string
  achievements?: string[]
  collabs?: string[]
  soundSettings?: SoundSettings
}

// ─── Individual Fetchers ────────────────────────────────────────────────────

export async function fetchSiteSettings(): Promise<{
  artistName: string
  heroImage: string
  bio: string
  founded?: string
  achievements?: string[]
  collabs?: string[]
  social: Record<string, string | undefined>
  soundSettings?: SoundSettings
  faviconUrl?: string
} | null> {
  return sanityClient.fetch(siteSettingsQuery)
}

export async function fetchAdminSettings(): Promise<AdminSettings | null> {
  const raw = await sanityClient.fetch(adminSettingsQuery)
  if (!raw) return null

  // Parse configOverrides from JSON string if present
  let configOverrides: Record<string, unknown> | undefined
  if (raw.configOverrides && typeof raw.configOverrides === 'string') {
    try {
      configOverrides = JSON.parse(raw.configOverrides) as Record<string, unknown>
    } catch {
      configOverrides = undefined
    }
  }

  return {
    ...raw,
    configOverrides,
  }
}

export async function fetchReleases(): Promise<Release[]> {
  return sanityClient.fetch(releasesQuery) ?? []
}

export async function fetchUpcomingGigs(): Promise<Gig[]> {
  return sanityClient.fetch(upcomingGigsQuery) ?? []
}

export async function fetchAllGigs(): Promise<Gig[]> {
  return sanityClient.fetch(allGigsQuery) ?? []
}

export async function fetchMembers(): Promise<Member[]> {
  return sanityClient.fetch(membersQuery) ?? []
}

export async function fetchShellMembers(): Promise<ShellMember[]> {
  return sanityClient.fetch(shellMembersQuery) ?? []
}

export async function fetchFriends(): Promise<Friend[]> {
  return sanityClient.fetch(friendsQuery) ?? []
}

export async function fetchNews(): Promise<NewsItem[]> {
  return sanityClient.fetch(newsQuery) ?? []
}

export async function fetchGallery(): Promise<GalleryImage[]> {
  return sanityClient.fetch(galleryQuery) ?? []
}

export async function fetchMediaFiles(): Promise<MediaFile[]> {
  return sanityClient.fetch(mediaFilesQuery) ?? []
}

export async function fetchCreditHighlights(): Promise<Array<{ id: string; title: string; description?: string; src?: string; link?: string }>> {
  return sanityClient.fetch(creditHighlightsQuery) ?? []
}

export async function fetchTerminalCommands(): Promise<TerminalCommand[]> {
  return sanityClient.fetch(terminalCommandsQuery) ?? []
}

export async function fetchHudTexts(): Promise<HudTexts | null> {
  return sanityClient.fetch(hudTextsQuery)
}

export async function fetchLegalContent(): Promise<{ impressum: Impressum; datenschutz: Datenschutz } | null> {
  return sanityClient.fetch(legalContentQuery)
}

export async function fetchSyncLog(): Promise<{ lastReleasesSync: string | null; lastGigsSync: string | null } | null> {
  return sanityClient.fetch(syncLogQuery)
}

// ─── Combined Loader (replaces useKV('zardonic-site-data')) ─────────────────

/**
 * Loads all site data from Sanity in parallel.
 * Returns the same shape as the legacy SiteData interface.
 */
export async function loadSiteData(): Promise<SanitySiteData> {
  const [
    settings,
    releases,
    gigs,
    members,
    friends,
    _news,
    gallery,
    mediaFiles,
    creditHighlights,
  ] = await Promise.all([
    fetchSiteSettings(),
    fetchReleases(),
    fetchAllGigs(),
    fetchMembers(),
    fetchFriends(),
    fetchNews(),
    fetchGallery(),
    fetchMediaFiles(),
    fetchCreditHighlights(),
  ])

  return {
    artistName: settings?.artistName ?? 'Zardonic',
    heroImage: settings?.heroImage ?? '',
    bio: settings?.bio ?? '',
    founded: settings?.founded,
    achievements: settings?.achievements,
    collabs: settings?.collabs,
    social: (settings?.social ?? {}) as SanitySiteData['social'],
    soundSettings: settings?.soundSettings,
    tracks: [], // Audio tracks remain in media files, not in site settings
    gigs,
    releases,
    gallery: gallery.map((img: GalleryImage) => img.url),
    instagramFeed: [], // Instagram feed handled separately
    members,
    mediaFiles,
    creditHighlights,
    friends,
  }
}

/**
 * Loads admin settings from Sanity.
 * Returns the same shape as the legacy AdminSettings interface.
 * Returns an empty AdminSettings object (not null) so consumers don't need null-checks.
 */
export async function loadAdminSettings(): Promise<AdminSettings> {
  const settings = await fetchAdminSettings()
  return settings ?? ({} as AdminSettings)
}

// Re-export resolveImageUrl for convenience
export { resolveImageUrl }
