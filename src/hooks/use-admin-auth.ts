import { useState, useEffect, useCallback, startTransition } from 'react'

export interface AdminAuthState {
  isOwner: boolean
  needsSetup: boolean
  totpEnabled: boolean
  setupTokenRequired: boolean
}

export interface AdminAuthActions {
  handleAdminLogin: (password: string, totpCode?: string) => Promise<boolean | 'totp-required'>
  handleAdminLogout: () => Promise<void>
  handleSetAdminPassword: (password: string, setupToken?: string) => Promise<void>
  handleSetupAdminPassword: (password: string, setupToken?: string) => Promise<void>
  handleChangeAdminPassword: (password: string) => Promise<void>
  setIsOwner: (value: boolean) => void
  setNeedsSetup: (value: boolean) => void
}

export function useAdminAuth() {
  const [isOwner, setIsOwner] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [setupTokenRequired, setSetupTokenRequired] = useState(false)

  // Check auth status on mount via cookie-based session
  useEffect(() => {
    fetch('/api/auth', { credentials: 'same-origin' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          startTransition(() => {
            if (data.authenticated) setIsOwner(true)
            setNeedsSetup(data.needsSetup)
            setTotpEnabled(data.totpEnabled || false)
            setSetupTokenRequired(data.setupTokenRequired || false)
          })
        }
      })
      .catch(() => { /* ignore — local dev without API */ })
  }, [])

  // Periodically check session validity
  useEffect(() => {
    if (!isOwner) return
    const SESSION_CHECK_INTERVAL = 60_000
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/auth', { credentials: 'same-origin' })
        if (!res.ok) return
        const data = await res.json()
        if (!data.authenticated) {
          window.location.reload()
        }
      } catch {
        // Network error — transient
      }
    }, SESSION_CHECK_INTERVAL)
    return () => clearInterval(intervalId)
  }, [isOwner])

  const handleAdminLogin = useCallback(async (password: string, totpCode?: string): Promise<boolean | 'totp-required'> => {
    try {
      const body: Record<string, string> = { password }
      if (totpCode) body.totpCode = totpCode
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      })
      if (res.ok) {
        startTransition(() => {
          setIsOwner(true)
          setNeedsSetup(false)
        })
        return true
      }
      const data = await res.json().catch(() => ({}))
      if (data.totpRequired) return 'totp-required'
      return false
    } catch {
      return false
    }
  }, [])

  const handleSetAdminPassword = useCallback(async (password: string, setupToken?: string): Promise<void> => {
    const body: Record<string, string> = { password, action: 'setup' }
    if (setupToken) body.setupToken = setupToken
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to set password')
    }
    startTransition(() => setNeedsSetup(false))
  }, [])

  const handleSetupAdminPassword = useCallback(async (password: string, setupToken?: string): Promise<void> => {
    await handleSetAdminPassword(password, setupToken)
    startTransition(() => setIsOwner(true))
  }, [handleSetAdminPassword])

  const handleChangeAdminPassword = useCallback(async (password: string): Promise<void> => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ newPassword: password }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to change password')
    }
  }, [])

  const handleAdminLogout = useCallback(async (): Promise<void> => {
    try {
      await fetch('/api/auth', {
        method: 'DELETE',
        credentials: 'same-origin',
      })
    } catch { /* ignore */ }
    startTransition(() => {
      setIsOwner(false)
    })
  }, [])

  return {
    isOwner,
    needsSetup,
    totpEnabled,
    setupTokenRequired,
    setIsOwner,
    setNeedsSetup,
    handleAdminLogin,
    handleAdminLogout,
    handleSetAdminPassword,
    handleSetupAdminPassword,
    handleChangeAdminPassword,
  }
}
