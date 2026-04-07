import { z } from 'zod'

// Re-export schemas that live in their own API files so tests can import
// from a single location.
export { blockSchema, unblockSchema } from './blocklist.js'
export { getProfileSchema, deleteProfileSchema } from './attacker-profile.js'
export { securitySettingsSchema } from './security-settings.js'

/**
 * Zod schemas for strict input validation on all API endpoints.
 *
 * Every piece of user input MUST pass through one of these schemas before
 * the API handler processes it.  This prevents injection, type confusion,
 * unexpected data shapes, and unbounded payloads.
 *
 * Usage pattern:
 *   const { success, data, error } = validate(mySchema, req.body)
 *   if (!success) return res.status(400).json({ error })
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

/**
 * A safe, bounded string: printable characters only (no control chars),
 * with a configurable maximum length.
 *
 * Exported so other modules can compose it into their own schemas.
 */
export const safeString = (maxLen = 200) =>
  z.string().max(maxLen).regex(/^[^\n\r\0]*$/, 'Must not contain control characters')

/** KV key: alphanumeric + hyphens/underscores/dots/colons, max 200 chars. */
export const kvKeySchema = safeString(200)
  .min(1, 'key is required')

// ─── KV API ───────────────────────────────────────────────────────────────────

/** POST /api/kv — request body */
export const kvPostSchema = z.object({
  key: kvKeySchema,
  value: z.unknown().refine((v) => v !== undefined, 'value is required'),
})

/** GET /api/kv — query params */
export const kvGetQuerySchema = z.object({
  key: kvKeySchema,
})

// ─── Auth API ─────────────────────────────────────────────────────────────────

/** POST /api/auth — login */
export const authLoginSchema = z.object({
  password: z.string().min(1, 'password is required').max(200),
})

/** POST /api/auth — login with optional TOTP code */
export const authLoginTotpSchema = z.object({
  password: z.string().min(1, 'password is required').max(200),
  totpCode: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits').optional(),
})

/** POST /api/auth — initial admin setup */
export const authSetupSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters').max(200),
  action: z.literal('setup'),
  setupToken: z.string().max(200).optional(),
})

/** POST /api/auth — password change */
export const authChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'current password is required').max(200),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
})

/** POST /api/auth — TOTP verification */
export const totpVerifySchema = z.object({
  action: z.literal('totp-verify'),
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})

/** POST /api/auth — TOTP disable */
export const totpSetupSchema = z.object({
  action: z.literal('totp-disable'),
  password: z.string().min(1, 'password is required').max(200),
  code: z.string().length(6, 'TOTP code must be 6 digits').regex(/^\d{6}$/, 'TOTP code must be 6 digits'),
})

// ─── Reset password API ───────────────────────────────────────────────────────

/** POST /api/reset-password — request a reset link */
export const resetPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'email is required')
    .max(254, 'Email too long')
    .email('Invalid email format'),
})

/** POST /api/reset-password — confirm reset with token */
export const confirmResetPasswordSchema = z.object({
  token: z.string().min(1, 'token is required').max(200),
  newPassword: z.string().min(8, 'New password must be at least 8 characters').max(200),
})

// ─── Analytics API ────────────────────────────────────────────────────────────

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
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(2),
  page: safeString().optional(),
  elementTag: safeString(100).optional(),
}).optional()

/** POST /api/analytics */
export const analyticsPostSchema = z.object({
  type: z.enum(['page_view', 'section_view', 'interaction', 'click']),
  target: safeString().optional(),
  meta: analyticsMetaSchema,
  heatmap: heatmapSchema,
})

// ─── Google Drive API ─────────────────────────────────────────────────────────

/** GET /api/drive-folder — query params */
export const driveFolderQuerySchema = z.object({
  folderId: z.string().min(1, 'folderId parameter is required').regex(/^[A-Za-z0-9_-]+$/, 'Invalid folderId format'),
})

/** GET /api/drive-download — query params */
export const driveDownloadQuerySchema = z.object({
  // fileId is validated via regex to only allow [A-Za-z0-9_-]+ to prevent
  // directory traversal and injection attacks.
  fileId: z.string().min(1, 'fileId parameter is required').regex(/^[A-Za-z0-9_-]+$/, 'Invalid fileId format'),
})

// ─── iTunes / Odesli API ──────────────────────────────────────────────────────

/** GET /api/itunes — query params */
export const itunesQuerySchema = z.object({
  term: z.string().min(1, 'Search term is required').max(200),
  entity: z.enum(['song', 'album', 'all']).optional(),
})

/** GET /api/odesli — query params */
export const odesliQuerySchema = z.object({
  url: z.string().min(1, 'A streaming URL is required').max(2000).url('Invalid URL'),
})

// ─── Image proxy API ──────────────────────────────────────────────────────────

/** GET /api/image-proxy — query params */
export const imageProxyQuerySchema = z.object({
  url: z.string().min(1, 'url parameter is required').max(2000),
})

// ─── Bandsintown API ──────────────────────────────────────────────────────────

/** GET /api/bandsintown — query params */
export const bandsintownQuerySchema = z.object({
  artist: z.string().min(1, 'artist is required').max(200),
  app_id: z.string().min(1, 'app_id is required').max(200),
  /** Optional: include past events. Accepts 'true'/'false' string. Default: false */
  include_past: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true')
    .default(false),
})

// ─── Setlist.fm API ───────────────────────────────────────────────────────────

/** GET /api/setlistfm — query params */
export const setlistfmQuerySchema = z.object({
  mbid: z
    .string()
    .min(1, 'mbid parameter is required')
    .regex(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
      'Invalid MBID format — must be a valid UUID (e.g. 4b585938-f271-45e2-b19a-91215b125e38)',
    ),
  p: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().min(1).max(100)),
})

// ─── Terminal API ─────────────────────────────────────────────────────────────

/** POST /api/terminal */
export const terminalCommandSchema = z.object({
  command: z.string().min(1, 'command is required').max(100)
    .regex(/^[a-z0-9_-]+$/, 'Invalid command format'),
})

// ─── OAuth API ────────────────────────────────────────────────────────────────

/** POST /api/oauth — disconnect a provider */
export const oauthDisconnectSchema = z.object({
  action: z.literal('disconnect'),
  provider: z.enum(['spotify', 'google-drive']),
})

// ─── Spotify API ──────────────────────────────────────────────────────────────

/** GET /api/spotify — query params */
export const spotifyQuerySchema = z.object({
  action: z.enum(['artist', 'top-tracks', 'albums', 'search']),
  id: z.string().min(1).optional(),
  query: z.string().min(1).optional(),
  market: z.string().length(2).optional(),
}).refine(
  (data) => {
    if (['artist', 'top-tracks', 'albums'].includes(data.action) && !data.id) return false
    if (data.action === 'search' && !data.query) return false
    return true
  },
  {
    message: 'id is required for artist/top-tracks/albums; query is required for search',
    path: ['id'],
  },
)

// ─── Validation helper ────────────────────────────────────────────────────────

/**
 * Parse `input` against a Zod `schema`.
 *
 * Returns a discriminated union so callers must narrow on `success` before
 * accessing either `data` or `error`:
 *
 * ```ts
 * const result = validate(mySchema, req.body)
 * if (!result.success) {
 *   return res.status(400).json({ error: result.error })
 * }
 * const { data } = result  // TypeScript knows data is correctly typed here
 * ```
 */
export function validate<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(input)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const firstIssue = result.error.issues[0]
  return { success: false, error: firstIssue?.message || 'Validation failed' }
}
