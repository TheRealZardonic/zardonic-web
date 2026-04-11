/**
 * AdminDialogManager — renders all admin-only overlays and dialogs.
 *
 * Extracted from App.tsx to satisfy the Single Responsibility Principle.
 * All dialog visibility state is managed here so App.tsx is free from
 * the cognitive load of 8+ boolean flags and their handlers.
 */

import React, { Suspense, useState } from 'react'
import EditControls from '@/components/EditControls'
import AdminLoginDialog from '@/components/AdminLoginDialog'
import type { AdminSettings, TerminalCommand } from '@/lib/types'
import type { SiteData } from '@/lib/app-types'

const ConfigEditorDialog = React.lazy(() => import('@/components/ConfigEditorDialog'))
const StatsDashboard = React.lazy(() => import('@/components/StatsDashboard'))
const SecurityIncidentsDashboard = React.lazy(() => import('@/components/SecurityIncidentsDashboard'))
const SecuritySettingsDialog = React.lazy(() => import('@/components/SecuritySettingsDialog'))
const BlocklistManagerDialog = React.lazy(() => import('@/components/BlocklistManagerDialog'))
const AttackerProfileDialog = React.lazy(() => import('@/components/AttackerProfileDialog'))
const ContactInboxDialog = React.lazy(() => import('@/components/ContactInboxDialog'))
const SubscriberListDialog = React.lazy(() => import('@/components/SubscriberListDialog'))

export interface AdminDialogManagerProps {
  isOwner: boolean
  needsSetup: boolean
  editMode: boolean
  onToggleEdit: () => void
  adminSettings: AdminSettings | undefined
  setAdminSettings: (settings: AdminSettings) => void
  siteData: SiteData | undefined
  onImportData: (data: SiteData) => void
  onRefreshSiteData: () => void
  onUpdateSiteData: (updater: SiteData | ((current: SiteData) => SiteData)) => void
  onLogout: () => Promise<void>
  onFetchBandsintown: (isAutoLoad?: boolean) => Promise<void>
  onFetchITunes: (isAutoLoad?: boolean) => Promise<void>
  onResetReleases: () => Promise<void>
  onResetGigs: () => Promise<void>
  onChangePassword: (password: string) => Promise<void>
  onSetPassword: (password: string) => Promise<void>
  onAdminLogin: (password: string, totpCode?: string) => Promise<{ success: boolean; totpRequired?: boolean }>
  onSetupAdminPassword: (password: string) => Promise<void>
  showLoginDialog: boolean
  setShowLoginDialog: (v: boolean) => void
  showSetupDialog: boolean
  setShowSetupDialog: (v: boolean) => void
  terminalCommands: TerminalCommand[]
}

export function AdminDialogManager({
  isOwner,
  needsSetup,
  editMode,
  onToggleEdit,
  adminSettings,
  setAdminSettings,
  siteData,
  onImportData,
  onRefreshSiteData,
  onUpdateSiteData,
  onLogout,
  onFetchBandsintown,
  onFetchITunes,
  onResetReleases,
  onResetGigs,
  onChangePassword,
  onSetPassword,
  onAdminLogin,
  onSetupAdminPassword,
  showLoginDialog,
  setShowLoginDialog,
  showSetupDialog,
  setShowSetupDialog,
  terminalCommands: _terminalCommands,
}: AdminDialogManagerProps) {
  const [showConfigEditor, setShowConfigEditor] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [showSecurityIncidents, setShowSecurityIncidents] = useState(false)
  const [showSecuritySettings, setShowSecuritySettings] = useState(false)
  const [showBlocklist, setShowBlocklist] = useState(false)
  const [showAttackerProfile, setShowAttackerProfile] = useState(false)
  const [selectedAttackerIp, setSelectedAttackerIp] = useState<string>('')
  const [showContactInbox, setShowContactInbox] = useState(false)
  const [showSubscriberList, setShowSubscriberList] = useState(false)

  return (
    <>
      {isOwner && (
        <EditControls
          editMode={editMode}
          onToggleEdit={onToggleEdit}
          hasPassword={!needsSetup}
          onChangePassword={onChangePassword}
          onSetPassword={onSetPassword}
          adminSettings={adminSettings}
          setAdminSettings={setAdminSettings}
          siteData={siteData}
          onImportData={(data) => onImportData(data as SiteData)}
          onRefreshSiteData={onRefreshSiteData}
          onOpenConfigEditor={() => setShowConfigEditor(true)}
          onOpenStats={() => setShowStats(true)}
          onOpenSecurityIncidents={() => setShowSecurityIncidents(true)}
          onOpenSecuritySettings={() => setShowSecuritySettings(true)}
          onOpenBlocklist={() => setShowBlocklist(true)}
          onOpenContactInbox={() => setShowContactInbox(true)}
          onOpenSubscriberList={() => setShowSubscriberList(true)}
          onUpdateSiteData={onUpdateSiteData}
          onLogout={onLogout}
          onFetchBandsintown={onFetchBandsintown}
          onFetchITunes={onFetchITunes}
          onResetReleases={onResetReleases}
          onResetGigs={onResetGigs}
        />
      )}

      <Suspense fallback={null}>
        <ConfigEditorDialog
          open={showConfigEditor}
          onClose={() => setShowConfigEditor(false)}
          overrides={adminSettings?.configOverrides || {}}
          onSave={(configOverrides) => setAdminSettings({ ...(adminSettings || {}), configOverrides })}
        />
      </Suspense>

      {/* Stats Dashboard (admin) */}
      <Suspense fallback={null}>
        <StatsDashboard open={showStats} onClose={() => setShowStats(false)} />
      </Suspense>

      {/* Security admin dialogs — only rendered when admin is logged in */}
      {isOwner && (
        <Suspense fallback={null}>
          <SecurityIncidentsDashboard
            open={showSecurityIncidents}
            onClose={() => setShowSecurityIncidents(false)}
            onViewProfile={(hashedIp) => {
              setSelectedAttackerIp(hashedIp)
              setShowAttackerProfile(true)
            }}
          />
          <SecuritySettingsDialog
            open={showSecuritySettings}
            onClose={() => setShowSecuritySettings(false)}
          />
          <BlocklistManagerDialog
            open={showBlocklist}
            onClose={() => setShowBlocklist(false)}
          />
          <AttackerProfileDialog
            open={showAttackerProfile}
            onClose={() => setShowAttackerProfile(false)}
            hashedIp={selectedAttackerIp}
          />
          <ContactInboxDialog
            open={showContactInbox}
            onClose={() => setShowContactInbox(false)}
          />
          <SubscriberListDialog
            open={showSubscriberList}
            onClose={() => setShowSubscriberList(false)}
          />
        </Suspense>
      )}

      {/* Auth dialogs — available to all (needed for login / first-time setup) */}
      <AdminLoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        mode="login"
        onLogin={onAdminLogin}
        onSetPassword={onSetPassword}
      />

      <AdminLoginDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        mode="setup"
        onSetPassword={onSetupAdminPassword}
      />
    </>
  )
}
