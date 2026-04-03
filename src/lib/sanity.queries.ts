/**
 * GROQ Queries for Sanity
 *
 * All data-fetching queries in one place. Each query maps to the
 * corresponding TypeScript interfaces in src/lib/types.ts.
 */
import groq from 'groq'

// ─── Singletons ──────────────────────────────────────────────────────────────

/** Fetch the global site settings (singleton) */
export const siteSettingsQuery = groq`
  *[_type == "siteSettings"][0] {
    artistName,
    "heroImage": heroImage.asset->url,
    bio,
    founded,
    achievements,
    collabs,
    social,
    soundSettings,
    faviconUrl
  }
`

/** Fetch admin settings (singleton) */
export const adminSettingsQuery = groq`
  *[_type == "adminSettings"][0] {
    sectionVisibility,
    sectionOrder,
    theme,
    animations,
    progressiveOverlayModes,
    glitchTextSettings,
    sectionLabels,
    contactInfo,
    contactSettings,
    legalContent,
    customSocialLinks[] {
      "id": _key,
      label,
      url,
      icon
    },
    configOverrides
  }
`

/** Fetch HUD texts (singleton) */
export const hudTextsQuery = groq`
  *[_type == "hudTexts"][0] {
    topLeft1, topLeft2, topLeftStatus,
    topRight, topRight1, topRight2,
    bottomLeft, bottomLeft1, bottomLeft2,
    bottomRight, bottomRight1, bottomRight2
  }
`

/** Fetch legal content (singleton) */
export const legalContentQuery = groq`
  *[_type == "legalContent"][0] {
    impressum,
    datenschutz
  }
`

/** Fetch sync log (singleton) */
export const syncLogQuery = groq`
  *[_type == "syncLog"][0] {
    lastReleasesSync,
    lastGigsSync,
    lastItunesSyncStatus,
    lastBandsintownSyncStatus
  }
`

// ─── Collections ─────────────────────────────────────────────────────────────

/** Fetch all releases, sorted by release date (newest first) */
export const releasesQuery = groq`
  *[_type == "release"] | order(releaseDate desc) {
    "id": _id,
    title,
    "artwork": coalesce(artwork.asset->url, artworkUrl),
    releaseDate,
    year,
    featured,
    "type": releaseType,
    description,
    tracks[] { title, duration },
    streamingLinks,
    itunesId,
    source
  }
`

/** Fetch all upcoming gigs (date >= today), sorted ascending */
export const upcomingGigsQuery = groq`
  *[_type == "gig" && date >= now()] | order(date asc) {
    "id": _id,
    title,
    venue,
    location,
    date,
    startsAt,
    allDay,
    gigType,
    status,
    soldOut,
    ticketUrl,
    description,
    "photo": photo.asset->url,
    lineup,
    support,
    supportingArtists,
    streetAddress,
    postalCode,
    eventLinks,
    bandsintownId,
    source
  }
`

/** Fetch all gigs (past + future), sorted by date descending */
export const allGigsQuery = groq`
  *[_type == "gig"] | order(date desc) {
    "id": _id,
    title,
    venue,
    location,
    date,
    startsAt,
    allDay,
    gigType,
    status,
    soldOut,
    ticketUrl,
    description,
    "photo": photo.asset->url,
    lineup,
    support,
    supportingArtists,
    streetAddress,
    postalCode,
    eventLinks,
    bandsintownId,
    source
  }
`

/** Fetch all members, sorted by sortOrder */
export const membersQuery = groq`
  *[_type == "member"] | order(sortOrder asc) {
    "id": _id,
    name,
    "photo": photo.asset->url,
    role,
    bio,
    subjectLabel,
    statusLabel,
    statusValue,
    social,
    isShellMember,
    sortOrder
  }
`

/** Fetch shell members only */
export const shellMembersQuery = groq`
  *[_type == "member" && isShellMember == true] | order(sortOrder asc) {
    name,
    "photo": photo.asset->url,
    role,
    bio,
    social
  }
`

/** Fetch all friends/partners, sorted by sortOrder */
export const friendsQuery = groq`
  *[_type == "friend"] | order(sortOrder asc) {
    "id": _id,
    name,
    "photo": coalesce(photo.asset->url, ""),
    "iconPhoto": iconPhoto.asset->url,
    "profilePhoto": profilePhoto.asset->url,
    description,
    url,
    subjectLabel,
    statusLabel,
    statusValue,
    socials,
    sortOrder
  }
`

/** Fetch all news items, sorted by date (newest first) */
export const newsQuery = groq`
  *[_type == "newsItem"] | order(date desc) {
    "id": _id,
    title,
    date,
    text,
    details,
    "image": coalesce(image.asset->url, imageUrl),
    "photo": coalesce(image.asset->url, imageUrl),
    link
  }
`

/** Fetch all gallery images, sorted by sortOrder */
export const galleryQuery = groq`
  *[_type == "galleryImage"] | order(sortOrder asc) {
    "id": _id,
    "url": coalesce(image.asset->url, imageUrl),
    caption
  }
`

/** Fetch all media files, sorted by sortOrder */
export const mediaFilesQuery = groq`
  *[_type == "mediaFile"] | order(sortOrder asc) {
    "id": _id,
    name,
    "url": coalesce(file.asset->url, url),
    folder,
    "type": mediaType,
    description
  }
`

/** Fetch all credit highlights, sorted by sortOrder */
export const creditHighlightsQuery = groq`
  *[_type == "creditHighlight"] | order(sortOrder asc) {
    "id": _id,
    title,
    description,
    "src": coalesce(image.asset->url, imageUrl),
    link
  }
`

/** Fetch all terminal commands */
export const terminalCommandsQuery = groq`
  *[_type == "terminalCommand"] {
    name,
    description,
    output,
    fileName,
    fileUrl
  }
`

// ─── Parameterized Queries ───────────────────────────────────────────────────

/** Check if a release with given iTunes ID already exists */
export const releaseByItunesIdQuery = groq`
  *[_type == "release" && itunesId == $itunesId][0] { _id }
`

/** Check if a gig with given Bandsintown ID already exists */
export const gigByBandsintownIdQuery = groq`
  *[_type == "gig" && bandsintownId == $bandsintownId][0] { _id }
`

/** Fetch a single release by ID */
export const releaseByIdQuery = groq`
  *[_type == "release" && _id == $id][0] {
    "id": _id,
    title,
    "artwork": coalesce(artwork.asset->url, artworkUrl),
    releaseDate,
    year,
    featured,
    "type": releaseType,
    description,
    tracks[] { title, duration },
    streamingLinks,
    itunesId,
    source
  }
`

/** Fetch a single gig by ID */
export const gigByIdQuery = groq`
  *[_type == "gig" && _id == $id][0] {
    "id": _id,
    title,
    venue,
    location,
    date,
    startsAt,
    allDay,
    gigType,
    status,
    soldOut,
    ticketUrl,
    description,
    "photo": photo.asset->url,
    lineup,
    support,
    supportingArtists,
    streetAddress,
    postalCode,
    eventLinks,
    bandsintownId,
    source
  }
`
