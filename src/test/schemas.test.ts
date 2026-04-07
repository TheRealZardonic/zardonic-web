import { describe, it, expect } from 'vitest'
import {
  kvKeySchema,
  kvPostSchema,
  kvGetQuerySchema,
  authLoginSchema,
  authLoginTotpSchema,
  authSetupSchema,
  authChangePasswordSchema,
  totpVerifySchema,
  totpSetupSchema,
  analyticsPostSchema,
  itunesQuerySchema,
  odesliQuerySchema,
  imageProxyQuerySchema,
  terminalCommandSchema,
  blockSchema,
  unblockSchema,
  getProfileSchema,
  deleteProfileSchema,
  securitySettingsSchema,
  validate,
} from '../../api/_schemas.ts'

// ---------------------------------------------------------------------------
// validate() helper
// ---------------------------------------------------------------------------
describe('validate()', () => {
  it('returns success + data on valid input', () => {
    const result = validate(authLoginSchema, { password: 'hunter2' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.password).toBe('hunter2')
  })

  it('returns success:false + error string on invalid input', () => {
    const result = validate(authLoginSchema, { password: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(typeof result.error).toBe('string')
  })

  it('returns error for completely wrong type', () => {
    const result = validate(authLoginSchema, 'not an object')
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// kvKeySchema
// ---------------------------------------------------------------------------
describe('kvKeySchema', () => {
  it('accepts normal key', () => {
    expect(kvKeySchema.safeParse('zardonic-band-data').success).toBe(true)
  })

  it('rejects empty key', () => {
    expect(kvKeySchema.safeParse('').success).toBe(false)
  })

  it('rejects key exceeding 200 chars', () => {
    expect(kvKeySchema.safeParse('a'.repeat(201)).success).toBe(false)
  })

  it('rejects key with newline', () => {
    expect(kvKeySchema.safeParse('bad\nkey').success).toBe(false)
  })

  it('rejects key with carriage return', () => {
    expect(kvKeySchema.safeParse('bad\rkey').success).toBe(false)
  })

  it('rejects key with null byte', () => {
    expect(kvKeySchema.safeParse('bad\0key').success).toBe(false)
  })

  it('accepts key with dots, dashes, colons', () => {
    expect(kvKeySchema.safeParse('zd.key-value:123').success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// kvPostSchema
// ---------------------------------------------------------------------------
describe('kvPostSchema', () => {
  it('accepts valid key+value', () => {
    const r = kvPostSchema.safeParse({ key: 'my-key', value: { data: 1 } })
    expect(r.success).toBe(true)
  })

  it('rejects missing key', () => {
    expect(kvPostSchema.safeParse({ value: 'x' }).success).toBe(false)
  })

  it('rejects undefined value', () => {
    expect(kvPostSchema.safeParse({ key: 'k', value: undefined }).success).toBe(false)
  })

  it('accepts null value', () => {
    expect(kvPostSchema.safeParse({ key: 'k', value: null }).success).toBe(true)
  })

  it('accepts number value', () => {
    expect(kvPostSchema.safeParse({ key: 'k', value: 42 }).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// kvGetQuerySchema
// ---------------------------------------------------------------------------
describe('kvGetQuerySchema', () => {
  it('accepts valid key', () => {
    expect(kvGetQuerySchema.safeParse({ key: 'zardonic-band-data' }).success).toBe(true)
  })

  it('rejects missing key', () => {
    expect(kvGetQuerySchema.safeParse({}).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------
describe('authLoginSchema', () => {
  it('accepts valid password', () => {
    expect(authLoginSchema.safeParse({ password: 'mypassword' }).success).toBe(true)
  })

  it('rejects empty password', () => {
    expect(authLoginSchema.safeParse({ password: '' }).success).toBe(false)
  })

  it('rejects password over 200 chars', () => {
    expect(authLoginSchema.safeParse({ password: 'a'.repeat(201) }).success).toBe(false)
  })
})

describe('authLoginTotpSchema', () => {
  it('accepts password without totpCode', () => {
    expect(authLoginTotpSchema.safeParse({ password: 'pw' }).success).toBe(true)
  })

  it('accepts password with valid 6-digit totpCode', () => {
    expect(authLoginTotpSchema.safeParse({ password: 'pw', totpCode: '123456' }).success).toBe(true)
  })

  it('rejects totpCode with wrong length', () => {
    expect(authLoginTotpSchema.safeParse({ password: 'pw', totpCode: '12345' }).success).toBe(false)
  })

  it('rejects totpCode with non-digits', () => {
    expect(authLoginTotpSchema.safeParse({ password: 'pw', totpCode: '12345a' }).success).toBe(false)
  })
})

describe('authSetupSchema', () => {
  it('accepts valid setup body', () => {
    expect(authSetupSchema.safeParse({ action: 'setup', password: 'longpass1' }).success).toBe(true)
  })

  it('rejects password < 8 chars', () => {
    expect(authSetupSchema.safeParse({ action: 'setup', password: 'short' }).success).toBe(false)
  })

  it('rejects wrong action literal', () => {
    expect(authSetupSchema.safeParse({ action: 'login', password: 'longpass1' }).success).toBe(false)
  })

  it('accepts optional setupToken', () => {
    expect(authSetupSchema.safeParse({ action: 'setup', password: 'longpass1', setupToken: 'tok' }).success).toBe(true)
  })
})

describe('authChangePasswordSchema', () => {
  it('accepts valid change-password body', () => {
    expect(authChangePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'newlongpw' }).success).toBe(true)
  })

  it('rejects newPassword < 8 chars', () => {
    expect(authChangePasswordSchema.safeParse({ currentPassword: 'old', newPassword: 'short' }).success).toBe(false)
  })

  it('rejects empty currentPassword', () => {
    expect(authChangePasswordSchema.safeParse({ currentPassword: '', newPassword: 'newlongpw' }).success).toBe(false)
  })
})

describe('totpVerifySchema', () => {
  it('accepts valid verify body', () => {
    expect(totpVerifySchema.safeParse({ action: 'totp-verify', code: '654321' }).success).toBe(true)
  })

  it('rejects non-digit code', () => {
    expect(totpVerifySchema.safeParse({ action: 'totp-verify', code: '12345x' }).success).toBe(false)
  })

  it('rejects wrong action', () => {
    expect(totpVerifySchema.safeParse({ action: 'totp-disable', code: '123456' }).success).toBe(false)
  })
})

describe('totpSetupSchema', () => {
  it('accepts valid disable body', () => {
    expect(totpSetupSchema.safeParse({ action: 'totp-disable', password: 'pw', code: '111222' }).success).toBe(true)
  })

  it('rejects missing password', () => {
    expect(totpSetupSchema.safeParse({ action: 'totp-disable', code: '111222' }).success).toBe(false)
  })

  it('rejects missing code', () => {
    expect(totpSetupSchema.safeParse({ action: 'totp-disable', password: 'pw' }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// analyticsPostSchema
// ---------------------------------------------------------------------------
describe('analyticsPostSchema', () => {
  it('accepts valid page_view', () => {
    expect(analyticsPostSchema.safeParse({ type: 'page_view' }).success).toBe(true)
  })

  it('accepts all valid event types', () => {
    for (const type of ['page_view', 'section_view', 'interaction', 'click'] as const) {
      expect(analyticsPostSchema.safeParse({ type }).success).toBe(true)
    }
  })

  it('rejects unknown event type', () => {
    expect(analyticsPostSchema.safeParse({ type: 'custom_event' }).success).toBe(false)
  })

  it('accepts valid meta fields', () => {
    const r = analyticsPostSchema.safeParse({
      type: 'page_view',
      meta: { referrer: 'https://example.com', device: 'mobile', sessionId: 'abc' },
    })
    expect(r.success).toBe(true)
  })

  it('rejects meta field with control characters', () => {
    expect(analyticsPostSchema.safeParse({ type: 'page_view', meta: { referrer: 'bad\nvalue' } }).success).toBe(false)
  })

  it('accepts heatmap data', () => {
    expect(analyticsPostSchema.safeParse({ type: 'click', heatmap: { x: 0.5, y: 1.0 } }).success).toBe(true)
  })

  it('rejects heatmap x > 1', () => {
    expect(analyticsPostSchema.safeParse({ type: 'click', heatmap: { x: 1.5, y: 0.5 } }).success).toBe(false)
  })

  it('rejects heatmap y > 2', () => {
    expect(analyticsPostSchema.safeParse({ type: 'click', heatmap: { x: 0.5, y: 2.1 } }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// itunesQuerySchema
// ---------------------------------------------------------------------------
describe('itunesQuerySchema', () => {
  it('accepts valid term', () => {
    expect(itunesQuerySchema.safeParse({ term: 'Zardonic' }).success).toBe(true)
  })

  it('accepts valid entity', () => {
    for (const entity of ['song', 'album', 'all'] as const) {
      expect(itunesQuerySchema.safeParse({ term: 'x', entity }).success).toBe(true)
    }
  })

  it('rejects empty term', () => {
    expect(itunesQuerySchema.safeParse({ term: '' }).success).toBe(false)
  })

  it('rejects term > 200 chars', () => {
    expect(itunesQuerySchema.safeParse({ term: 'x'.repeat(201) }).success).toBe(false)
  })

  it('rejects invalid entity', () => {
    expect(itunesQuerySchema.safeParse({ term: 'x', entity: 'podcast' }).success).toBe(false)
  })

  it('accepts valid limit', () => {
    expect(itunesQuerySchema.safeParse({ term: 'x', limit: '50' }).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// odesliQuerySchema
// ---------------------------------------------------------------------------
describe('odesliQuerySchema', () => {
  it('accepts valid streaming URL', () => {
    expect(odesliQuerySchema.safeParse({ url: 'https://open.spotify.com/track/123' }).success).toBe(true)
  })

  it('rejects empty url', () => {
    expect(odesliQuerySchema.safeParse({ url: '' }).success).toBe(false)
  })

  it('rejects non-URL string', () => {
    expect(odesliQuerySchema.safeParse({ url: 'not a url' }).success).toBe(false)
  })

  it('accepts extra fields (stripped by default)', () => {
    expect(odesliQuerySchema.safeParse({ url: 'https://spotify.com/x', userCountry: 'DE' }).success).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// imageProxyQuerySchema
// ---------------------------------------------------------------------------
describe('imageProxyQuerySchema', () => {
  it('accepts valid image URL', () => {
    expect(imageProxyQuerySchema.safeParse({ url: 'https://example.com/img.jpg' }).success).toBe(true)
  })

  it('rejects empty url', () => {
    expect(imageProxyQuerySchema.safeParse({ url: '' }).success).toBe(false)
  })

  it('rejects url > 2000 chars', () => {
    expect(imageProxyQuerySchema.safeParse({ url: 'https://x.com/' + 'a'.repeat(1990) }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// terminalCommandSchema
// ---------------------------------------------------------------------------
describe('terminalCommandSchema', () => {
  it('accepts valid command', () => {
    expect(terminalCommandSchema.safeParse({ command: 'help' }).success).toBe(true)
  })

  it('accepts command with hyphens and underscores', () => {
    expect(terminalCommandSchema.safeParse({ command: 'list-tours' }).success).toBe(true)
  })

  it('rejects empty command', () => {
    expect(terminalCommandSchema.safeParse({ command: '' }).success).toBe(false)
  })

  it('rejects command with spaces', () => {
    expect(terminalCommandSchema.safeParse({ command: 'rm -rf /' }).success).toBe(false)
  })

  it('rejects command with special characters', () => {
    expect(terminalCommandSchema.safeParse({ command: 'cmd;evil' }).success).toBe(false)
  })

  it('rejects command > 100 chars', () => {
    expect(terminalCommandSchema.safeParse({ command: 'a'.repeat(101) }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// blockSchema / unblockSchema
// ---------------------------------------------------------------------------
describe('blockSchema', () => {
  it('accepts valid hashedIp', () => {
    const r = blockSchema.safeParse({ hashedIp: 'a'.repeat(64) })
    expect(r.success).toBe(true)
  })

  it('applies default reason "manual"', () => {
    const r = blockSchema.safeParse({ hashedIp: 'a'.repeat(64) })
    if (r.success) expect(r.data.reason).toBe('manual')
  })

  it('applies default ttlSeconds 604800', () => {
    const r = blockSchema.safeParse({ hashedIp: 'a'.repeat(64) })
    if (r.success) expect(r.data.ttlSeconds).toBe(604800)
  })

  it('rejects hashedIp too short', () => {
    expect(blockSchema.safeParse({ hashedIp: 'short' }).success).toBe(false)
  })

  it('rejects ttlSeconds below minimum', () => {
    expect(blockSchema.safeParse({ hashedIp: 'a'.repeat(64), ttlSeconds: 30 }).success).toBe(false)
  })

  it('rejects ttlSeconds above maximum', () => {
    expect(blockSchema.safeParse({ hashedIp: 'a'.repeat(64), ttlSeconds: 9999999 }).success).toBe(false)
  })
})

describe('unblockSchema', () => {
  it('accepts valid hashedIp', () => {
    expect(unblockSchema.safeParse({ hashedIp: 'a'.repeat(64) }).success).toBe(true)
  })

  it('rejects missing hashedIp', () => {
    expect(unblockSchema.safeParse({}).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getProfileSchema / deleteProfileSchema
// ---------------------------------------------------------------------------
describe('getProfileSchema', () => {
  it('accepts empty query (lists all)', () => {
    const r = getProfileSchema.safeParse({})
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.limit).toBe(50)
      expect(r.data.offset).toBe(0)
    }
  })

  it('accepts specific hashedIp', () => {
    expect(getProfileSchema.safeParse({ hashedIp: 'a'.repeat(64) }).success).toBe(true)
  })

  it('accepts custom limit/offset', () => {
    const r = getProfileSchema.safeParse({ limit: '10', offset: '20' })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.limit).toBe(10)
      expect(r.data.offset).toBe(20)
    }
  })

  it('rejects limit > 100', () => {
    expect(getProfileSchema.safeParse({ limit: '101' }).success).toBe(false)
  })
})

describe('deleteProfileSchema', () => {
  it('accepts valid hashedIp', () => {
    expect(deleteProfileSchema.safeParse({ hashedIp: 'a'.repeat(64) }).success).toBe(true)
  })

  it('rejects missing hashedIp', () => {
    expect(deleteProfileSchema.safeParse({}).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// securitySettingsSchema
// ---------------------------------------------------------------------------
describe('securitySettingsSchema', () => {
  it('accepts empty object (all optional)', () => {
    expect(securitySettingsSchema.safeParse({}).success).toBe(true)
  })

  it('accepts valid boolean flags', () => {
    expect(securitySettingsSchema.safeParse({
      honeytokensEnabled: true,
      rateLimitEnabled: false,
      zipBombEnabled: false,
      alertingEnabled: true,
    }).success).toBe(true)
  })

  it('rejects non-boolean flag', () => {
    expect(securitySettingsSchema.safeParse({ honeytokensEnabled: 'yes' }).success).toBe(false)
  })

  it('accepts valid threshold', () => {
    expect(securitySettingsSchema.safeParse({ autoBlockThreshold: 20 }).success).toBe(true)
  })

  it('rejects threshold below minimum (3)', () => {
    expect(securitySettingsSchema.safeParse({ autoBlockThreshold: 2 }).success).toBe(false)
  })

  it('rejects threshold above maximum (50)', () => {
    expect(securitySettingsSchema.safeParse({ autoBlockThreshold: 51 }).success).toBe(false)
  })

  it('accepts valid tarpitMinMs / tarpitMaxMs', () => {
    expect(securitySettingsSchema.safeParse({ tarpitMinMs: 1000, tarpitMaxMs: 5000 }).success).toBe(true)
  })

  it('rejects tarpitMaxMs above 60000', () => {
    expect(securitySettingsSchema.safeParse({ tarpitMaxMs: 70000 }).success).toBe(false)
  })
})
