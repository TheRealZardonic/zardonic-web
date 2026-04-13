import { useState, useEffect, useRef } from 'react'
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from 'lucide-react'
import { PencilSimple } from '@phosphor-icons/react'
import { useCmsEdit } from '../CmsEditContext'

type Viewport = 'desktop' | 'tablet' | 'mobile'

const VIEWPORTS: { id: Viewport; label: string; icon: React.ReactNode; width: string }[] = [
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={16} />, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: <Tablet size={16} />, width: '768px' },
  { id: 'mobile', label: 'Mobile', icon: <Smartphone size={16} />, width: '390px' },
]

export default function PreviewFrame() {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [key, setKey] = useState(0)
  const [editOverlay, setEditOverlay] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const { navigateToField, selectedPath } = useCmsEdit()

  const refresh = () => setKey(k => k + 1)

  const currentViewport = VIEWPORTS.find(v => v.id === viewport) ?? VIEWPORTS[0]

  // Listen for postMessages from the iframe when a user clicks an element
  // that has a data-cms-path attribute (emitted by the live site in CMS mode).
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'cms:select-field' && event.data.path) {
        navigateToField(event.data.path as string)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [navigateToField])

  // When a field is selected via sidebar/search, scroll the iframe to the matching section
  useEffect(() => {
    if (!selectedPath || !iframeRef.current) return
    const section = selectedPath.split('.')[0]
    try {
      iframeRef.current.contentWindow?.postMessage({ type: 'cms:scroll-to', section }, window.location.origin)
    } catch { /* cross-origin fallback – ignore */ }
  }, [selectedPath])

  const iframeSrc = editOverlay ? `/?cms-preview=1` : '/'

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a]">
      <div className="flex items-center gap-3 p-3 border-b border-zinc-800 bg-[#111] flex-shrink-0">
        <div className="flex items-center gap-1 bg-[#1a1a1a] rounded p-1">
          {VIEWPORTS.map(v => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewport(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-colors ${viewport === v.id ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              aria-label={v.label}
            >
              {v.icon}
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 px-3 py-1.5 bg-[#1a1a1a] rounded border border-zinc-700 text-zinc-400 text-xs font-mono truncate">
          {window.location.origin}/
        </div>

        {/* Toggle inline edit overlay mode */}
        <button
          type="button"
          onClick={() => setEditOverlay(v => !v)}
          className={`p-2 rounded transition-colors text-xs flex items-center gap-1 ${editOverlay ? 'bg-red-600/20 text-red-400 border border-red-500/30' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
          title={editOverlay ? 'Disable inline editing' : 'Enable inline editing'}
          aria-pressed={editOverlay}
        >
          <PencilSimple size={15} />
          <span className="hidden sm:inline text-xs">Edit</span>
        </button>

        <button
          type="button"
          onClick={refresh}
          className="text-zinc-400 hover:text-zinc-100 p-2 rounded hover:bg-zinc-800 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw size={15} />
        </button>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-400 hover:text-zinc-100 p-2 rounded hover:bg-zinc-800 transition-colors"
          aria-label="Open in new tab"
        >
          <ExternalLink size={15} />
        </a>
      </div>

      {selectedPath && (
        <div className="px-3 py-2 bg-red-900/10 border-b border-red-500/20 text-xs font-mono text-red-400 flex items-center gap-2">
          <PencilSimple size={12} />
          <span>Editing: <strong>{selectedPath}</strong></span>
        </div>
      )}

      <div className="flex-1 overflow-auto flex justify-center bg-zinc-900 p-4">
        <div
          className="h-full transition-[width] duration-300 bg-white rounded shadow-2xl overflow-hidden"
          style={{ width: currentViewport.width, minHeight: '100%', willChange: 'width' }}
        >
          <iframe
            ref={iframeRef}
            key={key}
            src={iframeSrc}
            title="Site Preview"
            className="w-full h-full border-0"
            style={{ minHeight: '600px' }}
          />
        </div>
      </div>
    </div>
  )
}
