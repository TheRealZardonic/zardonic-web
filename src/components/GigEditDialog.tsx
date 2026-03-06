import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Plus, X, UploadSimple } from '@phosphor-icons/react'
import type { Gig } from '@/lib/types'
import { toast } from 'sonner'
import { toDirectImageUrl } from '@/lib/image-cache'

interface GigEditDialogProps {
  gig: Gig | null
  onSave: (gig: Gig) => void
  onClose: () => void
}

export default function GigEditDialog({ gig, onSave, onClose }: GigEditDialogProps) {
  const [formData, setFormData] = useState({
    date: '',
    venue: '',
    location: '',
    ticketUrl: '',
    gigType: '' as '' | 'concert' | 'dj',
    allDay: false,
    status: '' as '' | 'confirmed' | 'cancelled' | 'soldout' | 'announced',
    eventLinks: {
      facebook: '',
      instagram: '',
      residentAdvisor: '',
      other: ''
    },
    photo: ''
  })
  const [supportingArtists, setSupportingArtists] = useState<string[]>([])
  const [newArtist, setNewArtist] = useState('')
  const photoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (gig) {
      setFormData({
        date: gig.date,
        venue: gig.venue,
        location: gig.location,
        ticketUrl: gig.ticketUrl || '',
        gigType: gig.gigType || '',
        allDay: gig.allDay || false,
        status: gig.status || '',
        eventLinks: {
          facebook: gig.eventLinks?.facebook || '',
          instagram: gig.eventLinks?.instagram || '',
          residentAdvisor: gig.eventLinks?.residentAdvisor || '',
          other: gig.eventLinks?.other || ''
        },
        photo: gig.photo || ''
      })
      setSupportingArtists(gig.supportingArtists || [])
    }
  }, [gig])

  const addArtist = () => {
    const trimmed = newArtist.trim()
    if (trimmed) {
      setSupportingArtists([...supportingArtists, trimmed])
      setNewArtist('')
    }
  }

  const removeArtist = (index: number) => {
    setSupportingArtists(supportingArtists.filter((_, i) => i !== index))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setFormData(prev => ({ ...prev, photo: dataUrl }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const eventLinks = Object.fromEntries(
      Object.entries(formData.eventLinks).filter(([, v]) => v)
    )
    onSave({
      id: gig?.id || Date.now().toString(),
      date: formData.date,
      venue: formData.venue,
      location: formData.location,
      ...(formData.ticketUrl && { ticketUrl: formData.ticketUrl }),
      ...(formData.gigType && { gigType: formData.gigType }),
      ...(formData.allDay && { allDay: true }),
      ...(formData.status && { status: formData.status }),
      ...(Object.keys(eventLinks).length > 0 && { eventLinks }),
      ...(supportingArtists.length > 0 && { supportingArtists }),
      ...(formData.photo && { photo: toDirectImageUrl(formData.photo) })
    })
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{gig ? 'Edit Gig' : 'Add New Gig'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="date">{formData.allDay ? 'Date' : 'Date & Time'}</Label>
              <Input
                id="date"
                type={formData.allDay ? 'date' : 'datetime-local'}
                value={formData.allDay ? formData.date.split('T')[0] : formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                className="bg-secondary border-input"
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="allDay"
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => {
                  const checked = e.target.checked
                  const date = checked
                    ? formData.date.split('T')[0]
                    : formData.date.includes('T') ? formData.date : `${formData.date}T00:00`
                  setFormData({ ...formData, allDay: checked, date })
                }}
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="allDay" className="text-sm whitespace-nowrap cursor-pointer">All Day</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="gigType">Gig Type (optional)</Label>
            <select
              id="gigType"
              value={formData.gigType}
              onChange={(e) => setFormData({ ...formData, gigType: e.target.value as '' | 'concert' | 'dj' })}
              className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— None —</option>
              <option value="concert">Concert</option>
              <option value="dj">DJ Set</option>
            </select>
          </div>

          <div>
            <Label htmlFor="status">Status (optional)</Label>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as '' | 'confirmed' | 'cancelled' | 'soldout' | 'announced' })}
              className="flex h-10 w-full rounded-md border border-input bg-secondary px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— None —</option>
              <option value="confirmed">Confirmed</option>
              <option value="announced">Announced</option>
              <option value="soldout">Sold Out</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <Label htmlFor="venue">Venue</Label>
            <Input
              id="venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              required
              className="bg-secondary border-input"
              placeholder="Club Name"
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
              className="bg-secondary border-input"
              placeholder="City, Country"
            />
          </div>

          <div>
            <Label htmlFor="ticketUrl">Ticket URL (optional)</Label>
            <Input
              id="ticketUrl"
              type="url"
              value={formData.ticketUrl}
              onChange={(e) => setFormData({ ...formData, ticketUrl: e.target.value })}
              className="bg-secondary border-input"
              placeholder="https://..."
            />
          </div>

          <div>
            <Label htmlFor="photo">Photo (optional)</Label>
            <div className="flex gap-2">
              <Input
                id="photo"
                type="url"
                value={formData.photo.startsWith('data:') ? '' : formData.photo}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                className="bg-secondary border-input flex-1"
                placeholder="https://..."
              />
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => photoInputRef.current?.click()}
                className="border-primary/30 hover:bg-primary/10 flex-shrink-0"
                title="Upload image"
              >
                <UploadSimple size={18} />
              </Button>
            </div>
            {formData.photo && (
              <div className="mt-2 relative w-16 h-16 rounded overflow-hidden border border-border">
                <img src={formData.photo} alt="Photo preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div>
            <Label>Supporting Artists</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newArtist}
                onChange={(e) => setNewArtist(e.target.value)}
                placeholder="Add artist name"
                className="bg-secondary border-input"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addArtist() } }}
              />
              <Button type="button" onClick={addArtist} size="icon" className="flex-shrink-0">
                <Plus size={16} />
              </Button>
            </div>
            {supportingArtists.map((artist, index) => (
              <div key={index} className="flex gap-2 items-center mt-2">
                <Input value={artist} disabled className="flex-1 bg-secondary border-input" />
                <Button type="button" variant="ghost" size="icon" onClick={() => removeArtist(index)}>
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label className="mb-2 block">Event Links (optional)</Label>
            <div className="space-y-2">
              <Input
                type="url"
                value={formData.eventLinks.facebook}
                onChange={(e) => setFormData({ ...formData, eventLinks: { ...formData.eventLinks, facebook: e.target.value } })}
                className="bg-secondary border-input"
                placeholder="Facebook Event URL"
              />
              <Input
                type="url"
                value={formData.eventLinks.instagram}
                onChange={(e) => setFormData({ ...formData, eventLinks: { ...formData.eventLinks, instagram: e.target.value } })}
                className="bg-secondary border-input"
                placeholder="Instagram Post URL"
              />
              <Input
                type="url"
                value={formData.eventLinks.residentAdvisor}
                onChange={(e) => setFormData({ ...formData, eventLinks: { ...formData.eventLinks, residentAdvisor: e.target.value } })}
                className="bg-secondary border-input"
                placeholder="Resident Advisor URL"
              />
              <Input
                type="url"
                value={formData.eventLinks.other}
                onChange={(e) => setFormData({ ...formData, eventLinks: { ...formData.eventLinks, other: e.target.value } })}
                className="bg-secondary border-input"
                placeholder="Other Event URL"
              />
            </div>
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
