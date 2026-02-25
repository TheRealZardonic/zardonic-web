import { motion, useInView, AnimatePresence } from 'framer-motion'
import { PencilSimple, User, Plus, Trash, InstagramLogo, FacebookLogo, SpotifyLogo, SoundcloudLogo, YoutubeLogo, MusicNote, Globe } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import ProgressiveImage from '@/components/ProgressiveImage'
import ProfileOverlay from '@/components/ProfileOverlay'
import { useOverlayTransition } from '@/components/OverlayTransition'
import SafeText from '@/components/SafeText'
import { useState, useRef, useMemo } from 'react'
import { useTypingEffect } from '@/hooks/use-typing-effect'
import { ChromaticText } from '@/components/ChromaticText'
import type { Friend, SectionLabels } from '@/lib/types'
import { toDirectImageUrl } from '@/lib/image-cache'
import { buildFriendDataLines } from '@/lib/profile-data'
import {
  TITLE_TYPING_SPEED_MS,
  TITLE_TYPING_START_DELAY_MS,
} from '@/lib/config'

interface PartnersAndFriendsSectionProps {
  friends?: Friend[]
  editMode?: boolean
  onUpdate?: (friends: Friend[]) => void
  sectionLabels?: SectionLabels
  onLabelChange?: (key: keyof SectionLabels, value: string) => void
}

const friendSocialIcons: { key: keyof NonNullable<Friend['socials']>; icon: any; label: string }[] = [
  { key: 'instagram', icon: InstagramLogo, label: 'Instagram' },
  { key: 'facebook', icon: FacebookLogo, label: 'Facebook' },
  { key: 'spotify', icon: SpotifyLogo, label: 'Spotify' },
  { key: 'soundcloud', icon: SoundcloudLogo, label: 'SoundCloud' },
  { key: 'youtube', icon: YoutubeLogo, label: 'YouTube' },
  { key: 'bandcamp', icon: MusicNote, label: 'Bandcamp' },
  { key: 'website', icon: Globe, label: 'Website' },
]

function FriendCard({ friend, editMode, onUpdate, onDelete, onSelect }: {
  friend: Friend
  editMode?: boolean
  onUpdate: (friend: Friend) => void
  onDelete: () => void
  onSelect: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(friend)
  const [hovered, setHovered] = useState(false)

  const handleSave = () => {
    // Convert Google Drive URLs to wsrv.nl URLs before saving
    const updatedData = {
      ...editData,
      photo: toDirectImageUrl(editData.photo),
      iconPhoto: editData.iconPhoto ? toDirectImageUrl(editData.iconPhoto) : undefined,
      profilePhoto: editData.profilePhoto ? toDirectImageUrl(editData.profilePhoto) : undefined,
    }
    onUpdate(updatedData)
    setIsEditing(false)
  }

  if (isEditing && editMode) {
    return (
      <Card className="bg-card border-primary/30 p-4 space-y-3">
        <div className="space-y-2">
          <div>
            <Label className="text-[10px]">Name</Label>
            <Input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="text-xs h-8" />
          </div>
          <div>
            <Label className="text-[10px]">Photo URL</Label>
            <Input value={editData.photo || ''} onChange={(e) => setEditData({ ...editData, photo: e.target.value })} className="text-xs h-8" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-[10px]">Icon Photo URL (card thumbnail, optional)</Label>
            <Input value={editData.iconPhoto || ''} onChange={(e) => setEditData({ ...editData, iconPhoto: e.target.value || undefined })} className="text-xs h-8" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-[10px]">Profile Photo URL (overlay photo, optional)</Label>
            <Input value={editData.profilePhoto || ''} onChange={(e) => setEditData({ ...editData, profilePhoto: e.target.value || undefined })} className="text-xs h-8" placeholder="https://..." />
          </div>
          <div>
            <Label className="text-[10px]">Description</Label>
            <textarea
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="flex w-full rounded-sm border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px] resize-y"
              rows={3}
              placeholder="Description with line breaks..."
            />
          </div>
          <div>
            <Label className="text-[10px]">Main URL</Label>
            <Input value={editData.url || ''} onChange={(e) => setEditData({ ...editData, url: e.target.value })} className="text-xs h-8" placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px]">Subject Label</Label>
              <Input value={editData.subjectLabel || ''} onChange={(e) => setEditData({ ...editData, subjectLabel: e.target.value })} className="text-xs h-8" placeholder="SUBJECT" />
            </div>
            <div>
              <Label className="text-[10px]">Status Label</Label>
              <Input value={editData.statusLabel || ''} onChange={(e) => setEditData({ ...editData, statusLabel: e.target.value })} className="text-xs h-8" placeholder="STATUS" />
            </div>
            <div className="col-span-2">
              <Label className="text-[10px]">Status Value</Label>
              <Input value={editData.statusValue || ''} onChange={(e) => setEditData({ ...editData, statusValue: e.target.value })} className="text-xs h-8" placeholder="ACTIVE" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {friendSocialIcons.map(({ key, label }) => (
              <div key={key}>
                <Label className="text-[10px]">{label}</Label>
                <Input
                  value={editData.socials?.[key] || ''}
                  onChange={(e) => setEditData({ ...editData, socials: { ...editData.socials, [key]: e.target.value } })}
                  className="text-xs h-8"
                  placeholder="https://..."
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} className="flex-1">Save</Button>
          <Button size="sm" variant="outline" onClick={() => { setEditData(friend); setIsEditing(false) }}>Cancel</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="bg-card/50 border-border hover:border-primary/50 transition-all duration-300 overflow-hidden group hud-element hud-corner cursor-pointer"
      onClick={() => !editMode && onSelect()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="corner-bl"></span>
      <span className="corner-br"></span>
      <div className="flex flex-col items-center gap-3 p-5">
        {(friend.iconPhoto || friend.photo) ? (
          <div className={`relative w-24 h-24 aspect-square flex-shrink-0 overflow-hidden border border-primary/30 shadow-[0_0_15px_oklch(0.50_0.22_25/0.3),0_0_30px_oklch(0.50_0.22_25/0.15)] bg-black ${hovered ? 'red-glitch-element' : ''}`}>
            <ProgressiveImage
              src={friend.iconPhoto || friend.photo || ''}
              alt={friend.name}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 hud-scanline pointer-events-none opacity-20" />
            <div className="dot-matrix-photo" />
          </div>
        ) : (
          <div className={`w-24 h-24 aspect-square flex-shrink-0 bg-secondary/30 border border-border flex items-center justify-center shadow-[0_0_15px_oklch(0.50_0.22_25/0.3),0_0_30px_oklch(0.50_0.22_25/0.15)] ${hovered ? 'red-glitch-element' : ''}`}>
            <User size={32} className="text-muted-foreground/40" />
          </div>
        )}
        <div className="text-center min-w-0 w-full">
          <div className="flex items-center justify-center gap-2">
            <p className="text-sm font-bold line-clamp-1">{friend.name}</p>
            {editMode && (
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setEditData(friend); setIsEditing(true) }} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                  <PencilSimple size={14} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash size={14} />
                </button>
              </div>
            )}
          </div>
          {friend.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5"><SafeText fontSize={11}>{friend.description}</SafeText></p>
          )}
          {friend.socials && (
            <div className="flex gap-1.5 mt-2 flex-wrap justify-center">
              {friendSocialIcons.map(({ key, icon: Icon, label }) => {
                const url = friend.socials?.[key]
                if (!url) return null
                return (
                  <span
                    key={key}
                    className="text-muted-foreground/60 hover:text-primary transition-colors"
                    title={label}
                  >
                    <Icon size={16} weight="fill" />
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function PartnersAndFriendsSection({ friends = [], editMode, onUpdate, sectionLabels, onLabelChange }: PartnersAndFriendsSectionProps) {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 })
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const { trigger: triggerTransition, element: transitionElement } = useOverlayTransition()
  const titleText = sectionLabels?.partnersAndFriends || 'PARTNERS & FRIENDS'
  const headingPrefix = sectionLabels?.headingPrefix ?? '>'
  const { displayedText: displayedTitle } = useTypingEffect(
    isInView ? titleText : '',
    TITLE_TYPING_SPEED_MS,
    TITLE_TYPING_START_DELAY_MS
  )

  // Stable identity key derived from friends list for memoization
  const friendsKey = friends.map(f => f.id).join(',')

  // Shuffle friends randomly on each page load to avoid favoritism appearance.
  // In edit mode, keep the original order so admins can manage them predictably.
  const displayFriends = useMemo(() => {
    if (editMode) return friends
    const shuffled = [...friends]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendsKey, editMode])

  if (!editMode && friends.length === 0) return null

  return (
    <section ref={sectionRef} className="py-20 px-4 relative" id="partners">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.7 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-mono scanline-text dot-matrix-text"
              style={{
                textShadow: '0 0 6px oklch(1 0 0 / 0.5), 0 0 12px oklch(0.50 0.22 25 / 0.3), 0 0 18px oklch(0.50 0.22 25 / 0.2)'
              }}
            >
              <ChromaticText intensity={1.5}>
                {headingPrefix} {displayedTitle}
              </ChromaticText>
              <span className="animate-pulse">_</span>
            </h2>
            <div className="flex gap-2 items-center">
              {editMode && onLabelChange && (
                <>
                  <input
                    type="text"
                    value={sectionLabels?.headingPrefix ?? '>'}
                    onChange={(e) => onLabelChange('headingPrefix', e.target.value)}
                    placeholder=">"
                    className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-12 focus:outline-none focus:border-primary"
                    title="Heading prefix"
                  />
                  <input
                    type="text"
                    value={sectionLabels?.partnersAndFriends || ''}
                    onChange={(e) => onLabelChange('partnersAndFriends', e.target.value)}
                    placeholder="PARTNERS & FRIENDS"
                    className="bg-transparent border border-primary/30 px-2 py-1 text-xs font-mono text-primary w-40 focus:outline-none focus:border-primary"
                  />
                </>
              )}
              {editMode && onUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/10 gap-1"
                  onClick={() => {
                    const newFriend: Friend = {
                      id: `friend-${Date.now()}`,
                      name: 'New Friend',
                    }
                    onUpdate([...friends, newFriend])
                  }}
                >
                  <Plus size={16} />
                  <span className="hidden md:inline">Add</span>
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayFriends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                editMode={editMode}
                onSelect={() => { triggerTransition(); setSelectedFriend(friend) }}
                onUpdate={(updated) => {
                  if (onUpdate) {
                    onUpdate(friends.map(f => f.id === updated.id ? updated : f))
                  }
                }}
                onDelete={() => {
                  if (onUpdate) {
                    onUpdate(friends.filter(f => f.id !== friend.id))
                  }
                }}
              />
            ))}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedFriend && (
          <ProfileOverlay
            name={selectedFriend.name}
            photoUrl={selectedFriend.profilePhoto || selectedFriend.photo}
            dataLines={buildFriendDataLines(selectedFriend, sectionLabels, friendSocialIcons)}
            onClose={() => { triggerTransition(); setSelectedFriend(null) }}
            sectionLabels={sectionLabels}
          >
            {/* Social link icons */}
            {friendSocialIcons.filter(({ key }) => selectedFriend.socials?.[key]).length > 0 && (
              <div className="flex gap-3 flex-wrap pt-2">
                {friendSocialIcons.filter(({ key }) => selectedFriend.socials?.[key]).map(({ key, icon: Icon, label }) => (
                  <a
                    key={key}
                    href={selectedFriend.socials![key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary/60 hover:text-primary transition-colors"
                    title={label}
                  >
                    <Icon size={22} weight="fill" />
                  </a>
                ))}
              </div>
            )}
          </ProfileOverlay>
        )}
      </AnimatePresence>
      {transitionElement}
    </section>
  )
}
