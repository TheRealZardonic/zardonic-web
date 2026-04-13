/**
 * SchemaIcon
 *
 * Renders a Phosphor icon by its string name, as used in `AdminSectionSchema.icon`.
 * Provides a stable, type-safe mapping between schema icon names and Phosphor components.
 *
 * Add new entries to the ICON_MAP when registering schemas that use icon names
 * not yet covered here.
 */

import {
  House,
  BookOpen,
  MusicNote,
  Disc,
  CalendarBlank,
  Video,
  ShareNetwork,
  Envelope,
  Images,
  UsersThree,
  Star,
  Trophy,
  Terminal,
  Rows,
  Scales,
  Question,
} from '@phosphor-icons/react'

type PhosphorIconComponent = React.ComponentType<{
  size?: number
  className?: string
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}>

const ICON_MAP: Record<string, PhosphorIconComponent> = {
  House,
  BookOpen,
  MusicNote,
  Disc,
  CalendarBlank,
  Video,
  ShareNetwork,
  Envelope,
  Images,
  UsersThree,
  Star,
  Trophy,
  Terminal,
  Rows,
  Scales,
}

export interface SchemaIconProps {
  /** Icon name as declared in `AdminSectionSchema.icon`. */
  iconName: string
  /** Icon size in pixels. Defaults to 16. */
  size?: number
  /** Additional CSS classes. */
  className?: string
  /** Phosphor icon weight. Defaults to 'regular'. */
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone'
}

/**
 * Renders a Phosphor icon identified by a string key from the schema registry.
 * Falls back to a `Question` mark icon for unrecognised names.
 */
export function SchemaIcon({ iconName, size = 16, className, weight = 'regular' }: SchemaIconProps) {
  const Icon = ICON_MAP[iconName] ?? Question
  return <Icon size={size} className={className} weight={weight} />
}
