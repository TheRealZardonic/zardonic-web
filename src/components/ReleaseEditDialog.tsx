import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { UploadSimple, Plus, X } from '@phosphor-icons/react'
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
    spotify: '',
    soundcloud: '',
    bandcamp: '',
    youtube: '',
    appleMusic: '',
    beatport: ''
  })
  const [tracks, setTracks] = useState<Array<{ title: string; duration?: string }>>([])
  const [newTrack, setNewTrack] = useState({ title: '', duration: '' })
  const [isSaving, setIsSaving] = useState(false)
  const artworkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (release) {
      const links = release.streamingLinks || {}
      setFormData({
        title: release.title,
        type: release.type || '',
        artwork: release.artwork || '',
        releaseDate: release.releaseDate || '',
        description: release.description || '',
        featured: release.featured || false,
        spotify: links.spotify || '',
        soundcloud: links.soundcloud || '',
        bandcamp: links.bandcamp || '',
        youtube: links.youtube || '',
        appleMusic: links.appleMusic || '',
        beatport: links.beatport || ''
      })
      setTracks(release.tracks || [])
    }
  }, [release])

  const addTrack = () => {
    if (newTrack.title.trim()) {
      setTracks([...tracks, { title: newTrack.title.trim(), duration: newTrack.duration || undefined }])
      setNewTrack({ title: '', duration: '' })
    }
  }

  const removeTrack = (index: number) => {
    setTracks(tracks.filter((_, i) => i !== index))
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
      let beatport = formData.beatport || undefined

      // Use the first available streaming link to look up the rest via Odesli
      const lookupUrl = formData.spotify || formData.appleMusic || formData.soundcloud || formData.youtube || formData.bandcamp
      if (lookupUrl) {
        try {
          const odesliResult = await fetchOdesliLinks(lookupUrl)
          if (odesliResult) {
            // Only fill in missing values — never overwrite user entries
            spotify = spotify || odesliResult.spotify
            appleMusic = appleMusic || odesliResult.appleMusic
            soundcloud = soundcloud || odesliResult.soundcloud
            youtube = youtube || odesliResult.youtube
            bandcamp = bandcamp || odesliResult.bandcamp
            artwork = artwork || odesliResult.artwork
            toast.success('Streaming links enriched via Odesli')
          }
        } catch (error) {
          // Odesli lookup failed — save with the data we have
          console.error('Odesli enrichment failed, saving without enrichment', error)
        }
      }

      onSave({
        id: release?.id || Date.now().toString(),
        title: formData.title,
        type: formData.type || undefined,
        artwork,
        releaseDate: formData.releaseDate || undefined,
        description: formData.description || undefined,
        featured: formData.featured || undefined,
        streamingLinks: { spotify, soundcloud, bandcamp, youtube, appleMusic, beatport },
        tracks: tracks.length > 0 ? tracks : undefined
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
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
              <option value="compilation">Compilation</option>
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
            <h4 className="font-semibold mb-3">Streaming Links (optional)</h4>
            
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
            <h4 className="font-semibold mb-3">Track List (optional)</h4>
            <div className="space-y-2">
              {tracks.map((track, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input value={track.title} disabled className="flex-1 bg-secondary border-input text-sm" />
                  <Input value={track.duration || '—'} disabled className="w-20 bg-secondary border-input text-sm text-center" />
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
