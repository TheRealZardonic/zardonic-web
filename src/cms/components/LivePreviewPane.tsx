/**
 * LivePreviewPane
 *
 * Displays a live preview of the site alongside the section editor.
 * The preview uses an iframe pointing to the running site so that the
 * actual frontend components are rendered.
 *
 * Features:
 *   - Device-size toggle: desktop / tablet / mobile viewport widths
 *   - Scrolls the iframe to the section being edited on mount / section change
 *   - "Preview not available" placeholder when `supportsPreview` is false
 *   - Refresh button to force an iframe reload after saving
 *   - Open-in-new-tab link for full-screen inspection
 *
 * Note: The iframe shows the **published** site content. Real-time preview of
 * unsaved draft data requires a preview-mode API route (out of scope for Phase 2).
 * The site receives a `cms-preview=1` query flag so it can opt-in to showing
 * draft data from the KV store if that API route is implemented in the future.
 */

import { useState, useRef, useEffect } from 'react'
import { Desktop, DeviceTablet, DeviceMobile, ArrowsClockwise, ArrowSquareOut, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'

// ─── Types ────────────────────────────────────────────────────────────────────

type DeviceSize = 'desktop' | 'tablet' | 'mobile'

interface DeviceOption {
  id: DeviceSize
  label: string
  icon: React.ReactNode
  width: string
  ariaLabel: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_OPTIONS: DeviceOption[] = [
  {
    id: 'desktop',
    label: 'Desktop',
    icon: <Desktop size={15} />,
    width: '100%',
    ariaLabel: 'Preview at desktop width',
  },
  {
    id: 'tablet',
    label: 'Tablet',
    icon: <DeviceTablet size={15} />,
    width: '768px',
    ariaLabel: 'Preview at tablet width (768px)',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    icon: <DeviceMobile size={15} />,
    width: '390px',
    ariaLabel: 'Preview at mobile width (390px)',
  },
]

const ZOOM_LEVELS = [50, 75, 100] as const
type ZoomLevel = (typeof ZOOM_LEVELS)[number]

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LivePreviewPaneProps {
  /** Section ID used to scroll the iframe to the right section on load. */
  sectionId: string
  /** Whether this section supports preview rendering. */
  supportsPreview: boolean
  /** Extra CSS class on the root container. */
  className?: string
}

// ─── LivePreviewPane ──────────────────────────────────────────────────────────

/**
 * Side-panel live preview of the site, scoped to the section being edited.
 * Rendered as a right-side panel inside `AdminShell`.
 */
export function LivePreviewPane({ sectionId, supportsPreview, className = '' }: LivePreviewPaneProps) {
  const [device, setDevice] = useState<DeviceSize>('desktop')
  const [refreshKey, setRefreshKey] = useState(0)
  const [zoom, setZoom] = useState<ZoomLevel>(100)
  // Track the key of the iframe that has finished loading
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const currentDevice = DEVICE_OPTIONS.find(d => d.id === device) ?? DEVICE_OPTIONS[0]

  const iframeKey = `${sectionId}:${refreshKey}`
  const isIframeLoading = loadedKey !== iframeKey

  // Scroll iframe to the section being edited whenever sectionId changes
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    function scrollToSection() {
      try {
        iframe?.contentWindow?.postMessage(
          { type: 'cms:scroll-to', section: sectionId },
          window.location.origin,
        )
      } catch (err) {
        // postMessage can throw SecurityError when the iframe has a cross-origin
        // URL (e.g. during redirects). This is expected and safe to ignore.
        if (!(err instanceof DOMException && err.name === 'SecurityError')) {
          // Unexpected error — log it so it's visible during development.
          console.warn('[LivePreviewPane] Unexpected postMessage error:', err)
        }
      }
    }

    // Try immediately, then again after a short delay to handle slow loads
    scrollToSection()
    const timer = setTimeout(scrollToSection, 800)
    return () => clearTimeout(timer)
  }, [sectionId, iframeKey])

  const handleRefresh = () => setRefreshKey(k => k + 1)

  const cycleZoomDown = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom)
    if (idx > 0) setZoom(ZOOM_LEVELS[idx - 1])
  }

  const cycleZoomUp = () => {
    const idx = ZOOM_LEVELS.indexOf(zoom)
    if (idx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[idx + 1])
  }

  const iframeSrc = `/?cms-preview=1#${sectionId}`

  if (!supportsPreview) {
    return (
      <aside
        className={`flex flex-col bg-[#0a0a0a] border-l border-zinc-800 h-full ${className}`}
        aria-label="Section preview"
      >
        <PreviewToolbar
          device={device}
          zoom={zoom}
          onDeviceChange={setDevice}
          onRefresh={handleRefresh}
          onZoomDown={cycleZoomDown}
          onZoomUp={cycleZoomUp}
          iframeSrc={iframeSrc}
        />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <Desktop size={40} className="text-zinc-700" />
          <div className="space-y-2 max-w-xs">
            <p className="text-zinc-400 font-mono text-sm">Preview not available</p>
            <p className="text-zinc-600 text-xs leading-relaxed">
              This section doesn&apos;t support live preview. Save your changes and visit the site to see them.
            </p>
          </div>
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <ArrowSquareOut size={13} />
            Open site in new tab
          </a>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={`flex flex-col bg-[#0a0a0a] border-l border-zinc-800 h-full ${className}`}
      aria-label="Section preview"
    >
      <PreviewToolbar
        device={device}
        zoom={zoom}
        onDeviceChange={setDevice}
        onRefresh={handleRefresh}
        onZoomDown={cycleZoomDown}
        onZoomUp={cycleZoomUp}
        iframeSrc={iframeSrc}
      />

      {/* Iframe container */}
      <div className="flex-1 overflow-auto flex justify-center items-start bg-zinc-900/50 p-3 relative">
        {/* Loading indicator overlay */}
        {isIframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 z-10 pointer-events-none">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono">
              <div className="w-3 h-3 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin" />
              Loading preview…
            </div>
          </div>
        )}

        <div
          className="h-full bg-white rounded shadow-2xl overflow-hidden transition-[width,transform] duration-300"
          style={{
            width: currentDevice.width,
            minWidth: device !== 'desktop' ? currentDevice.width : undefined,
            minHeight: '100%',
            transformOrigin: 'top center',
            transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
            willChange: 'width',
          }}
        >
          <iframe
            ref={iframeRef}
            key={iframeKey}
            src={iframeSrc}
            title={`Preview: ${sectionId}`}
            className="w-full border-0"
            style={{ minHeight: '600px', height: '100%' }}
            onLoad={() => setLoadedKey(iframeKey)}
          />
        </div>
      </div>
    </aside>
  )
}

// ─── PreviewToolbar ───────────────────────────────────────────────────────────

interface PreviewToolbarProps {
  device: DeviceSize
  zoom: ZoomLevel
  onDeviceChange: (d: DeviceSize) => void
  onRefresh: () => void
  onZoomDown: () => void
  onZoomUp: () => void
  iframeSrc: string
}

function PreviewToolbar({ device, zoom, onDeviceChange, onRefresh, onZoomDown, onZoomUp, iframeSrc }: PreviewToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-zinc-800 bg-[#111] flex-shrink-0">
      {/* Device toggles */}
      <div className="flex items-center gap-0.5 bg-[#1a1a1a] rounded p-0.5">
        {DEVICE_OPTIONS.map(opt => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onDeviceChange(opt.id)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              device === opt.id
                ? 'bg-red-600 text-white'
                : 'text-zinc-500 hover:text-zinc-200'
            }`}
            aria-label={opt.ariaLabel}
            aria-pressed={device === opt.id}
          >
            {opt.icon}
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 bg-[#1a1a1a] rounded p-0.5">
        <button
          type="button"
          onClick={onZoomDown}
          disabled={zoom === ZOOM_LEVELS[0]}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Zoom out"
          title="Zoom out"
        >
          <MagnifyingGlassMinus size={13} />
        </button>
        <span className="text-[10px] font-mono text-zinc-600 tabular-nums px-1 min-w-[2.5rem] text-center">
          {zoom}%
        </span>
        <button
          type="button"
          onClick={onZoomUp}
          disabled={zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Zoom in"
          title="Zoom in"
        >
          <MagnifyingGlassPlus size={13} />
        </button>
      </div>

      <div className="flex-1" />

      {/* Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        aria-label="Refresh preview"
      >
        <ArrowsClockwise size={14} />
      </button>

      {/* Open in new tab */}
      <a
        href={iframeSrc}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
        aria-label="Open site in new tab"
      >
        <ArrowSquareOut size={14} />
      </a>
    </div>
  )
}
