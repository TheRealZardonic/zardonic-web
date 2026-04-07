/**
 * @file security-settings-types.ts
 *
 * Canonical type definitions and client-side defaults for the security settings
 * feature.
 *
 * WHY a dedicated module: `SecuritySettings` and `DEFAULT_SECURITY_SETTINGS` were
 * previously embedded in the 1 155-line `SecuritySettingsDialog.tsx` UI component.
 * This violates Single Responsibility (ISO/IEC 25010 – Maintainability): a
 * presentation-layer file should not be the source-of-truth for domain types.
 *
 * These defaults are CLIENT-SIDE only and are used:
 *   1. As an initial placeholder while the API response loads.
 *   2. As the reset target when the admin clicks "Reset to Defaults".
 *
 * The authoritative defaults live in `api/security-settings.ts` (server-side),
 * which always merges stored values with server defaults before returning. The
 * client never bypasses the API — it uses these values only when the API is
 * unavailable or hasn't responded yet.
 *
 * Architecture Decision: see .github/ARCHITECTURE.md → ADR-004.
 */

// ─── Settings shape ───────────────────────────────────────────────────────────

/**
 * All configurable security settings managed via `/api/security-settings`.
 *
 * Keep this interface in sync with the Zod schema in `api/security-settings.ts`.
 * A type mismatch between frontend and API is caught at TypeScript compile time
 * through the `useSecuritySettings` hook's typed API contract.
 */
export interface SecuritySettings {
  honeytokensEnabled: boolean
  rateLimitEnabled: boolean
  robotsTrapEnabled: boolean
  entropyInjectionEnabled: boolean
  suspiciousUaBlockingEnabled: boolean
  sessionBindingEnabled: boolean
  maxAlertsStored: number
  tarpitMinMs: number
  tarpitMaxMs: number
  sessionTtlSeconds: number
  threatScoringEnabled: boolean
  zipBombEnabled: boolean
  alertingEnabled: boolean
  hardBlockEnabled: boolean
  autoBlockThreshold: number
  underAttackMode: boolean
  // Threat level thresholds — configurable
  warnThreshold: number
  tarpitThreshold: number
  // Threat reason points — configurable
  pointsRobotsViolation: number
  pointsHoneytokenAccess: number
  pointsSuspiciousUa: number
  pointsMissingHeaders: number
  pointsGenericAccept: number
  pointsRateLimitExceeded: number
  // Tarpit & Zip Bomb rules
  tarpitOnWarn: boolean
  tarpitOnSuspiciousUa: boolean
  tarpitOnRobotsViolation: boolean
  tarpitOnHoneytoken: boolean
  tarpitOnBlock: boolean
  zipBombOnBlock: boolean
  zipBombOnHoneytoken: boolean
  zipBombOnRepeatOffender: boolean
  zipBombOnRobotsViolation: boolean
  zipBombOnSuspiciousUa: boolean
  zipBombOnRateLimit: boolean
  // Countermeasures
  sqlBackfireEnabled: boolean
  canaryDocumentsEnabled: boolean
  logPoisoningEnabled: boolean
  // SQL Backfire rules
  sqlBackfireOnScannerDetection: boolean
  sqlBackfireOnHoneytokenAccess: boolean
  // Canary Document rules
  canaryPhoneHomeOnOpen: boolean
  canaryCollectFingerprint: boolean
  canaryAlertOnCallback: boolean
  // Log Poisoning rules
  logPoisonFakeHeaders: boolean
  logPoisonTerminalEscape: boolean
  logPoisonFakePaths: boolean
  // Scanner Detection
  scannerDetectionEnabled: boolean
  // Path Traversal Backfire
  pathTraversalBackfireEnabled: boolean
  pathTraversalServeFakeFiles: boolean
  // Probe Detection & Backfire (XSS / SSTI / SSRF / CMDi / XXE)
  probeDetectionEnabled: boolean
  probeBackfireEnabled: boolean
  // Alert channels — configurable (overrides env vars when set)
  discordWebhookUrl: string
  alertEmail: string
}

// ─── Default values ───────────────────────────────────────────────────────────

/**
 * Client-side defaults used as an immediate placeholder before the API responds.
 *
 * IMPORTANT: These must mirror the server-side DEFAULTS in `api/security-settings.ts`.
 * The server is always authoritative; these exist only to avoid a blank UI flash
 * during the initial load and to provide a reset target on the client.
 */
export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  honeytokensEnabled: true,
  rateLimitEnabled: true,
  robotsTrapEnabled: true,
  entropyInjectionEnabled: true,
  suspiciousUaBlockingEnabled: true,
  sessionBindingEnabled: true,
  maxAlertsStored: 500,
  tarpitMinMs: 3000,
  tarpitMaxMs: 8000,
  sessionTtlSeconds: 14400,
  threatScoringEnabled: true,
  zipBombEnabled: false,
  alertingEnabled: false,
  hardBlockEnabled: true,
  autoBlockThreshold: 12,
  underAttackMode: false,
  // Threat level thresholds
  warnThreshold: 3,
  tarpitThreshold: 7,
  // Threat reason points
  pointsRobotsViolation: 3,
  pointsHoneytokenAccess: 5,
  pointsSuspiciousUa: 4,
  pointsMissingHeaders: 2,
  pointsGenericAccept: 1,
  pointsRateLimitExceeded: 2,
  // Tarpit & Zip Bomb rules — conservative defaults
  tarpitOnWarn: true,
  tarpitOnSuspiciousUa: true,
  tarpitOnRobotsViolation: true,
  tarpitOnHoneytoken: false,
  tarpitOnBlock: false,
  zipBombOnBlock: false,
  zipBombOnHoneytoken: false,
  zipBombOnRepeatOffender: false,
  zipBombOnRobotsViolation: false,
  zipBombOnSuspiciousUa: false,
  zipBombOnRateLimit: false,
  // Countermeasures — OFF until explicitly enabled
  sqlBackfireEnabled: false,
  canaryDocumentsEnabled: false,
  logPoisoningEnabled: false,
  // SQL Backfire rules
  sqlBackfireOnScannerDetection: true,
  sqlBackfireOnHoneytokenAccess: false,
  // Canary Document rules
  canaryPhoneHomeOnOpen: true,
  canaryCollectFingerprint: true,
  canaryAlertOnCallback: true,
  // Log Poisoning rules
  logPoisonFakeHeaders: true,
  logPoisonTerminalEscape: true,
  logPoisonFakePaths: true,
  // Scanner Detection — ON by default (zero false positive rate)
  scannerDetectionEnabled: true,
  // Path Traversal Backfire — OFF until explicitly enabled
  pathTraversalBackfireEnabled: false,
  pathTraversalServeFakeFiles: true,
  // Probe Detection ON, backfire OFF by default
  probeDetectionEnabled: true,
  probeBackfireEnabled: false,
  // Alert channels
  discordWebhookUrl: '',
  alertEmail: '',
}
