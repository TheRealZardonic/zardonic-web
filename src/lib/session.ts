/**
 * Session Management Helper
 * Handles admin authentication.
 *
 * Uses cookie-based auth system (`/api/auth` with HttpOnly `zd-session`
 * cookie + optional TOTP). Legacy `/api/session` token-in-header approach
 * is kept as fallback for backward compatibility.
 */

/**
 * Login with password (and optional TOTP code).
 * Uses the `/api/auth` endpoint which sets an HttpOnly `zd-session` cookie.
 */
export async function loginWithPassword(
  password: string,
  totpCode?: string
): Promise<{ success: boolean; totpRequired?: boolean; error?: string }> {
  try {
    const body: Record<string, string> = { password }
    if (totpCode) body.totpCode = totpCode

    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })

    if (response.ok) {
      return { success: true }
    }

    const data = await response.json().catch(() => ({}))

    // 403 with totpRequired means step 2 needed
    if (response.status === 403 && data?.totpRequired) {
      return { success: false, totpRequired: true }
    }

    // Fallback: try legacy session endpoint
    if (response.status !== 200) {
      const legacyResponse = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (legacyResponse.ok) {
        const result = await legacyResponse.json()
        if (result.token) {
          localStorage.setItem('admin-token', result.token)
          return { success: true }
        }
      }
    }

    return { success: false, error: data?.error || 'Login failed' }
  } catch (error) {
    console.error('[Session] Login error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Validate current session and get auth status.
 * Returns full status object from /api/auth.
 */
export async function validateSession(): Promise<{
  authenticated: boolean
  needsSetup?: boolean
  totpEnabled?: boolean
}> {
  try {
    const response = await fetch('/api/auth', {
      method: 'GET',
      credentials: 'same-origin',
    })
    if (response.ok) {
      return await response.json()
    }

    // Fallback: legacy token-in-header validation
    const token = localStorage.getItem('admin-token')
    if (token) {
      const legacyResponse = await fetch('/api/session', {
        method: 'GET',
        headers: { 'x-session-token': token },
      })
      if (legacyResponse.ok) return { authenticated: true }
    }

    return { authenticated: false }
  } catch (error) {
    console.error('[Session] Validation error:', error)
    return { authenticated: false }
  }
}

/**
 * Logout — clears cookie session (and legacy localStorage token).
 */
export async function logout(): Promise<void> {
  try {
    // Primary: logout via /api/auth (clears HttpOnly cookie server-side)
    await fetch('/api/auth', {
      method: 'DELETE',
      credentials: 'same-origin',
    }).catch(() => {})

    // Also clear legacy token
    const token = localStorage.getItem('admin-token')
    if (token) {
      await fetch('/api/session', {
        method: 'DELETE',
        headers: { 'x-session-token': token },
      }).catch(() => {})
    }

    localStorage.removeItem('admin-token')
  } catch (error) {
    console.error('[Session] Logout error:', error)
  }
}

/**
 * Setup initial admin password via /api/auth POST action=setup.
 */
export async function setupPassword(password: string, setupToken?: string): Promise<boolean> {
  try {
    const body: Record<string, string> = { action: 'setup', password }
    if (setupToken) body.setupToken = setupToken

    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })

    if (response.ok) return true

    // Fallback: legacy session endpoint
    const legacyResponse = await fetch('/api/session', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    return legacyResponse.ok
  } catch (error) {
    console.error('[Session] Setup error:', error)
    return false
  }
}

/**
 * Change the admin password (requires current password + valid session).
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ currentPassword, newPassword }),
    })

    if (response.ok) return { success: true }
    const data = await response.json().catch(() => ({}))
    return { success: false, error: data?.error || 'Password change failed' }
  } catch (error) {
    console.error('[Session] Change password error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Initiate TOTP setup — returns the TOTP URI and secret for QR code display.
 */
export async function setupTotp(): Promise<{ success: boolean; totpUri?: string; totpSecret?: string; error?: string }> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'totp-setup' }),
    })

    const data = await response.json().catch(() => ({}))
    if (response.ok) return { success: true, totpUri: data.totpUri, totpSecret: data.totpSecret }
    return { success: false, error: data?.error || 'TOTP setup failed' }
  } catch (error) {
    console.error('[Session] TOTP setup error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Confirm TOTP enrollment with a 6-digit code.
 */
export async function verifyTotp(code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'totp-verify', code }),
    })

    if (response.ok) return { success: true }
    const data = await response.json().catch(() => ({}))
    return { success: false, error: data?.error || 'TOTP verification failed' }
  } catch (error) {
    console.error('[Session] TOTP verify error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Disable TOTP (requires password + current TOTP code).
 */
export async function disableTotp(password: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ action: 'totp-disable', password, code }),
    })

    if (response.ok) return { success: true }
    const data = await response.json().catch(() => ({}))
    return { success: false, error: data?.error || 'TOTP disable failed' }
  } catch (error) {
    console.error('[Session] TOTP disable error:', error)
    return { success: false, error: 'Network error' }
  }
}

/**
 * Check if the user has an active session by calling /api/auth.
 * Returns true if authenticated (cookie session or legacy token).
 */
export async function hasSessionToken(): Promise<boolean> {
  const status = await validateSession()
  return status.authenticated
}

/**
 * @deprecated Use loginWithPassword() which handles both auth systems.
 * Hash password using Web Crypto API (client-side SHA-256).
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
