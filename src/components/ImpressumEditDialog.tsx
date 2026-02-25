import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Impressum } from '@/lib/types'

interface ImpressumEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  impressum?: Impressum
  onSave: (impressum: Impressum) => void
}

const emptyImpressum: Impressum = {
  name: '',
  careOf: '',
  street: '',
  zipCity: '',
  phone: '',
  email: '',
  responsibleName: '',
  responsibleAddress: '',
}

export default function ImpressumEditDialog({ open, onOpenChange, impressum, onSave }: ImpressumEditDialogProps) {
  const [form, setForm] = useState<Impressum>(impressum || emptyImpressum)

  useEffect(() => {
    setForm(impressum || emptyImpressum)
  }, [impressum])

  const update = (field: keyof Impressum, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    onSave({
      name: form.name,
      careOf: form.careOf || undefined,
      street: form.street || undefined,
      zipCity: form.zipCity || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      responsibleName: form.responsibleName || undefined,
      responsibleAddress: form.responsibleAddress || undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Impressum bearbeiten</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Angaben gemäß § 5 DDG
          </p>

          <div className="space-y-2">
            <Label htmlFor="imp-name">Name / Bandmitglieder</Label>
            <Input
              id="imp-name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Vorname Nachname oder Bandmitglieder"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imp-careof">c/o Impressum-Service</Label>
            <Input
              id="imp-careof"
              value={form.careOf || ''}
              onChange={(e) => update('careOf', e.target.value)}
              placeholder="Name des Impressum-Services"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imp-street">Straße und Hausnummer</Label>
            <Input
              id="imp-street"
              value={form.street || ''}
              onChange={(e) => update('street', e.target.value)}
              placeholder="Straße und Hausnummer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imp-zipcity">PLZ und Ort</Label>
            <Input
              id="imp-zipcity"
              value={form.zipCity || ''}
              onChange={(e) => update('zipCity', e.target.value)}
              placeholder="PLZ und Ort"
            />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">Kontakt</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imp-phone">Telefon</Label>
            <Input
              id="imp-phone"
              value={form.phone || ''}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+49 ..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imp-email">E-Mail</Label>
            <Input
              id="imp-email"
              value={form.email || ''}
              onChange={(e) => update('email', e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="imp-resp-name">Name</Label>
            <Input
              id="imp-resp-name"
              value={form.responsibleName || ''}
              onChange={(e) => update('responsibleName', e.target.value)}
              placeholder="Name der verantwortlichen Person"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="imp-resp-addr">Anschrift</Label>
            <Input
              id="imp-resp-addr"
              value={form.responsibleAddress || ''}
              onChange={(e) => update('responsibleAddress', e.target.value)}
              placeholder="Anschrift oder Service-Adresse"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={!form.name.trim()}>Speichern</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
