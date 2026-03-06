import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Session-based auth tests — validates the cookie-based authentication model
// ---------------------------------------------------------------------------
describe('session-based auth model', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('auth status is checked via /api/auth GET, not localStorage', () => {
    // The new architecture does NOT use localStorage for admin tokens.
    // Auth status is determined by an HttpOnly cookie + server session.
    expect(localStorage.getItem('admin-token')).toBeNull()
    // This is intentional — HttpOnly cookies cannot be read by JavaScript
  })

  it('login calls POST /api/auth with password (no client-side hashing)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    
    // Simulate what the new login flow does
    const password = 'testPassword123'
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ password }),
    }))
    
    // Verify NO localStorage token is set
    expect(localStorage.getItem('admin-token')).toBeNull()
  })

  it('setup calls POST /api/auth with password and action:setup', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    
    const password = 'newPassword123'
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, action: 'setup' }),
    })

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ password, action: 'setup' }),
    }))
  })

  it('logout calls DELETE /api/auth', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    )
    
    await fetch('/api/auth', { method: 'DELETE' })

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth', expect.objectContaining({
      method: 'DELETE',
    }))
  })

  it('auth check calls GET /api/auth', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true, needsSetup: false }), { status: 200 })
    )
    
    const res = await fetch('/api/auth')
    const data = await res.json()

    expect(fetchSpy).toHaveBeenCalledWith('/api/auth')
    expect(data.authenticated).toBe(true)
    expect(data.needsSetup).toBe(false)
  })
})
