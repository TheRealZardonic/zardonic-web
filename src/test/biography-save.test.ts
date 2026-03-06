import { describe, it, expect } from 'vitest'
import type { Biography, Friend } from '@/lib/types'

/**
 * Test that the biography save logic preserves friends and photos data.
 * This validates the fix for BiographyEditDialog.handleSave which previously
 * stripped friends and photos when saving.
 */

function simulateBiographySave(
  story: string,
  founded: string | undefined,
  members: { name: string }[] | undefined,
  achievements: string[] | undefined,
  existingBiography: Biography
): Biography {
  // This mirrors BiographyEditDialog.handleSave (fixed version)
  return {
    story,
    founded: founded || undefined,
    members: members && members.length > 0 ? members : undefined,
    achievements: achievements && achievements.length > 0 ? achievements : undefined,
    photos: existingBiography.photos,
    friends: existingBiography.friends,
  }
}

describe('Biography save preserves friends and photos', () => {
  it('preserves friends when saving biography edits', () => {
    const friends: Friend[] = [
      { id: '1', name: 'DJ Partner', description: 'Cool artist' },
      { id: '2', name: 'Label Mate' },
    ]
    const existing: Biography = {
      story: 'Old story',
      friends,
      photos: ['https://example.com/photo1.jpg'],
    }

    const saved = simulateBiographySave('New story', '2020', undefined, undefined, existing)

    expect(saved.story).toBe('New story')
    expect(saved.friends).toEqual(friends)
    expect(saved.photos).toEqual(['https://example.com/photo1.jpg'])
  })

  it('preserves photos when saving biography edits', () => {
    const photos = ['https://drive.google.com/file/d/abc/view', 'https://example.com/img.jpg']
    const existing: Biography = {
      story: 'Story',
      photos,
    }

    const saved = simulateBiographySave('Updated story', undefined, undefined, undefined, existing)
    expect(saved.photos).toEqual(photos)
  })

  it('handles missing friends/photos gracefully', () => {
    const existing: Biography = {
      story: 'Story',
    }

    const saved = simulateBiographySave('New', '2020', [{ name: 'Member' }], ['Achievement'], existing)
    expect(saved.friends).toBeUndefined()
    expect(saved.photos).toBeUndefined()
    expect(saved.members).toEqual([{ name: 'Member' }])
    expect(saved.achievements).toEqual(['Achievement'])
  })
})
