import { useState } from 'react'
import { Monitor, Tablet, Smartphone, RefreshCw, ExternalLink } from 'lucide-react'

type Viewport = 'desktop' | 'tablet' | 'mobile'

const VIEWPORTS: { id: Viewport; label: string; icon: React.ReactNode; width: string }[] = [
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={16} />, width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: <Tablet size={16} />, width: '768px' },
  { id: 'mobile', label: 'Mobile', icon: <Smartphone size={16} />, width: '390px' },
]

export default function PreviewFrame() {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [key, setKey] = useState(0)

  const refresh = () => setKey(k => k + 1)

  const currentViewport = VIEWPORTS.find(v => v.id === viewport)!

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

      <div className="flex-1 overflow-auto flex justify-center bg-zinc-900 p-4">
        <div
          className="h-full transition-all duration-300 bg-white rounded shadow-2xl overflow-hidden"
          style={{ width: currentViewport.width, minHeight: '100%' }}
        >
          <iframe
            key={key}
            src="/"
            title="Site Preview"
            className="w-full h-full border-0"
            style={{ minHeight: '600px' }}
          />
        </div>
      </div>
    </div>
  )
}
