/**
 * Session Management Helper
 * Handles admin authentication via Vercel KV
 * Uses localStorage for persistent admin sessions
 */

/**
 * Hash password using Web Crypto API (client-side)
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Login with password, get session token
 */
export async function loginWithPassword(password: string): Promise<string | null> {
  try {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      console.error('[Session] Login failed:', response.status)
      return null
    }

    const result = await response.json()
    
    // Store session token in localStorage (persistent across page reloads)
    if (result.token) {
      localStorage.setItem('admin-token', result.token)
      return result.token
    }

    return null
  } catch (error) {
    console.error('[Session] Login error:', error)
    return null
  }
}

/**
 * Validate current session token
 */
export async function validateSession(): Promise<boolean> {
  try {
    const token = localStorage.getItem('admin-token')
    
    if (!token) {
      return false
    }

    const response = await fetch('/api/session', {
      method: 'GET',
      headers: {
        'x-session-token': token,
      },
    })

    return response.ok
  } catch (error) {
    console.error('[Session] Validation error:', error)
    return false
  }
}

/**
 * Logout (delete session)
 */
export async function logout(): Promise<void> {
  try {
    const token = localStorage.getItem('admin-token')
    
    if (token) {
      await fetch('/api/session', {
        method: 'DELETE',
        headers: {
          'x-session-token': token,
        },
      })
    }

    localStorage.removeItem('admin-token')
  } catch (error) {
    console.error('[Session] Logout error:', error)
  }
}

/**
 * Setup initial admin password
 */
export async function setupPassword(password: string): Promise<boolean> {
  try {
    const response = await fetch('/api/session', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })

    if (!response.ok) {
      console.error('[Session] Setup failed:', response.status)
      return false
    }

    // Also login immediately
    const token = await loginWithPassword(password)
    return token !== null
  } catch (error) {
    console.error('[Session] Setup error:', error)
    return false
  }
}

/**
 * Check if user has valid session
 */
export function hasSessionToken(): boolean {
  return !!localStorage.getItem('admin-token')
}
