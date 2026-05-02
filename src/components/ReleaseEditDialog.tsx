import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UploadSimple, Plus, X, ArrowsClockwise, ArrowCounterClockwise } from '@phosphor-icons/react'
import type { Release } from '@/lib/types'
import { fetchOdesliLinks } from '@/lib/odesli'
import { toast } from 'sonner'
interface ReleaseEditDialogProps {
  release: Release | null
  onSave: (release: Release) => void
  onClose: () => void
}

export default function ReleaseEditDialog({ release, onSave, onClose }: ReleaseEditDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: '' as '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation',
    artwork: '',
    releaseDate: '',
    description: '',
    featured: false,
    artists: '',
    spotify: '',
    soundcloud: '',
    bandcamp: '',
    youtube: '',
    appleMusic: '',
    beatport: ''
  })
  const [tracks, setTracks] = useState<Array<{ title: string; duration?: string; artist?: string }>>([])
  const [tracksHistory, setTracksHistory] = useState<Array<Array<{ title: string; duration?: string; artist?: string }>>>([])
  const [newTrack, setNewTrack] = useState({ title: '', duration: '', artist: '' })
  const [customLinks, setCustomLinks] = useState<Array<{ label: string; url: string }>>([])
  const [newCustomLink, setNewCustomLink] = useState({ label: '', url: '' })
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingTracklist, setIsSyncingTracklist] = useState(false)
  const artworkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (release) {
      const links = release.streamingLinks ?? {}
      setFormData({
        title: release.title,
        type: release.type || '',
        artwork: release.artwork || '',
        releaseDate: release.releaseDate || '',
        description: release.description || '',
        featured: release.featured || false,
        artists: release.artists?.join(', ') || '',
        spotify: links.spotify || '',
        soundcloud: links.soundcloud || '',
        bandcamp: links.bandcamp || '',
        youtube: links.youtube || '',
        appleMusic: links.appleMusic || '',
        beatport: links.beatport || ''
      })
      setTracks((release.tracks || []).map(t => ({ title: t.title, duration: t.duration, artist: t.artist })))
      setTracksHistory([])
      setCustomLinks(release.customLinks || [])
    }
  }, [release])

  const addTrack = () => {
    if (newTrack.title.trim()) {
      setTracks([...tracks, { title: newTrack.title.trim(), duration: newTrack.duration || undefined, artist: newTrack.artist.trim() || undefined }])
      setNewTrack({ title: '', duration: '', artist: '' })
    }
  }

  const removeTrack = (index: number) => {
    setTracks(tracks.filter((_, i) => i !== index))
  }

  const addCustomLink = () => {
    if (newCustomLink.label.trim() && newCustomLink.url.trim()) {
      setCustomLinks([...customLinks, { label: newCustomLink.label.trim(), url: newCustomLink.url.trim() }])
      setNewCustomLink({ label: '', url: '' })
    }
  }

  const removeCustomLink = (index: number) => {
    setCustomLinks(customLinks.filter((_, i) => i !== index))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'artwork') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setFormData(prev => ({ ...prev, [field]: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleOdesliSync = async () => {
    if (!release?.id) return
    setIsSyncing(true)
    try {
      const resp = await fetch('/api/releases-enrich-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: release.id }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        toast.error(err.error ?? 'Odesli sync failed')
        return
      }
      
      const { release: enrichedRelease } = await resp.json() as { release: { streamingLinks?: Array<{ platform: string; url: string }> } }
      const getLink = (arr: Array<{ platform: string; url: string }> | undefined, plat: string) =>
        arr?.find(l => l.platform === plat)?.url || ''
      
      setFormData(prev => ({
        ...prev,
        spotify: getLink(enrichedRelease.streamingLinks, 'spotify') || prev.spotify,
        soundcloud: getLink(enrichedRelease.streamingLinks, 'soundcloud') || prev.soundcloud,
        youtube: getLink(enrichedRelease.streamingLinks, 'youtube') || prev.youtube,
        bandcamp: getLink(enrichedRelease.streamingLinks, 'bandcamp') || prev.bandcamp,
        appleMusic: getLink(enrichedRelease.streamingLinks, 'appleMusic') || prev.appleMusic,
        beatport: getLink(enrichedRelease.streamingLinks, 'beatport') || prev.beatport,
      }))
      toast.success('Odesli sync complete')
    } catch {
      toast.error('Odesli sync failed')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleTracklistSync = async () => {
    if (!release?.id) return
    setIsSyncingTracklist(true)
    try {
      const resp = await fetch('/api/releases-enrich-single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: release.id }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        toast.error((err as { error?: string }).error ?? 'Tracklist sync failed')
        return
      }
      type EnrichmentResponse = { release: { tracks?: Array<{ title: string; duration?: string; artist?: string }> } }
      const { release: enrichedRelease } = await resp.json() as EnrichmentResponse
      const newTracks = enrichedRelease.tracks
      if (!newTracks || newTracks.length === 0) {
        toast.info('No tracklist found for this release')
        return
      }
      setTracksHistory(prev => [...prev.slice(-49), tracks])
      setTracks(newTracks)
      toast.success(`Tracklist synced — ${newTracks.length} tracks`)
    } catch {
      toast.error('Tracklist sync failed')
    } finally {
      setIsSyncingTracklist(false)
    }
  }

  const handleUndoTracklist = () => {
    setTracksHistory(prev => {
      if (prev.length === 0) return prev
      const previous = prev[prev.length - 1]
      setTracks(previous)
      return prev.slice(0, -1)
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      let artwork = formData.artwork || undefined
      let spotify = formData.spotify || undefined
      let soundcloud = formData.soundcloud || undefined
      let bandcamp = formData.bandcamp || undefined
      let youtube = formData.youtube || undefined
      let appleMusic = formData.appleMusic || undefined
      const beatport = formData.beatport || undefined

      const lookupUrl = formData.spotify || formData.appleMusic || formData.soundcloud || formData.youtube || formData.bandcamp
      if (lookupUrl) {
        try {
          const odesliResult = await fetchOdesliLinks(lookupUrl)
          if (odesliResult) {
            spotify = spotify || odesliResult.spotify
            appleMusic = appleMusic || odesliResult.appleMusic
            soundcloud = soundcloud || odesliResult.soundcloud
            youtube = youtube || odesliResult.youtube
            bandcamp = bandcamp || odesliResult.bandcamp
            artwork = artwork || odesliResult.artwork
            toast.success('Streaming links enriched via Odesli')
          }
        } catch (error) {
          console.error('Odesli enrichment failed', error)
        }
      }

      const streamingLinks: Release['streamingLinks'] = {}
      if (spotify) streamingLinks.spotify = spotify
      if (soundcloud) streamingLinks.soundcloud = soundcloud
      if (bandcamp) streamingLinks.bandcamp = bandcamp
      if (youtube) streamingLinks.youtube = youtube
      if (appleMusic) streamingLinks.appleMusic = appleMusic
      if (beatport) streamingLinks.beatport = beatport

      onSave({
        id: release?.id || Date.now().toString(),
        title: formData.title,
        type: formData.type || undefined,
        artwork,
        releaseDate: formData.releaseDate || undefined,
        description: formData.description || undefined,
        featured: formData.featured || undefined,
        artists: formData.artists ? formData.artists.split(',').map(a => a.trim()).filter(Boolean) : undefined,
        streamingLinks: Object.keys(streamingLinks).length > 0 ? streamingLinks : undefined,
        tracks: tracks.length > 0 ? tracks : undefined,
        // Always pass the current customLinks array (even when empty) so that
        // mergeFullReleaseIntoStored can distinguish "user cleared all links"
        // (empty array) from "links field not touched" (undefined).
        customLinks,
        manuallyEdited: true,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent data-admin-ui="true" className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{release ? 'Edit Release' : 'Add New Release'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              className="bg-secondary border-input"
              placeholder="Track/Album Name"
            />
          </div>

          <div>
            <Label htmlFor="artists">Release Artists (comma separated)</Label>
            <Input
              id="artists"
              value={formData.artists}
              onChange={(e) => setFormData({ ...formData, artists: e.target.value })}
              className="bg-secondary border-input"
              placeholder="e.g. Zardonic, Freqax"
            />
          </div>

          <div>
            <Label htmlFor="type">Type (optional)</Label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as '' | 'album' | 'ep' | 'single' | 'remix' | 'compilation' })}
              className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— None —</option>
              <option value="album">Album</option>
              <option value="ep">EP</option>
              <option value="single">Single</option>
              <option value="remix">Remix</option>
              <option value="compilation">Appears On</option>
            </select>
          </div>

          <div>
            <Label htmlFor="releaseDate">Release Date (optional)</Label>
            <Input
              id="releaseDate"
              type="date"
              value={formData.releaseDate}
              onChange={(e) => setFormData({ ...formData, releaseDate: e.target.value })}
              className="bg-secondary border-input"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-secondary border-input"
              placeholder="Brief description of the release"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="featured"
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            <Label htmlFor="featured" className="cursor-pointer">Featured Release (shown prominently)</Label>
          </div>

          <div>
            <Label htmlFor="artwork">Artwork (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="artwork"
                type="url"
                value={formData.artwork.startsWith('data:') ? '' : formData.artwork}
                onChange={(e) => setFormData({ ...formData, artwork: e.target.value })}
                className="bg-secondary border-input flex-1"
                placeholder="https://..."
              />
              <input
                ref={artworkInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, 'artwork')}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => artworkInputRef.current?.click()}
                className="border-primary/30 hover:bg-primary/10 flex-shrink-0"
                title="Upload image"
              >
                <UploadSimple size={18} />
              </Button>
            </div>
            {formData.artwork && (
              <div className="mt-2 relative w-16 h-16 rounded overflow-hidden border border-border">
                <img src={formData.artwork} alt="Artwork preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Streaming Links (optional)</h4>
              {release?.id && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleOdesliSync}
                  disabled={isSyncing || isSaving}
                  className="border-primary/30 hover:bg-primary/10 text-xs gap-1.5"
                  title="Sync streaming links from Odesli"
                >
                  <ArrowsClockwise size={14} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Syncing…' : 'Sync Odesli'}
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="spotify">Spotify</Label>
                <Input
                  id="spotify"
                  type="url"
                  value={formData.spotify}
                  onChange={(e) => setFormData({ ...formData, spotify: e.target.value })}
                  className="bg-secondary border-input"
                  placeholder="https://open.spotify.com/..."
                />
              </div>

              <div>
                <Label htmlFor="soundcloud">SoundCloud</Label>
                <Input
                  id="soundcloud"
                  type="url"
                  value={formData.soundcloud}
                  onChange={(e) => setFormData({ ...formData, soundcloud: e.target.value })}
                  className="bg-secondary border-input"
                  placeholder="https://soundcloud.com/..."
                />
              </div>

              <div>
                <Label htmlFor="youtube">YouTube</Label>
                <Input
                  id="youtube"
                  type="url"
                  value={formData.youtube}
                  onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                  className="bg-secondary border-input"
                  placeholder="https://youtube.com/..."
                />
              </div>

              <div>
                <Label htmlFor="bandcamp">Bandcamp</Label>
                <Input
                  id="bandcamp"
                  type="url"
                  value={formData.bandcamp}
                  onChange={(e) => setFormData({ ...formData, bandcamp: e.target.value })}
                  className="bg-secondary border-input"
                  placeholder="https://bandcamp.com/..."
                />
              </div>

              <div>
                <Label htmlFor="appleMusic">Apple Music</Label>
                <Input
                  id="appleMusic"
                  type="url"
                  value={formData.appleMusic}
                  onChange={(e) => setFormData({ ...formData, appleMusic: e.target.value })}
                  className="bg-secondary border-input"
                  placeholder="https://music.apple.com/..."
                />
              </div>

              <div>
                <Label htmlFor="beatport">Beatport</Label>
                <Input
                  id="beatport"
                  type="url"
                  value={formData.beatport}
                  onChange={(e) => setFormData({ ...formData, beatport: e.target.value })}
                  className="bg-secondary border-input"
                  placeholder="https://beatport.com/..."
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">Track List (optional)</h4>
              {release?.id && (
                <div className="flex items-center gap-1.5">
                  {tracksHistory.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUndoTracklist}
                      disabled={isSyncingTracklist || isSaving}
                      className="border-primary/30 hover:bg-primary/10 text-xs gap-1.5"
                      title="Undo last tracklist sync"
                      aria-label="Undo tracklist sync"
                    >
                      <ArrowCounterClockwise size={14} />
                      Undo
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTracklistSync}
                    disabled={isSyncingTracklist || isSaving}
                    className="border-primary/30 hover:bg-primary/10 text-xs gap-1.5"
                    title="Sync tracklist from MusicBrainz"
                  >
                    <ArrowsClockwise size={14} className={isSyncingTracklist ? 'animate-spin' : ''} />
                    {isSyncingTracklist ? 'Syncing…' : 'Sync Tracklist'}
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={track.title}
                    onChange={(e) => setTracks(tracks.map((t, i) => i === index ? { ...t, title: e.target.value } : t))}
                    className="flex-1 bg-secondary border-input text-sm"
                    placeholder="Track title"
                  />
                  <Input
                    value={track.artist || ''}
                    onChange={(e) => setTracks(tracks.map((t, i) => i === index ? { ...t, artist: e.target.value || undefined } : t))}
                    className="w-28 bg-secondary border-input text-sm"
                    placeholder="Artist"
                    title="Artist name for this track (optional)"
                  />
                  <Input
                    value={track.duration || ''}
                    onChange={(e) => setTracks(tracks.map((t, i) => i === index ? { ...t, duration: e.target.value || undefined } : t))}
                    className="w-20 bg-secondary border-input text-sm text-center"
                    placeholder="4:23"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeTrack(index)}>
                    <X size={16} />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newTrack.title}
                  onChange={(e) => setNewTrack({ ...newTrack, title: e.target.value })}
                  placeholder="Track title"
                  className="flex-1 bg-secondary border-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrack() } }}
                />
                <Input
                  value={newTrack.artist}
                  onChange={(e) => setNewTrack({ ...newTrack, artist: e.target.value })}
                  placeholder="Artist"
                  className="w-28 bg-secondary border-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrack() } }}
                  title="Artist name for this track (optional)"
                />
                <Input
                  value={newTrack.duration}
                  onChange={(e) => setNewTrack({ ...newTrack, duration: e.target.value })}
                  placeholder="4:23"
                  className="w-20 bg-secondary border-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTrack() } }}
                />
                <Button type="button" onClick={addTrack} size="icon" className="flex-shrink-0">
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="font-semibold mb-3">Custom Links — CD / Vinyl / Merch (optional)</h4>
            <p className="text-xs text-muted-foreground mb-3 font-mono">
              Add links to physical releases, merch stores, or any other custom destination.
            </p>
            <div className="space-y-2">
              {customLinks.map((link, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input value={link.label} disabled className="w-32 bg-secondary border-input text-sm" />
                  <Input value={link.url} disabled className="flex-1 bg-secondary border-input text-sm truncate" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomLink(index)}>
                    <X size={16} />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newCustomLink.label}
                  onChange={(e) => setNewCustomLink({ ...newCustomLink, label: e.target.value })}
                  placeholder="CD / Vinyl / Merch..."
                  className="w-32 bg-secondary border-input"
                />
                <Input
                  value={newCustomLink.url}
                  onChange={(e) => setNewCustomLink({ ...newCustomLink, url: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 bg-secondary border-input"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomLink() } }}
                />
                <Button type="button" onClick={addCustomLink} size="icon" className="flex-shrink-0">
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSaving} className="flex-1 bg-primary hover:bg-accent">
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
