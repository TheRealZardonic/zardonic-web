/**
 * StructuredData – Injects JSON-LD schema markup for SEO / rich snippets.
 *
 * Renders a MusicGroup schema for the artist page, plus Event schemas for
 * upcoming gigs and MusicAlbum schemas for recent releases.
 */
import type { SiteData } from '@/lib/app-types'
import type { Gig, Release } from '@/lib/app-types'

interface StructuredDataProps {
  artistName: string
  siteData: SiteData
  canonicalUrl?: string
}

function buildMusicGroupSchema(artistName: string, siteData: SiteData, canonicalUrl: string) {
  const social = siteData.social ?? {}
  const sameAs: string[] = []
  if (social.instagram) sameAs.push(`https://instagram.com/${social.instagram.replace(/^@/, '')}`)
  if (social.facebook) sameAs.push(social.facebook)
  if (social.spotify) sameAs.push(social.spotify)
  if (social.youtube) sameAs.push(social.youtube)
  if (social.soundcloud) sameAs.push(social.soundcloud)
  if (social.bandcamp) sameAs.push(social.bandcamp)
  if (social.appleMusic) sameAs.push(social.appleMusic)

  return {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artistName,
    url: canonicalUrl,
    ...(siteData.bio ? { description: siteData.bio } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  }
}

function buildEventSchemas(artistName: string, gigs: Gig[]) {
  const now = new Date()
  return gigs
    .filter(gig => new Date(gig.date) >= now)
    .map(gig => ({
      '@context': 'https://schema.org',
      '@type': 'MusicEvent',
      name: gig.title ?? `${artistName} at ${gig.venue}`,
      startDate: gig.date,
      location: {
        '@type': 'Place',
        name: gig.venue,
        address: {
          '@type': 'PostalAddress',
          addressLocality: gig.location,
          ...(gig.streetAddress ? { streetAddress: gig.streetAddress } : {}),
          ...(gig.postalCode ? { postalCode: gig.postalCode } : {}),
        },
      },
      performer: {
        '@type': 'MusicGroup',
        name: artistName,
      },
      ...(gig.ticketUrl
        ? {
            offers: {
              '@type': 'Offer',
              url: gig.ticketUrl,
              availability: gig.soldOut
                ? 'https://schema.org/SoldOut'
                : 'https://schema.org/InStock',
            },
          }
        : {}),
    }))
}

function buildAlbumSchemas(artistName: string, releases: Release[]) {
  return releases.slice(0, 10).map(release => ({
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: release.title,
    byArtist: { '@type': 'MusicGroup', name: artistName },
    ...(release.releaseDate
      ? { datePublished: release.releaseDate }
      : release.year
        ? { datePublished: release.year }
        : {}),
    ...(release.artwork ? { image: release.artwork } : {}),
  }))
}

export function StructuredData({ artistName, siteData, canonicalUrl = 'https://zardonic.com/' }: StructuredDataProps) {
  const schemas = [
    buildMusicGroupSchema(artistName, siteData, canonicalUrl),
    ...buildEventSchemas(artistName, siteData.gigs ?? []),
    ...buildAlbumSchemas(artistName, siteData.releases ?? []),
  ]

  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is sanitised structured data
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}
