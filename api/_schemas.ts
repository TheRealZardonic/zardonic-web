import { z } from 'zod'

/**
 * Zod schemas for strict input validation on all API endpoints.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Safe string: printable, no control characters, bounded length */
const safeString = (maxLen = 200) =>
  z.string().max(maxLen).regex(/^[^\n\r\0]*$/, 'Must not contain control characters')

/** KV key: bounded length, no control characters */
export const kvKeySchema = z.string({ required_error: 'key is required' })
  .max(200, 'key must be 200 characters or less')
  .regex(/^[^\n\r\0]*$/, 'Must not contain control characters')
  .min(1, 'key is required')

// ---------------------------------------------------------------------------
// Analytics API — POST body
// ---------------------------------------------------------------------------

const analyticsMetaSchema = z.object({
  referrer: safeString().optional(),
  device: safeString().optional(),
  browser: safeString().optional(),
  screenResolution: safeString(50).optional(),
  landingPage: safeString().optional(),
  utmSource: safeString(100).optional(),
  utmMedium: safeString(100).optional(),
  utmCampaign: safeString(100).optional(),
  sessionId: safeString(100).optional(),
}).optional()

const heatmapSchema = z.object({
  // x: normalized viewport width (0–1)
  x: z.number().min(0).max(1),
  // y: normalized document height (0–2 allows tracking clicks below the fold when page is scrollable)
  y: z.number().min(0).max(2),
  page: safeString().optional(),
  elementTag: safeString(100).optional(),
}).optional()

export const analyticsPostSchema = z.object({
  type: z.enum(['page_view', 'section_view', 'interaction', 'click']),
  target: safeString().optional(),
  meta: analyticsMetaSchema,
  heatmap: heatmapSchema,
})

// ---------------------------------------------------------------------------
// KV API
// ---------------------------------------------------------------------------

export const kvPostSchema = z.object({
  key: kvKeySchema,
  value: z.unknown().refine((v) => v !== undefined, 'value is required'),
})

export const kvGetQuerySchema = z.object({
  key: kvKeySchema,
})

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authLoginSchema = z.object({
  password: z.string().min(1, 'password is required').max(200),
})

export const authLoginTotpSchema = z.object({
  password: z.string().min(1, 'password is required').max(200),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits').optional(),
})

export const authSetupSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  action: z.literal('setup'),
  setupToken: z.string().max(200).optional(),
})

export const authChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'current password is required').max(200),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
})

export const totpVerifySchema = z.object({
  action: z.literal('totp-verify'),
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})

export const totpSetupSchema = z.object({
  action: z.literal('totp-disable'),
  password: z.string().min(1, 'password is required').max(200),
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})

// ---------------------------------------------------------------------------
// iTunes API
// ---------------------------------------------------------------------------

export const itunesQuerySchema = z.object({
  term: z.string().min(1, 'Search term is required').max(200),
  entity: z.enum(['song', 'album', 'all']).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

// ---------------------------------------------------------------------------
// Odesli API
// ---------------------------------------------------------------------------

export const odesliQuerySchema = z.object({
  url: z.string().min(1, 'A streaming URL is required').max(2000).url('Invalid URL'),
  userCountry: z.string().length(2).regex(/^[A-Z]{2}$/).optional(),
})

// ---------------------------------------------------------------------------
// Blocklist API
// ---------------------------------------------------------------------------

export const blockSchema = z.object({
  hashedIp: z.string().min(8).max(64),
  reason: z.string().max(200).optional().default('manual'),
  ttlSeconds: z.number().int().min(60).max(2592000).optional().default(604800),
})

export const unblockSchema = z.object({
  hashedIp: z.string().min(8).max(64),
})

// ---------------------------------------------------------------------------
// Attacker profile API
// ---------------------------------------------------------------------------

export const getProfileSchema = z.object({
  hashedIp: z.string().min(8).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export const deleteProfileSchema = z.object({
  hashedIp: z.string().min(8).max(64),
})

// ---------------------------------------------------------------------------
// Security settings API
// ---------------------------------------------------------------------------

export const securitySettingsSchema = z.object({
  honeytokensEnabled: z.boolean().optional(),
  rateLimitEnabled: z.boolean().optional(),
  robotsTrapEnabled: z.boolean().optional(),
  entropyInjectionEnabled: z.boolean().optional(),
  suspiciousUaBlockingEnabled: z.boolean().optional(),
  sessionBindingEnabled: z.boolean().optional(),
  maxAlertsStored: z.number().int().min(10).max(10000).optional(),
  tarpitMinMs: z.number().int().min(0).max(30000).optional(),
  tarpitMaxMs: z.number().int().min(0).max(60000).optional(),
  sessionTtlSeconds: z.number().int().min(300).max(86400).optional(),
  threatScoringEnabled: z.boolean().optional(),
  zipBombEnabled: z.boolean().optional(),
  alertingEnabled: z.boolean().optional(),
  hardBlockEnabled: z.boolean().optional(),
  autoBlockThreshold: z.number().int().min(3).max(50).optional(),
})

// ---------------------------------------------------------------------------
// Helper: validate and return first error message
// ---------------------------------------------------------------------------

/**
 * Validate input against a Zod schema.
 * Returns `{ success: true, data }` or `{ success: false, error: string }`.
 */
export function validate<T>(schema: z.ZodType<T>, input: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(input)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstIssue = result.error.issues[0]
  return { success: false, error: firstIssue?.message || 'Validation failed' }
}
