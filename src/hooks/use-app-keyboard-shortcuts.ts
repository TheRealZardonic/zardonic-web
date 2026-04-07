import { useEffect, useRef } from 'react'

interface UseAppKeyboardShortcutsParams {
  isOwner: boolean
  setShowLoginDialog: (v: boolean) => void
  setOpenAdminHubOnMount: (v: boolean) => void
}

export function useAppKeyboardShortcuts({
  isOwner,
  setShowLoginDialog,
  setOpenAdminHubOnMount,
}: UseAppKeyboardShortcutsParams): void {
  const prevIsOwnerRef = useRef(false)

  // ── #admin hash → open login dialog ─────────────────────────────────────
  useEffect(() => {
    const handleAdminHash = () => {
      if (window.location.hash === '#admin') {
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
        if (isOwner) {
          // Already authenticated — open the dashboard immediately
          setOpenAdminHubOnMount(true)
        } else {
          setShowLoginDialog(true)
        }
      }
    }
    // Check once on mount
    handleAdminHash()
    window.addEventListener('hashchange', handleAdminHash)
    return () => window.removeEventListener('hashchange', handleAdminHash)
  }, [isOwner, setShowLoginDialog, setOpenAdminHubOnMount])

  // ── CMD+K / CTRL+K → open login dialog or dashboard ─────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (isOwner) {
          setOpenAdminHubOnMount(true)
        } else {
          setShowLoginDialog(true)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOwner, setShowLoginDialog, setOpenAdminHubOnMount])

  // ── Auto-open dashboard after login ─────────────────────────────────────
  useEffect(() => {
    if (isOwner && !prevIsOwnerRef.current) {
      // Admin just logged in — flag the hub to auto-open
      setOpenAdminHubOnMount(true)
    }
    prevIsOwnerRef.current = isOwner
  }, [isOwner, setOpenAdminHubOnMount])
}
