import { Pencil, X, GearSix } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, lazy, Suspense } from 'react'
import AdminLoginDialog from '@/components/AdminLoginDialog'
import type { AdminSettings } from '@/lib/types'
import type { SiteData } from '@/App'

const AdminPanel = lazy(() => import('@/components/AdminPanel'))

interface EditControlsProps {
  setAdminSettings?: (settings: AdminSettings) => void
  onImportData?: (data: SiteData) => void
  siteData?: SiteData
  editMode: boolean
  onToggleEdit: () => void
  hasPassword: boolean
  onChangePassword: (password: string) => Promise<void>
  onSetPassword: (password: string) => Promise<void>
  adminSettings?: AdminSettings | null
  onOpenConfigEditor?: () => void
  onOpenStats?: () => void
  onOpenSecurityIncidents?: () => void
  onOpenSecuritySettings?: () => void
  onOpenBlocklist?: () => void
  onOpenContactInbox?: () => void
  onOpenSubscriberList?: () => void
  onUpdateSiteData?: (updater: SiteData | ((current: SiteData) => SiteData)) => void
  onLogout?: () => Promise<void>
}

export default function EditControls({
  setAdminSettings,
  onImportData,
  siteData,
  editMode,
  onToggleEdit,
  hasPassword,
  onChangePassword,
  onSetPassword,
  adminSettings,
  onOpenConfigEditor,
  onOpenStats,
  onOpenSecurityIncidents,
  onOpenSecuritySettings,
  onOpenBlocklist,
  onOpenContactInbox,
  onOpenSubscriberList,
  onUpdateSiteData,
  onLogout,
}: EditControlsProps) {
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-[9990] flex items-center gap-2"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <AnimatePresence mode="wait">
          {editMode ? (
            <motion.div
              key="edit-mode-buttons"
              className="flex items-center gap-2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* ADMIN button — opens AdminPanel */}
              <Button
                onClick={() => setAdminPanelOpen(true)}
                className="bg-primary hover:bg-primary/90 active:scale-90 h-10 px-4 rounded-md shadow-lg transition-all touch-manipulation font-mono text-xs font-bold tracking-widest gap-2"
                aria-label="Open admin panel"
              >
                <GearSix size={16} weight="bold" />
                ADMIN
              </Button>

              {/* Close edit mode button */}
              <Button
                onClick={onToggleEdit}
                className="bg-destructive hover:bg-destructive/90 active:scale-90 w-10 h-10 rounded-full shadow-xl transition-all touch-manipulation"
                size="icon"
                aria-label="Exit edit mode"
              >
                <X size={20} weight="bold" />
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="view-mode-button"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* Enter edit mode button */}
              <Button
                onClick={onToggleEdit}
                className="bg-primary hover:bg-accent active:scale-90 w-14 h-14 md:w-16 md:h-16 rounded-full shadow-xl transition-all touch-manipulation"
                size="icon"
                aria-label="Enter edit mode"
              >
                <Pencil size={24} weight="bold" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Admin Panel — lazily loaded */}
      <Suspense fallback={null}>
        <AdminPanel
          open={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          siteData={siteData}
          adminSettings={adminSettings}
          setAdminSettings={setAdminSettings}
          onImportData={onImportData}
          onUpdateSiteData={onUpdateSiteData}
          onOpenConfigEditor={onOpenConfigEditor}
          onOpenStats={onOpenStats}
          onOpenSecurityIncidents={onOpenSecurityIncidents}
          onOpenSecuritySettings={onOpenSecuritySettings}
          onOpenBlocklist={onOpenBlocklist}
          onOpenContactInbox={onOpenContactInbox}
          onOpenSubscriberList={onOpenSubscriberList}
          editMode={editMode}
          onToggleEdit={onToggleEdit}
          hasPassword={hasPassword}
          onChangePassword={onChangePassword}
          onSetPassword={onSetPassword}
          onLogout={onLogout}
        />
      </Suspense>

      {showLoginDialog && (
        <AdminLoginDialog
          open={showLoginDialog}
          onOpenChange={setShowLoginDialog}
          mode="setup"
          onSetPassword={hasPassword ? onChangePassword : onSetPassword}
        />
      )}
    </>
  )
}
