import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { motion } from 'framer-motion'
import CyberCloseButton from '@/components/CyberCloseButton'
import type { SoundSettings } from '@/lib/types'

interface SoundSettingsDialogProps {
  settings?: SoundSettings
  onSave: (settings: SoundSettings) => void
  onClose: () => void
}

export default function SoundSettingsDialog({ settings, onSave, onClose }: SoundSettingsDialogProps) {
  const [data, setData] = useState<SoundSettings>(settings || {})

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-card border border-border rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4 relative"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <CyberCloseButton onClick={onClose} label="CLOSE" className="absolute top-3 right-3" />
        <h3 className="text-lg font-bold font-mono">Sound Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure sound effects and background music. Local sounds are used by default.
          Add URLs to override with custom audio files (MP3, WAV, OGG). Google Drive share links are supported.
        </p>

        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between space-x-2">
            <div className="flex-1">
              <Label className="text-xs font-bold">Default Muted</Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sounds muted by default on page load</p>
            </div>
            <Switch
              checked={data.defaultMuted ?? true}
              onCheckedChange={(checked) => setData({ ...data, defaultMuted: checked })}
            />
          </div>

          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-bold font-mono mb-3">Sound Effects</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Terminal Sound</Label>
                <Input
                  value={data.terminalSound || ''}
                  onChange={(e) => setData({ ...data, terminalSound: e.target.value })}
                  placeholder="Default: none"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Plays on terminal keystrokes</p>
              </div>
              <div>
                <Label className="text-xs">Typing Sound</Label>
                <Input
                  value={data.typingSound || ''}
                  onChange={(e) => setData({ ...data, typingSound: e.target.value })}
                  placeholder="Default: texttyping.wav"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Plays during typing animations</p>
              </div>
              <div>
                <Label className="text-xs">Button Sound</Label>
                <Input
                  value={data.buttonSound || ''}
                  onChange={(e) => setData({ ...data, buttonSound: e.target.value })}
                  placeholder="Default: click.wav"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Plays on button clicks</p>
              </div>
              <div>
                <Label className="text-xs">Loading Finished Sound</Label>
                <Input
                  value={data.loadingFinishedSound || ''}
                  onChange={(e) => setData({ ...data, loadingFinishedSound: e.target.value })}
                  placeholder="Default: laodingfinished.mp3"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Plays when page finishes loading</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <h4 className="text-sm font-bold font-mono mb-3">Background Music</h4>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Background Music URL</Label>
                <Input
                  value={data.backgroundMusic || ''}
                  onChange={(e) => setData({ ...data, backgroundMusic: e.target.value })}
                  placeholder="Default: NK - THRESHOLD.mp3"
                  className="text-sm"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">Background music that loops continuously</p>
              </div>
              <div>
                <Label className="text-xs">Background Music Volume</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[data.backgroundMusicVolume ?? 0.3]}
                    onValueChange={([value]) => setData({ ...data, backgroundMusicVolume: value })}
                    max={1}
                    step={0.01}
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {Math.round((data.backgroundMusicVolume ?? 0.3) * 100)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Volume level for background music (0-100%)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => { onSave(data); onClose() }} className="flex-1">Save</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </motion.div>
  )
}
