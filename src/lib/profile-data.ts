import type { Member, Friend, SectionLabels } from '@/lib/types'

/** Build terminal-style data lines for a member profile overlay */
export function buildMemberDataLines(member: Member, sectionLabels?: SectionLabels): string[] {
  const lines: string[] = []
  const subjectLabel = member.subjectLabel || 'SUBJECT'
  lines.push(`> ${subjectLabel}: ${member.name.toUpperCase()}`)

  const profileFields = sectionLabels?.profileFields
  if (profileFields && profileFields.length > 0) {
    profileFields.forEach(field => {
      lines.push(`> ${field.label}: ${field.value}`)
    })
  } else {
    const statusLabel = member.statusLabel || 'STATUS'
    const statusValue = member.statusValue || sectionLabels?.profileStatusText || 'ACTIVE'
    lines.push(`> ${statusLabel}: ${statusValue}`)
  }
  if (member.bio) {
    lines.push('> ---')
    lines.push(`> ${member.bio}`)
  }
  lines.push('> ---')
  if (!profileFields || profileFields.length === 0) {
    lines.push('> CLEARANCE: GRANTED')
  }
  return lines
}

/** Social icon definitions for friend profiles */
export const FRIEND_SOCIAL_KEYS = [
  'instagram', 'facebook', 'spotify', 'soundcloud', 'youtube', 'bandcamp', 'website',
] as const

type FriendSocialKey = (typeof FRIEND_SOCIAL_KEYS)[number]

/** Build terminal-style data lines for a friend profile overlay */
export function buildFriendDataLines(
  friend: Friend,
  sectionLabels?: SectionLabels,
  socialLabels?: { key: FriendSocialKey; label: string }[]
): string[] {
  const lines: string[] = []
  const subjectLabel = friend.subjectLabel || 'SUBJECT'
  lines.push(`> ${subjectLabel}: ${friend.name.toUpperCase()}`)

  const profileFields = sectionLabels?.profileFields
  if (profileFields && profileFields.length > 0) {
    profileFields.forEach(field => {
      lines.push(`> ${field.label}: ${field.value}`)
    })
  } else if (friend.statusLabel || friend.statusValue) {
    const statusLabel = friend.statusLabel || 'STATUS'
    const statusValue = friend.statusValue || 'ACTIVE'
    lines.push(`> ${statusLabel}: ${statusValue}`)
  }
  if (friend.description) {
    lines.push('> ---')
    lines.push(`> ${friend.description}`)
  }
  if (friend.url) {
    lines.push('> ---')
    lines.push(`> LINK: ${friend.url}`)
  }
  if (socialLabels) {
    const activeSocials = socialLabels.filter(({ key }) => friend.socials?.[key])
    if (activeSocials.length > 0) {
      lines.push('> ---')
      lines.push('> SOCIAL CONNECTIONS:')
      activeSocials.forEach(({ key, label }) => {
        lines.push(`>   ${label.toUpperCase()}: ${friend.socials![key]}`)
      })
    }
  }
  lines.push('> ---')
  if (!profileFields || profileFields.length === 0) {
    lines.push('> CLEARANCE: GRANTED')
  }
  return lines
}
