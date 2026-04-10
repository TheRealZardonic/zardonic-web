/**
 * CmsEditContext — global state that connects PreviewFrame and CmsSidebar
 * for split-screen inline editing.
 *
 * When the user clicks an editable element in the preview (via postMessage)
 * or navigates to a field via AdminSearch, this context updates so the
 * sidebar automatically opens the matching configuration node.
 */
import { createContext, useContext, useState, useCallback } from 'react'

export interface CmsEditContextType {
  /** The currently focused schema path, e.g. "hero.headline" or "releases" */
  selectedPath: string | null
  /** The top-level section derived from selectedPath, e.g. "hero" */
  selectedSection: string | null
  /** Whether the inline editor panel is expanded in the sidebar */
  editorOpen: boolean
  /** Navigate to a schema path and open the inline editor */
  navigateToField: (path: string) => void
  /** Close the inline editor */
  closeEditor: () => void
}

const defaultEditContext: CmsEditContextType = {
  selectedPath: null,
  selectedSection: null,
  editorOpen: false,
  navigateToField: () => {},
  closeEditor: () => {},
}

const CmsEditContext = createContext<CmsEditContextType>(defaultEditContext)

export function CmsEditProvider({ children }: { children: React.ReactNode }) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const selectedSection = selectedPath ? selectedPath.split('.')[0] : null

  const navigateToField = useCallback((path: string) => {
    setSelectedPath(path)
    setEditorOpen(true)
  }, [])

  const closeEditor = useCallback(() => {
    setEditorOpen(false)
    setSelectedPath(null)
  }, [])

  return (
    <CmsEditContext.Provider value={{ selectedPath, selectedSection, editorOpen, navigateToField, closeEditor }}>
      {children}
    </CmsEditContext.Provider>
  )
}

export function useCmsEdit(): CmsEditContextType {
  return useContext(CmsEditContext)
}
