import { useMemo } from 'react'

/** Browser + OS parsed from navigator.userAgent */
interface ParsedAgent {
  browser: string
  os: string
}

function parseUserAgent(): ParsedAgent {
  if (typeof navigator === 'undefined') return { browser: 'UNKNOWN', os: 'UNKNOWN' }
  const ua = navigator.userAgent
  let browser = 'UNKNOWN'
  let os = 'UNKNOWN'

  // Browser detection
  if (ua.includes('Firefox/')) {
    const m = ua.match(/Firefox\/([\d.]+)/)
    browser = `FIREFOX.${m?.[1]?.split('.')[0] ?? '?'}`
  } else if (ua.includes('Edg/')) {
    const m = ua.match(/Edg\/([\d.]+)/)
    browser = `EDGE.${m?.[1]?.split('.')[0] ?? '?'}`
  } else if (ua.includes('Chrome/')) {
    const m = ua.match(/Chrome\/([\d.]+)/)
    browser = `CHROME.${m?.[1]?.split('.')[0] ?? '?'}`
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const m = ua.match(/Version\/([\d.]+)/)
    browser = `SAFARI.${m?.[1]?.split('.')[0] ?? '?'}`
  }

  // OS detection
  if (ua.includes('Windows')) os = 'WINDOWS'
  else if (ua.includes('Mac OS X')) os = 'MACOS'
  else if (ua.includes('Linux')) os = 'LINUX'
  else if (ua.includes('Android')) os = 'ANDROID'
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'IOS'

  return { browser, os }
}

/** Map IANA timezone to a short sector-style region label */
function timezoneToSector(): string {
  if (typeof Intl === 'undefined') return 'UNKNOWN'
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return 'UNKNOWN'
    // Map timezone regions to cyberpunk sector labels
    if (tz.startsWith('America/')) {
      if (['America/New_York', 'America/Toronto', 'America/Montreal'].includes(tz)) return 'NA-EAST'
      if (['America/Chicago', 'America/Denver'].includes(tz)) return 'NA-CENTRAL'
      if (['America/Los_Angeles', 'America/Vancouver'].includes(tz)) return 'NA-WEST'
      if (tz.includes('Sao_Paulo') || tz.includes('Buenos_Aires') || tz.includes('Bogota') || tz.includes('Caracas')) return 'SA-EAST'
      return 'NA-REGION'
    }
    if (tz.startsWith('Europe/')) {
      if (['Europe/London', 'Europe/Dublin', 'Europe/Lisbon'].includes(tz)) return 'EU-WEST'
      if (['Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Rome', 'Europe/Vienna', 'Europe/Zurich', 'Europe/Amsterdam', 'Europe/Brussels'].includes(tz)) return 'EU-CENTRAL'
      if (['Europe/Moscow', 'Europe/Kiev', 'Europe/Istanbul', 'Europe/Bucharest', 'Europe/Athens'].includes(tz)) return 'EU-EAST'
      return 'EU-REGION'
    }
    if (tz.startsWith('Asia/')) {
      if (['Asia/Tokyo', 'Asia/Seoul'].includes(tz)) return 'APAC-EAST'
      if (['Asia/Shanghai', 'Asia/Hong_Kong', 'Asia/Taipei'].includes(tz)) return 'APAC-CN'
      if (['Asia/Kolkata', 'Asia/Mumbai'].includes(tz)) return 'APAC-SOUTH'
      if (['Asia/Dubai', 'Asia/Riyadh'].includes(tz)) return 'APAC-WEST'
      return 'APAC-REGION'
    }
    if (tz.startsWith('Australia/') || tz.startsWith('Pacific/')) return 'OCEANIA'
    if (tz.startsWith('Africa/')) return 'AF-REGION'
    return tz.split('/')[0].toUpperCase().slice(0, 10)
  } catch {
    return 'UNKNOWN'
  }
}

/** Generate a short hex session ID from crypto.randomUUID */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  }
  // Fallback using crypto.getRandomValues when randomUUID is unavailable
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(4)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
  }
  // Final fallback for environments without Web Crypto API (SSR)
  return '00000000'
}

/** Get connection downlink speed in Mbps if available */
function getDownlink(): number | null {
  if (typeof navigator === 'undefined') return null
  const conn = (navigator as Navigator & { connection?: { downlink?: number } }).connection
  return conn?.downlink ?? null
}

export interface RealMetrics {
  /** Parsed browser name + major version e.g. "CHROME.131" */
  browser: string
  /** Parsed OS name e.g. "MACOS" */
  os: string
  /** Combined platform string e.g. "CHROME.131 // MACOS" */
  platform: string
  /** Timezone-based region sector e.g. "EU-CENTRAL" */
  sector: string
  /** Short hex session ID (8 chars) */
  sessionId: string
  /** Connection downlink speed in Mbps, or null if unavailable */
  downlink: number | null
  /** Build version from package.json + short git hash */
  buildVersion: string
  /** Whether HTTPS is active */
  isSecure: boolean
  /** TLS connection string e.g. "TLS.1.3 // HTTPS" */
  connectionStatus: string
}

/**
 * Hook that provides real browser/session metrics for authentic HUD display.
 * All values are computed once at mount time and memoized.
 */
export function useRealMetrics(): RealMetrics {
  return useMemo(() => {
    const { browser, os } = parseUserAgent()
    const sector = timezoneToSector()
    const sessionId = generateSessionId()
    const downlink = getDownlink()
    const isSecure = typeof location !== 'undefined' && location.protocol === 'https:'

    // Build version from Vite define (injected at build time)
    const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'
    const gitHash = typeof __GIT_HASH__ !== 'undefined' ? __GIT_HASH__ : 'dev'
    const buildVersion = `${appVersion}.${gitHash}`

    const connectionStatus = isSecure ? 'HTTPS // SECURE' : 'HTTP // LOCAL'

    return {
      browser,
      os,
      platform: `${browser} // ${os}`,
      sector,
      sessionId,
      downlink,
      buildVersion,
      isSecure,
      connectionStatus,
    }
  }, [])
}
