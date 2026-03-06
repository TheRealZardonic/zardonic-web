import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock fetch globally (jsdom environment provides it, but we need control)
// ---------------------------------------------------------------------------
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helpers to create mock Response objects
function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
  } as unknown as Response
}

function errorResponse(status: number, data: unknown = {}): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(data),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// Import after mock setup
import {
  loginWithPassword,
  validateSession,
  logout,
  setupPassword,
  changePassword,
  setupTotp,
  verifyTotp,
  disableTotp,
  hasSessionToken,
  hashPassword,
} from './session.ts'

// ---------------------------------------------------------------------------
describe('loginWithPassword()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('returns success:true on 200 from /api/auth', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    const result = await loginWithPassword('password')
    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith('/api/auth', expect.objectContaining({ method: 'POST' }))
  })

  it('sends password in JSON body', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await loginWithPassword('mypassword')
    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.password).toBe('mypassword')
  })

  it('includes totpCode in body when provided', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await loginWithPassword('pw', '123456')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.totpCode).toBe('123456')
  })

  it('returns totpRequired:true when server returns 403 + totpRequired', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(403, { totpRequired: true }))
    const result = await loginWithPassword('pw')
    expect(result.success).toBe(false)
    expect(result.totpRequired).toBe(true)
  })

  it('falls back to legacy /api/session on non-200 from /api/auth', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(401, { error: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse({ token: 'legacytoken' }))
    const result = await loginWithPassword('pw')
    expect(result.success).toBe(true)
    expect(localStorage.getItem('admin-token')).toBe('legacytoken')
  })

  it('stores legacy token in localStorage when /api/session returns one', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(401, {}))
      .mockResolvedValueOnce(jsonResponse({ token: 'tok123' }))
    await loginWithPassword('pw')
    expect(localStorage.getItem('admin-token')).toBe('tok123')
  })

  it('returns success:false with error on total failure', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(401, { error: 'Invalid password' }))
      .mockResolvedValueOnce(errorResponse(401, {})) // legacy also fails
    const result = await loginWithPassword('wrong')
    expect(result.success).toBe(false)
  })

  it('returns network error on fetch exception', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const result = await loginWithPassword('pw')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('validateSession()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('returns authenticated:true when /api/auth GET returns 200', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ authenticated: true, needsSetup: false }))
    const result = await validateSession()
    expect(result.authenticated).toBe(true)
  })

  it('returns full status object from /api/auth', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      authenticated: true,
      needsSetup: false,
      totpEnabled: true,
    }))
    const result = await validateSession()
    expect(result.needsSetup).toBe(false)
    expect(result.totpEnabled).toBe(true)
  })

  it('falls back to legacy token on /api/auth 4xx', async () => {
    localStorage.setItem('admin-token', 'legacytok')
    mockFetch
      .mockResolvedValueOnce(errorResponse(401, {})) // /api/auth fails
      .mockResolvedValueOnce(jsonResponse({ valid: true })) // /api/session succeeds
    const result = await validateSession()
    expect(result.authenticated).toBe(true)
  })

  it('returns authenticated:false when both auth systems fail', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(401, {}))
    const result = await validateSession()
    expect(result.authenticated).toBe(false)
  })

  it('returns authenticated:false on fetch exception', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockRejectedValueOnce(new Error('timeout'))
    const result = await validateSession()
    expect(result.authenticated).toBe(false)
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('logout()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('calls DELETE /api/auth', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ success: true }))
    await logout()
    const deleteCall = mockFetch.mock.calls.find(c => c[1]?.method === 'DELETE')
    expect(deleteCall).toBeDefined()
    expect(deleteCall![0]).toBe('/api/auth')
  })

  it('clears admin-token from localStorage', async () => {
    localStorage.setItem('admin-token', 'tok')
    mockFetch.mockResolvedValue(jsonResponse({ success: true }))
    await logout()
    expect(localStorage.getItem('admin-token')).toBeNull()
  })

  it('also deletes legacy session when token exists', async () => {
    localStorage.setItem('admin-token', 'legacytok')
    mockFetch.mockResolvedValue(jsonResponse({ success: true }))
    await logout()
    const legacyDeleteCall = mockFetch.mock.calls.find(
      c => c[0] === '/api/session' && c[1]?.method === 'DELETE'
    )
    expect(legacyDeleteCall).toBeDefined()
  })

  it('does not throw when fetch fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockRejectedValue(new Error('gone'))
    await expect(logout()).resolves.not.toThrow()
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('setupPassword()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('POSTs action=setup to /api/auth', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await setupPassword('newpassword123')
    const call = mockFetch.mock.calls[0]
    const body = JSON.parse(call[1].body)
    expect(body.action).toBe('setup')
    expect(body.password).toBe('newpassword123')
  })

  it('includes setupToken when provided', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await setupPassword('newpassword123', 'mytoken')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.setupToken).toBe('mytoken')
  })

  it('returns true on success', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    expect(await setupPassword('newpassword123')).toBe(true)
  })

  it('falls back to PUT /api/session on failure', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(409, {}))
      .mockResolvedValueOnce(jsonResponse({ success: true }))
    const result = await setupPassword('newpassword123')
    expect(result).toBe(true)
    const legacyCall = mockFetch.mock.calls.find(c => c[0] === '/api/session' && c[1]?.method === 'PUT')
    expect(legacyCall).toBeDefined()
  })

  it('returns false when both endpoints fail', async () => {
    mockFetch
      .mockResolvedValueOnce(errorResponse(409, {}))
      .mockResolvedValueOnce(errorResponse(400, {}))
    expect(await setupPassword('newpassword123')).toBe(false)
  })

  it('returns false on network error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockRejectedValueOnce(new Error('network'))
    expect(await setupPassword('newpassword123')).toBe(false)
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('changePassword()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs currentPassword + newPassword to /api/auth', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    await changePassword('old', 'newlongpw')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.currentPassword).toBe('old')
    expect(body.newPassword).toBe('newlongpw')
  })

  it('returns success:true on 200', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    expect((await changePassword('old', 'newlongpw')).success).toBe(true)
  })

  it('returns success:false with error message on failure', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(403, { error: 'Wrong password' }))
    const result = await changePassword('wrong', 'newlongpw')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Wrong password')
  })

  it('returns network error on exception', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    mockFetch.mockRejectedValueOnce(new Error('gone'))
    const result = await changePassword('old', 'new')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Network error')
    consoleSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
describe('setupTotp()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs action=totp-setup to /api/auth', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({
      success: true,
      totpUri: 'otpauth://totp/example',
      totpSecret: 'ABC123',
    }))
    const result = await setupTotp()
    expect(result.success).toBe(true)
    expect(result.totpUri).toBe('otpauth://totp/example')
    expect(result.totpSecret).toBe('ABC123')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.action).toBe('totp-setup')
  })

  it('returns error on non-200', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(409, { error: 'Already configured' }))
    const result = await setupTotp()
    expect(result.success).toBe(false)
    expect(result.error).toBe('Already configured')
  })
})

// ---------------------------------------------------------------------------
describe('verifyTotp()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs action=totp-verify + code to /api/auth', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    const result = await verifyTotp('123456')
    expect(result.success).toBe(true)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.action).toBe('totp-verify')
    expect(body.code).toBe('123456')
  })

  it('returns error on invalid code', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(403, { error: 'Invalid code' }))
    const result = await verifyTotp('999999')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid code')
  })
})

// ---------------------------------------------------------------------------
describe('disableTotp()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('POSTs action=totp-disable + password + code', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ success: true }))
    const result = await disableTotp('mypassword', '123456')
    expect(result.success).toBe(true)
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.action).toBe('totp-disable')
    expect(body.password).toBe('mypassword')
    expect(body.code).toBe('123456')
  })

  it('returns error when request fails', async () => {
    mockFetch.mockResolvedValueOnce(errorResponse(403, { error: 'Wrong code' }))
    const result = await disableTotp('pw', 'bad')
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('hasSessionToken()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('returns true when /api/auth returns authenticated:true', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ authenticated: true }))
    expect(await hasSessionToken()).toBe(true)
  })

  it('returns false when /api/auth returns authenticated:false', async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ authenticated: false }))
    expect(await hasSessionToken()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
describe('hashPassword()', () => {
  it('returns a non-empty hex string', async () => {
    const hash = await hashPassword('testpassword')
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic', async () => {
    const h1 = await hashPassword('same-input')
    const h2 = await hashPassword('same-input')
    expect(h1).toBe(h2)
  })

  it('produces different hashes for different passwords', async () => {
    expect(await hashPassword('pass1')).not.toBe(await hashPassword('pass2'))
  })
})
