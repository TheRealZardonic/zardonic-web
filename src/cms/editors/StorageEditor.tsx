import { useState } from 'react'
import { HardDrive, ExternalLink, FolderOpen } from 'lucide-react'

const inputClass = 'bg-[#1a1a1a] border border-zinc-700 text-zinc-100 rounded px-3 py-2 w-full focus:outline-none focus:border-red-500 text-sm font-mono'

export default function StorageEditor() {
  const [folderId, setFolderId] = useState('')

  const driveUrl = folderId
    ? `https://drive.google.com/drive/folders/${folderId}`
    : null

  const previewUrl = folderId
    ? `/api/drive-folder?folderId=${encodeURIComponent(folderId)}`
    : null

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-zinc-100 text-xl font-semibold flex items-center gap-2">
          <HardDrive size={20} className="text-red-500" />
          Cloud Storage
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Connect a public Google Drive folder as a media source.
        </p>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-5 space-y-4">
        <div>
          <label htmlFor="folder-id" className="text-zinc-400 text-sm block mb-1">
            Google Drive Folder ID
          </label>
          <input
            id="folder-id"
            type="text"
            value={folderId}
            onChange={e => setFolderId(e.target.value.trim())}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            className={inputClass}
          />
          <p className="text-zinc-600 text-xs mt-1">
            Find the folder ID in the URL: drive.google.com/drive/folders/<strong>ID</strong>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {driveUrl && (
            <a
              href={driveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded transition-colors"
            >
              <ExternalLink size={12} />
              Open in Google Drive
            </a>
          )}
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded transition-colors"
            >
              <FolderOpen size={12} />
              API Preview
            </a>
          )}
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded p-4">
        <p className="text-zinc-500 text-xs font-medium mb-2">Note</p>
        <ul className="text-zinc-600 text-xs space-y-1 list-disc list-inside">
          <li>The folder must be publicly accessible (sharing: &quot;Anyone with the link&quot;).</li>
          <li>The API requires a <code className="font-mono">GOOGLE_DRIVE_API_KEY</code> environment variable.</li>
          <li>Images are served via <code className="font-mono">/api/image-proxy</code> to avoid CORS issues.</li>
        </ul>
      </div>
    </div>
  )
}
