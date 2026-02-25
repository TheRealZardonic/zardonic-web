import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { SocialLinks } from '@/lib/types'

interface SocialEditDialogProps {
  socialLinks: SocialLinks
  onSave: (socialLinks: SocialLinks) => void
  onClose: () => void
}

export default function SocialEditDialog({ socialLinks, onSave, onClose }: SocialEditDialogProps) {
  const [formData, setFormData] = useState<SocialLinks>({})

  useEffect(() => {
    setFormData(socialLinks)
  }, [socialLinks])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  const updateField = (key: keyof SocialLinks, value: string) => {
    setFormData({ ...formData, [key]: value || undefined })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Social Links</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="instagram">Instagram</Label>
            <Input
              id="instagram"
              type="url"
              value={formData.instagram || ''}
              onChange={(e) => updateField('instagram', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://instagram.com/..."
            />
          </div>

          <div>
            <Label htmlFor="facebook">Facebook</Label>
            <Input
              id="facebook"
              type="url"
              value={formData.facebook || ''}
              onChange={(e) => updateField('facebook', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://facebook.com/..."
            />
          </div>

          <div>
            <Label htmlFor="spotify">Spotify</Label>
            <Input
              id="spotify"
              type="url"
              value={formData.spotify || ''}
              onChange={(e) => updateField('spotify', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://open.spotify.com/artist/..."
            />
          </div>

          <div>
            <Label htmlFor="soundcloud">SoundCloud</Label>
            <Input
              id="soundcloud"
              type="url"
              value={formData.soundcloud || ''}
              onChange={(e) => updateField('soundcloud', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://soundcloud.com/..."
            />
          </div>

          <div>
            <Label htmlFor="youtube">YouTube</Label>
            <Input
              id="youtube"
              type="url"
              value={formData.youtube || ''}
              onChange={(e) => updateField('youtube', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://youtube.com/@..."
            />
          </div>

          <div>
            <Label htmlFor="bandcamp">Bandcamp</Label>
            <Input
              id="bandcamp"
              type="url"
              value={formData.bandcamp || ''}
              onChange={(e) => updateField('bandcamp', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://bandcamp.com/..."
            />
          </div>

          <div>
            <Label htmlFor="tiktok">TikTok</Label>
            <Input
              id="tiktok"
              type="url"
              value={formData.tiktok || ''}
              onChange={(e) => updateField('tiktok', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://tiktok.com/@..."
            />
          </div>

          <div>
            <Label htmlFor="twitter">Twitter/X</Label>
            <Input
              id="twitter"
              type="url"
              value={formData.twitter || ''}
              onChange={(e) => updateField('twitter', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://twitter.com/..."
            />
          </div>

          <div>
            <Label htmlFor="linktr">Linktree</Label>
            <Input
              id="linktr"
              type="url"
              value={formData.linktr || ''}
              onChange={(e) => updateField('linktr', e.target.value)}
              className="bg-secondary border-input"
              placeholder="https://linktr.ee/..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-primary hover:bg-accent">
              Save
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
