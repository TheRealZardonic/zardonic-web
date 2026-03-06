import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, X } from '@phosphor-icons/react'

interface BandInfoEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  genres: string[]
  label?: string
  logoUrl?: string
  titleImageUrl?: string
  onSave: (data: { name: string; genres: string[]; label?: string; logoUrl?: string; titleImageUrl?: string }) => void
}

export default function BandInfoEditDialog({ open, onOpenChange, name, genres, label, logoUrl, titleImageUrl, onSave }: BandInfoEditDialogProps) {
  const [bandName, setBandName] = useState(name)
  const [bandGenres, setBandGenres] = useState<string[]>(genres)
  const [bandLabel, setBandLabel] = useState(label || '')
  const [bandLogoUrl, setBandLogoUrl] = useState(logoUrl || '')
  const [bandTitleImageUrl, setBandTitleImageUrl] = useState(titleImageUrl || '')
  const [newGenre, setNewGenre] = useState('')

  useEffect(() => {
    setBandName(name)
    setBandGenres(genres)
    setBandLabel(label || '')
    setBandLogoUrl(logoUrl || '')
    setBandTitleImageUrl(titleImageUrl || '')
    setNewGenre('')
  }, [name, genres, label, logoUrl, titleImageUrl])

  const addGenre = () => {
    if (newGenre.trim()) {
      setBandGenres([...bandGenres, newGenre.trim().toUpperCase()])
      setNewGenre('')
    }
  }

  const removeGenre = (index: number) => {
    setBandGenres(bandGenres.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    onSave({
      name: bandName,
      genres: bandGenres,
      label: bandLabel || undefined,
      logoUrl: bandLogoUrl || undefined,
      titleImageUrl: bandTitleImageUrl || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Band Info</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="band-name">Band Name</Label>
            <Input
              id="band-name"
              value={bandName}
              onChange={(e) => setBandName(e.target.value)}
              placeholder="Band name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="band-label">Label</Label>
            <Input
              id="band-label"
              value={bandLabel}
              onChange={(e) => setBandLabel(e.target.value)}
              placeholder="e.g., Darktunes Music Group"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo URL (optional)</Label>
            <Input
              id="logo-url"
              value={bandLogoUrl}
              onChange={(e) => setBandLogoUrl(e.target.value)}
              placeholder="https://... or data:image/..."
            />
            {bandLogoUrl && (
              <div className="mt-2 flex justify-center">
                <img src={bandLogoUrl} alt="Logo Preview" className="max-w-[200px] max-h-[200px] object-contain border border-border rounded p-2" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Leave empty to use default logo</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title-image-url">Title Image URL (optional)</Label>
            <Input
              id="title-image-url"
              value={bandTitleImageUrl}
              onChange={(e) => setBandTitleImageUrl(e.target.value)}
              placeholder="https://... or data:image/..."
            />
            {bandTitleImageUrl && (
              <div className="mt-2 flex justify-center">
                <img src={bandTitleImageUrl} alt="Title Preview" className="max-w-full max-h-[100px] object-contain border border-border rounded p-2" />
              </div>
            )}
            <p className="text-xs text-muted-foreground">Leave empty to use default title image</p>
          </div>

          <div className="space-y-2">
            <Label>Genres</Label>
            <div className="space-y-2">
              {bandGenres.map((genre, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input value={genre} disabled className="flex-1" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGenre(index)}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  placeholder="Add genre"
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGenre() } }}
                />
                <Button type="button" onClick={addGenre} size="icon">
                  <Plus size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
