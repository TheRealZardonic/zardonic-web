import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Upload, CheckCircle, AlertTriangle } from 'lucide-react'
import { useState, useRef, useCallback } from 'react'

import type { AdminSettings, AnimationSettings, BackgroundType, HudTexts, LoadingScreenType, LoadingScreenMode } from '@/lib/types'
import { useVideoUpload } from '@/cms/hooks/useVideoUpload'
import { useMediaUpload } from '@/cms/hooks/useMediaUpload'
import { checkVideoScrollOptimization, type VideoOptimizationResult } from '@/lib/video-check'

interface BackgroundTabProps {
  adminSettings?: AdminSettings | null
  setAdminSettings?: (s: AdminSettings) => void
  anim: AnimationSettings
  updateAnimationNumber: (key: keyof AnimationSettings, value: number) => void
}

export default function BackgroundTab({
  adminSettings,
  setAdminSettings,
  anim,
  updateAnimationNumber,
}: BackgroundTabProps) {
  const currentBg = anim.backgroundType ?? 'circuit'

  const { upload: uploadVideo, progress: videoUploadProgress, isUploading: isUploadingVideo } = useVideoUpload()
  const { upload: uploadImage, progress: imageUploadProgress, isUploading: isUploadingImage } = useMediaUpload()

  const [videoCheckResult, setVideoCheckResult] = useState<VideoOptimizationResult | null>(null)
  const [isCheckingVideo, setIsCheckingVideo] = useState(false)
  const videoCheckRef = useRef<HTMLVideoElement | null>(null)

  const updateAnim = useCallback((patch: Partial<AnimationSettings>) => {
    setAdminSettings?.({
      ...(adminSettings ?? {}),
      background: { ...anim, ...patch },
    })
  }, [adminSettings, anim, setAdminSettings])

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadVideo(file)
    if (result) updateAnim({ backgroundVideoUrl: result.url })
    e.target.value = ''
  }, [uploadVideo, updateAnim])

  const handleFallbackImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const result = await uploadImage(file)
    if (result) updateAnim({ backgroundVideoFallbackImageUrl: result.url })
    e.target.value = ''
  }, [uploadImage, updateAnim])

  const handleCheckVideo = useCallback(async () => {
    const url = anim.backgroundVideoUrl
    if (!url) return
    setIsCheckingVideo(true)
    setVideoCheckResult(null)
    try {
      const video = document.createElement('video')
      video.preload = 'auto'
      video.muted = true
      video.src = url
      videoCheckRef.current = video
      const result = await checkVideoScrollOptimization(video)
      setVideoCheckResult(result)
    } catch {
      setVideoCheckResult({ isOptimized: false, warnings: ['Fehler beim Prüfen des Videos.'], recommendations: [] })
    } finally {
      setIsCheckingVideo(false)
    }
  }, [anim.backgroundVideoUrl])

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
      {/* Background type selector */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Background Style
        </h3>
        <div className="grid grid-cols-1 gap-1.5">
          {([
            { value: 'circuit', label: 'Circuit Board (Default)', desc: 'Animated red circuit traces' },
            { value: 'cyberpunk-hud', label: 'Cyberpunk HUD', desc: 'HUD overlay with corner brackets & scan beam' },
            { value: 'matrix', label: 'Matrix Rain', desc: 'Cascading Japanese characters' },
            { value: 'stars', label: 'Star Field', desc: 'Warp-speed star field' },
            { value: 'cloud-chamber', label: 'Cloud Chamber', desc: 'Radiation cloud chamber with noise, terminal glow & particles' },
            { value: 'glitch-grid', label: 'Glitch Grid', desc: 'Dark crosshatch grid with glitch artifacts & scan beam (DIGICIDE)' },
            { value: 'video', label: 'Video Loop', desc: 'Looping video file — falls back to a static image on low-end devices' },
            { value: 'minimal', label: 'Minimal', desc: 'No decorative background' },
          ] as { value: BackgroundType; label: string; desc: string }[]).map(opt => (
            <button
              key={opt.value}
              onClick={() => updateAnim({ backgroundType: opt.value })}
              className={`text-left px-3 py-2 border rounded font-mono text-xs transition-colors ${
                currentBg === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <div className="font-semibold">{opt.label}</div>
              <div className="text-muted-foreground/60 text-[10px]">{opt.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      {/* Per-background config */}

      {/* Circuit board options */}
      {currentBg === 'circuit' && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Circuit Board Options
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            The circuit board background uses the primary colour theme. Adjust CRT effects below.
          </p>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Noise layer</Label>
            <Switch
              checked={anim.noiseEnabled !== false}
              onCheckedChange={(v) => updateAnim({ noiseEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Scanlines</Label>
            <Switch
              checked={anim.scanlineEnabled !== false}
              onCheckedChange={(v) => updateAnim({ scanlineEnabled: v })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Speed</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.circuitSpeed ?? 1}x</span>
            </div>
            <Slider value={[(anim.circuitSpeed ?? 1) * 100]} min={50} max={300} step={10}
              onValueChange={([v]) => updateAnim({ circuitSpeed: v / 100 })} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Density</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.circuitDensity ?? 40}</span>
            </div>
            <Slider value={[anim.circuitDensity ?? 40]} min={10} max={100} step={5}
              onValueChange={([v]) => updateAnim({ circuitDensity: v })} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Glow</Label>
              <span className="font-mono text-xs text-muted-foreground">{Math.round((anim.circuitGlow ?? 0.8) * 100)}%</span>
            </div>
            <Slider value={[(anim.circuitGlow ?? 0.8) * 100]} min={0} max={100} step={5}
              onValueChange={([v]) => updateAnim({ circuitGlow: v / 100 })} />
          </div>
        </section>
      )}

      {/* Matrix options */}
      {currentBg === 'matrix' && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Matrix Rain Options
          </h3>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Noise layer</Label>
            <Switch
              checked={anim.noiseEnabled !== false}
              onCheckedChange={(v) => updateAnim({ noiseEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Scanlines</Label>
            <Switch
              checked={anim.scanlineEnabled !== false}
              onCheckedChange={(v) => updateAnim({ scanlineEnabled: v })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Speed</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.matrixSpeed ?? 1}x</span>
            </div>
            <Slider value={[(anim.matrixSpeed ?? 1) * 100]} min={50} max={300} step={10}
              onValueChange={([v]) => updateAnim({ matrixSpeed: v / 100 })} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Density</Label>
              <span className="font-mono text-xs text-muted-foreground">{Math.round((anim.matrixDensity ?? 0.7) * 100)}%</span>
            </div>
            <Slider value={[(anim.matrixDensity ?? 0.7) * 100]} min={30} max={100} step={5}
              onValueChange={([v]) => updateAnim({ matrixDensity: v / 100 })} />
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-xs text-muted-foreground">Rain Color (hex)</Label>
            <Input
              value={anim.matrixColor ?? ''}
              onChange={e => updateAnim({ matrixColor: e.target.value || undefined })}
              className="font-mono text-xs"
              placeholder="#00ff41"
            />
          </div>
        </section>
      )}

      {/* Stars options */}
      {currentBg === 'stars' && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Star Field Options
          </h3>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Noise layer</Label>
            <Switch
              checked={anim.noiseEnabled !== false}
              onCheckedChange={(v) => updateAnim({ noiseEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Scanlines</Label>
            <Switch
              checked={anim.scanlineEnabled !== false}
              onCheckedChange={(v) => updateAnim({ scanlineEnabled: v })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Star Count</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.starCount ?? 200}</span>
            </div>
            <Slider value={[anim.starCount ?? 200]} min={50} max={500} step={10}
              onValueChange={([v]) => updateAnim({ starCount: v })} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Speed</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.starSpeed ?? 1}x</span>
            </div>
            <Slider value={[(anim.starSpeed ?? 1) * 100]} min={50} max={300} step={10}
              onValueChange={([v]) => updateAnim({ starSpeed: v / 100 })} />
          </div>
        </section>
      )}

      {/* Cloud chamber options */}
      {currentBg === 'cloud-chamber' && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Cloud Chamber Options
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            Radiation cloud chamber with particle tracks, noise static, and terminal phosphor glow.
          </p>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Noise static</Label>
            <Switch
              checked={anim.noiseEnabled !== false}
              onCheckedChange={(v) => updateAnim({ noiseEnabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Scanlines</Label>
            <Switch
              checked={anim.scanlineEnabled !== false}
              onCheckedChange={(v) => updateAnim({ scanlineEnabled: v })}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Particle Count</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.cloudParticleCount ?? 80}</span>
            </div>
            <Slider value={[anim.cloudParticleCount ?? 80]} min={20} max={200} step={10}
              onValueChange={([v]) => updateAnim({ cloudParticleCount: v })} />
          </div>
          <div className="space-y-1">
            <Label className="font-mono text-xs text-muted-foreground">Glow Color (hex)</Label>
            <Input
              value={anim.cloudGlowColor ?? ''}
              onChange={e => updateAnim({ cloudGlowColor: e.target.value || undefined })}
              className="font-mono text-xs"
              placeholder="#00ffaa"
            />
          </div>
        </section>
      )}

      {/* Glitch grid options */}
      {currentBg === 'glitch-grid' && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">Glitch Grid Options</h3>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Noise layer</Label>
            <Switch checked={anim.noiseEnabled !== false} onCheckedChange={v => updateAnim({ noiseEnabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Scanlines</Label>
            <Switch checked={anim.scanlineEnabled !== false} onCheckedChange={v => updateAnim({ scanlineEnabled: v })} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Grid Cell Size</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.glitchGridSize ?? 28}px</span>
            </div>
            <Slider value={[anim.glitchGridSize ?? 28]} min={10} max={80} step={2}
              onValueChange={([v]) => updateAnim({ glitchGridSize: v })} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Scan Speed</Label>
              <span className="font-mono text-xs text-muted-foreground">{anim.glitchScanSpeed ?? 1}x</span>
            </div>
            <Slider value={[(anim.glitchScanSpeed ?? 1) * 100]} min={10} max={300} step={10}
              onValueChange={([v]) => updateAnim({ glitchScanSpeed: v / 100 })} />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Glitch Frequency</Label>
              <span className="font-mono text-xs text-muted-foreground">{Math.round((anim.glitchFrequency ?? 0.4) * 100)}%</span>
            </div>
            <Slider value={[(anim.glitchFrequency ?? 0.4) * 100]} min={0} max={100} step={5}
              onValueChange={([v]) => updateAnim({ glitchFrequency: v / 100 })} />
          </div>
        </section>
      )}

      {/* Video background options */}
      {currentBg === 'video' && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            Video Background Options
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            Upload or link a video file (MP4 recommended). On low-end devices or
            when the user prefers reduced motion, the fallback image is shown instead.
          </p>

          {/* Playback Mode selector */}
          <div className="space-y-1">
            <Label className="font-mono text-xs text-muted-foreground">Playback Mode</Label>
            <div className="grid grid-cols-2 gap-1">
              {([
                { value: 'loop', label: 'Loop', desc: 'Auto-playing looping video' },
                { value: 'scroll', label: 'Scroll', desc: 'Video progress follows page scroll' },
              ] as { value: 'loop' | 'scroll'; label: string; desc: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateAnim({ backgroundVideoMode: opt.value })}
                  className={`text-left px-2 py-2 border rounded font-mono text-xs transition-colors ${
                    (anim.backgroundVideoMode ?? 'loop') === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-muted-foreground/60">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Video Source */}
          <div className="space-y-2">
            <Label className="font-mono text-xs text-muted-foreground">Video Source</Label>
            <div className="flex gap-2">
              <Input
                value={anim.backgroundVideoUrl ?? ''}
                onChange={e => updateAnim({ backgroundVideoUrl: e.target.value || undefined })}
                className="font-mono text-xs flex-1"
                placeholder="https://... (Vercel Blob URL)"
              />
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={isUploadingVideo}>
                  <span className="font-mono text-xs">
                    {isUploadingVideo ? `${videoUploadProgress}%` : <Upload className="w-3 h-3" />}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  className="hidden"
                  onChange={handleVideoUpload}
                />
              </label>
            </div>
            {videoUploadProgress > 0 && videoUploadProgress < 100 && (
              <div className="w-full bg-border rounded-full h-1">
                <div className="bg-primary h-1 rounded-full transition-all" style={{ width: `${videoUploadProgress}%` }} />
              </div>
            )}
          </div>

          {/* Video optimization check (scroll mode only) */}
          {(anim.backgroundVideoMode ?? 'loop') === 'scroll' && anim.backgroundVideoUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckVideo}
                  disabled={isCheckingVideo}
                  className="font-mono text-xs"
                >
                  {isCheckingVideo ? 'Prüfe…' : 'Video prüfen'}
                </Button>
              </div>
              {videoCheckResult && (
                <div className={`rounded border p-2 space-y-1 font-mono text-[10px] ${videoCheckResult.isOptimized ? 'border-green-500/40 bg-green-500/5 text-green-400' : 'border-yellow-500/40 bg-yellow-500/5 text-yellow-400'}`}>
                  <div className="flex items-center gap-1">
                    {videoCheckResult.isOptimized
                      ? <CheckCircle className="w-3 h-3" />
                      : <AlertTriangle className="w-3 h-3" />}
                    <span className="font-semibold">
                      {videoCheckResult.isOptimized ? 'Video ist optimiert' : 'Optimierung empfohlen'}
                    </span>
                  </div>
                  {videoCheckResult.warnings.map((w, i) => (
                    <div key={i} className="text-yellow-300/80">{w}</div>
                  ))}
                  {videoCheckResult.recommendations.map((r, i) => (
                    <code key={i} className="block bg-black/30 rounded px-1 py-0.5 text-[9px] break-all">{r}</code>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label className="font-mono text-xs text-muted-foreground">Fallback Image URL</Label>
            <p className="font-mono text-[10px] text-muted-foreground/60">
              Falls leer: reguläres Hintergrundbild wird verwendet
            </p>
            <div className="flex gap-2">
              <Input
                value={anim.backgroundVideoFallbackImageUrl ?? ''}
                onChange={e => updateAnim({ backgroundVideoFallbackImageUrl: e.target.value || undefined })}
                className="font-mono text-xs flex-1"
                placeholder="https://example.com/poster.jpg"
              />
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild disabled={isUploadingImage}>
                  <span className="font-mono text-xs">
                    {isUploadingImage ? `${imageUploadProgress}%` : <Upload className="w-3 h-3" />}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFallbackImageUpload}
                />
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label className="font-mono text-xs">Opacity</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round((anim.backgroundVideoOpacity ?? 1) * 100)}%
              </span>
            </div>
            <Slider
              value={[(anim.backgroundVideoOpacity ?? 1) * 100]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => updateAnim({ backgroundVideoOpacity: v / 100 })}
            />
          </div>
        </section>
      )}

      {/* HUD texts - only shown when cyberpunk-hud is active */}
      {currentBg === 'cyberpunk-hud' && (
        <section className="space-y-3">
          <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
            HUD Texts
          </h3>
          <p className="font-mono text-xs text-muted-foreground">
            Customize the data readouts shown in the corners of the Cyberpunk HUD background.
          </p>
          {([
            { key: 'topLeft1', label: 'Top-left line 1', placeholder: 'SYSTEM: ONLINE' },
            { key: 'topLeft2', label: 'Top-left line 2 (blank = live clock)', placeholder: 'TIME: auto' },
            { key: 'topLeftStatus', label: 'Top-left status', placeholder: 'ACTIVE' },
            { key: 'topRight1', label: 'Top-right line 1', placeholder: 'NEUROKLAST v1.0' },
            { key: 'topRight2', label: 'Top-right line 2 (blank = auto ID)', placeholder: 'ID: auto' },
            { key: 'bottomLeft1', label: 'Bottom-left line 1', placeholder: 'PROTOCOL: TECHNO' },
            { key: 'bottomLeft2', label: 'Bottom-left line 2', placeholder: 'STATUS: TRANSMITTING' },
            { key: 'bottomRight1', label: 'Bottom-right line 1', placeholder: 'FREQ: 140-180 BPM' },
            { key: 'bottomRight2', label: 'Bottom-right line 2', placeholder: 'MODE: HARD' },
          ] as { key: keyof HudTexts; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1">
              <Label className="font-mono text-xs text-muted-foreground">{label}</Label>
              <Input
                value={adminSettings?.hud?.[key] ?? ''}
                onChange={e => setAdminSettings?.({ ...(adminSettings ?? {}), hud: { ...adminSettings?.hud, [key]: e.target.value || undefined } })}
                className="font-mono text-xs"
                placeholder={placeholder}
              />
            </div>
          ))}
        </section>
      )}

      <Separator />

      {/* CRT Effects */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          CRT Effects
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs">CRT Overlay Opacity</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(
                  (typeof anim.crtOverlayOpacity === 'number' ? anim.crtOverlayOpacity : 0.6) * 100,
                )}%
              </span>
            </div>
            <Slider
              value={[
                typeof anim.crtOverlayOpacity === 'number'
                  ? anim.crtOverlayOpacity * 100
                  : 60,
              ]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => updateAnimationNumber('crtOverlayOpacity', v / 100)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-mono text-xs">CRT Vignette Opacity</Label>
              <span className="font-mono text-xs text-muted-foreground">
                {Math.round(
                  (typeof anim.crtVignetteOpacity === 'number' ? anim.crtVignetteOpacity : 0.3) * 100,
                )}%
              </span>
            </div>
            <Slider
              value={[
                typeof anim.crtVignetteOpacity === 'number'
                  ? anim.crtVignetteOpacity * 100
                  : 30,
              ]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => updateAnimationNumber('crtVignetteOpacity', v / 100)}
            />
          </div>
        </div>
      </section>

      <Separator />

      {/* Background Image */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Background Image
        </h3>
        <p className="font-mono text-xs text-muted-foreground">
          Display a custom image behind the page. Optionally overlay the animated background effect on top.
        </p>
        <div className="space-y-1">
          <Label className="font-mono text-xs text-muted-foreground">Image URL</Label>
          <Input
            value={anim.backgroundImageUrl ?? ''}
            onChange={e => updateAnim({ backgroundImageUrl: e.target.value || undefined })}
            className="font-mono text-xs"
            placeholder="https://example.com/image.jpg"
          />
        </div>
        <div className="space-y-1">
          <Label className="font-mono text-xs text-muted-foreground">Object Fit</Label>
          <div className="grid grid-cols-2 gap-1">
            {(['cover', 'contain', 'fill', 'none'] as const).map(fit => (
              <button
                key={fit}
                onClick={() => updateAnim({ backgroundImageFit: fit })}
                aria-label={`Set image fit to ${fit}`}
                className={`text-left px-2 py-1.5 border rounded font-mono text-xs transition-colors ${
                  (anim.backgroundImageFit ?? 'cover') === fit
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40'
                }`}
              >
                {fit}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-mono text-xs">Image Opacity</Label>
            <span className="font-mono text-xs text-muted-foreground">
              {Math.round((typeof anim.backgroundImageOpacity === 'number' ? anim.backgroundImageOpacity : 1) * 100)}%
            </span>
          </div>
          <Slider
            value={[(typeof anim.backgroundImageOpacity === 'number' ? anim.backgroundImageOpacity : 1) * 100]}
            min={0}
            max={100}
            step={5}
            onValueChange={([v]) => updateAnim({ backgroundImageOpacity: v / 100 })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs">Overlay animated background effect</Label>
          <Switch
            checked={anim.backgroundImageOverlay === true}
            onCheckedChange={v => updateAnim({ backgroundImageOverlay: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label className="font-mono text-xs">Parallax scrolling</Label>
          <Switch
            checked={anim.backgroundImageParallax === true}
            onCheckedChange={v => updateAnim({ backgroundImageParallax: v })}
          />
        </div>
      </section>

      <Separator />

      {/* Loading Screen */}
      <section className="space-y-3">
        <h3 className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
          Loading Screen
        </h3>
        <div className="space-y-1">
          <Label className="font-mono text-xs text-muted-foreground">Type</Label>
          <div className="grid grid-cols-1 gap-1">
            {([
              { value: 'cyberpunk', label: 'Cyberpunk (Default)', desc: 'Multi-stage progress bar with scanning lines' },
              { value: 'minimal-bar', label: 'Minimal Bar', desc: 'Clean horizontal progress bar' },
              { value: 'glitch-decode', label: 'Glitch Decode', desc: 'Block-style bar with glitch text decoding' },
              { value: 'none', label: 'None', desc: 'No loading screen' },
            ] as { value: LoadingScreenType; label: string; desc: string }[]).map(opt => (
              <button
                key={opt.value}
                onClick={() => updateAnim({ loadingScreenType: opt.value })}
                aria-label={`Select ${opt.label} loading screen`}
                className={`text-left px-3 py-2 border rounded font-mono text-xs transition-colors ${
                  (anim.loadingScreenType ?? 'cyberpunk') === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <div className="font-semibold">{opt.label}</div>
                <div className="text-muted-foreground/60 text-[10px]">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {(anim.loadingScreenType ?? 'cyberpunk') !== 'none' && (
          <>
            <div className="space-y-1">
              <Label className="font-mono text-xs text-muted-foreground">Duration Mode</Label>
              <div className="grid grid-cols-2 gap-1">
                {([
                  { value: 'real', label: 'Real Load Time', desc: 'Waits for actual page data' },
                  { value: 'timed', label: 'Fixed Timer', desc: 'Always shows for set duration' },
                ] as { value: LoadingScreenMode; label: string; desc: string }[]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => updateAnim({ loadingScreenMode: opt.value })}
                    aria-label={`Set loading duration mode to ${opt.label}`}
                    className={`text-left px-2 py-2 border rounded font-mono text-xs transition-colors ${
                      (anim.loadingScreenMode ?? 'real') === opt.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <div className="font-semibold">{opt.label}</div>
                    <div className="text-[10px] text-muted-foreground/60">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {(anim.loadingScreenMode ?? 'real') === 'timed' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-mono text-xs">Duration (seconds)</Label>
                  <span className="font-mono text-xs text-muted-foreground">
                    {anim.loadingScreenDuration ?? 3}s
                  </span>
                </div>
                <Slider
                  value={[anim.loadingScreenDuration ?? 3]}
                  min={1}
                  max={15}
                  step={0.5}
                  onValueChange={([v]) => updateAnim({ loadingScreenDuration: v })}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}
