import { logSecurityEvent } from './_security-logger.js'

/**
 * Scanner & Attack-Tool Detection Module.
 *
 * Identifies automated attack tools at request time through two layers:
 *
 * 1. **User-Agent signature matching** — 50+ known tools across 7 categories.
 *    High-confidence positives are logged immediately as SCANNER_DETECTED.
 *
 * 2. **Behavioral analysis** — catches custom/stripped UAs by scoring the
 *    absence of headers that legitimate browsers always send (Accept-Language,
 *    Accept, Referer), plus known proxy-tool artifacts.
 *
 * The returned `ScannerProfile.threatMultiplier` is applied to every threat
 * score increment for that request so aggressiveness is always proportional:
 * - sqlmap, Metasploit, Hydra → ×3 multiplier
 * - Nikto, Nuclei, Burp Scanner → ×2.5 multiplier
 * - FFuf, Gobuster → ×2 multiplier
 * - curl scripts, python-requests → ×1.2–1.5 multiplier
 */

export type ScannerCategory =
  | 'EXPLOIT_FRAMEWORK'  // SQLMap, Metasploit, Commix, Havij
  | 'SCANNER'            // Nikto, Nessus, Acunetix, Nuclei, Burp Scanner
  | 'FUZZER'             // FFuf, Wfuzz, Gobuster, Feroxbuster, Dirbuster
  | 'RECON_TOOL'         // Nmap NSE, Masscan, WhatWeb, Shodan
  | 'BRUTE_FORCER'       // Hydra, Medusa, Ncrack, THC-Hydra
  | 'PROXY_TOOL'         // Burp Suite proxy, OWASP ZAP, Fiddler
  | 'CRAWLER'            // curl scripts, python-requests, scripted clients
  | 'UNKNOWN_BOT'        // Behaviorally suspicious, no known signature

export interface ScannerProfile {
  /** True when a known scanner was positively identified. */
  detected: boolean
  /** Canonical tool name (e.g. 'sqlmap', 'Nikto'). Null for clean requests. */
  toolName: string | null
  /** Tool category driving countermeasure routing. */
  category: ScannerCategory | null
  /** How confident the detection is. */
  confidence: 'high' | 'medium' | 'low'
  /** Multiply all threat score increments for this request by this factor. */
  threatMultiplier: number
  /** Human-readable list of detection signals (for the security log). */
  signals: string[]
}

// ─── Tool Signature Database ──────────────────────────────────────────────────

interface ToolSignature {
  name: string
  category: ScannerCategory
  pattern: RegExp
  threatMultiplier: number
}

/**
 * 50+ known attack tool signatures sorted by threat severity (most dangerous
 * first so the highest-multiplier match wins on early return).
 */
const TOOL_SIGNATURES: ToolSignature[] = [
  // ── Exploit Frameworks (multiplier ×3) ─────────────────────────────────────
  { name: 'sqlmap',            category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /sqlmap/i },
  { name: 'Havij',             category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /havij/i },
  { name: 'Commix',            category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /commix/i },
  { name: 'Sqlninja',          category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /sqlninja/i },
  { name: 'JSQL Injection',    category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /jsql-injection/i },
  { name: 'bbqSQL',            category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /bbqsql/i },
  { name: 'Metasploit',        category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /metasploit|msfconsole/i },
  { name: 'Exploit-DB',        category: 'EXPLOIT_FRAMEWORK', threatMultiplier: 3,   pattern: /exploit-db/i },
  // ── Brute Forcers (multiplier ×3) ─────────────────────────────────────────
  { name: 'Hydra',             category: 'BRUTE_FORCER',      threatMultiplier: 3,   pattern: /hydra/i },
  { name: 'Medusa',            category: 'BRUTE_FORCER',      threatMultiplier: 3,   pattern: /medusa\//i },
  { name: 'Ncrack',            category: 'BRUTE_FORCER',      threatMultiplier: 3,   pattern: /ncrack/i },
  // ── Vulnerability Scanners (multiplier ×2–2.5) ────────────────────────────
  { name: 'Nikto',             category: 'SCANNER',           threatMultiplier: 2.5, pattern: /nikto/i },
  { name: 'Nuclei',            category: 'SCANNER',           threatMultiplier: 2.5, pattern: /nuclei\//i },
  { name: 'Burp Scanner',      category: 'SCANNER',           threatMultiplier: 2.5, pattern: /burp|burpsuite/i },
  { name: 'OWASP ZAP',         category: 'PROXY_TOOL',        threatMultiplier: 2.5, pattern: /OWASP_ZAP|zaproxy|ZAP\//i },
  { name: 'Nessus',            category: 'SCANNER',           threatMultiplier: 2,   pattern: /nessus/i },
  { name: 'Acunetix',          category: 'SCANNER',           threatMultiplier: 2,   pattern: /acunetix/i },
  { name: 'Qualys',            category: 'SCANNER',           threatMultiplier: 2,   pattern: /qualysguard|qualys/i },
  { name: 'AppScan',           category: 'SCANNER',           threatMultiplier: 2,   pattern: /appscan/i },
  { name: 'W3af',              category: 'SCANNER',           threatMultiplier: 2,   pattern: /w3af\.sourceforge/i },
  { name: 'OpenVAS',           category: 'SCANNER',           threatMultiplier: 2,   pattern: /openvas/i },
  { name: 'Skipfish',          category: 'SCANNER',           threatMultiplier: 2,   pattern: /skipfish/i },
  { name: 'Vega',              category: 'SCANNER',           threatMultiplier: 2,   pattern: /subgraph vega/i },
  { name: 'Arachni',           category: 'SCANNER',           threatMultiplier: 2,   pattern: /arachni/i },
  { name: 'Wapiti',            category: 'SCANNER',           threatMultiplier: 2,   pattern: /wapiti/i },
  { name: 'Netsparker',        category: 'SCANNER',           threatMultiplier: 2,   pattern: /netsparker/i },
  { name: 'IronWASP',          category: 'SCANNER',           threatMultiplier: 2,   pattern: /ironwasp/i },
  { name: 'Vulscan',           category: 'SCANNER',           threatMultiplier: 2,   pattern: /vulscan/i },
  { name: 'XSStrike',          category: 'SCANNER',           threatMultiplier: 2,   pattern: /xsstrike/i },
  // ── Fuzzers & Directory Brute-Forcers (multiplier ×2) ────────────────────
  { name: 'FFuf',              category: 'FUZZER',            threatMultiplier: 2,   pattern: /ffuf/i },
  { name: 'Wfuzz',             category: 'FUZZER',            threatMultiplier: 2,   pattern: /wfuzz/i },
  { name: 'Gobuster',          category: 'FUZZER',            threatMultiplier: 2,   pattern: /gobuster/i },
  { name: 'Dirb',              category: 'FUZZER',            threatMultiplier: 2,   pattern: /^dirb$/i },
  { name: 'Dirbuster',         category: 'FUZZER',            threatMultiplier: 2,   pattern: /dirbuster|DirBuster/i },
  { name: 'Feroxbuster',       category: 'FUZZER',            threatMultiplier: 2,   pattern: /feroxbuster/i },
  { name: 'Arjun',             category: 'FUZZER',            threatMultiplier: 2,   pattern: /arjun/i },
  { name: 'Kiterunner',        category: 'FUZZER',            threatMultiplier: 2,   pattern: /kiterunner/i },
  { name: 'Rustbuster',        category: 'FUZZER',            threatMultiplier: 2,   pattern: /rustbuster/i },
  { name: 'Katana',            category: 'FUZZER',            threatMultiplier: 2,   pattern: /katana/i },
  // ── Recon Tools (multiplier ×1.5–2) ──────────────────────────────────────
  { name: 'Nmap NSE',          category: 'RECON_TOOL',        threatMultiplier: 2,   pattern: /nmap/i },
  { name: 'Masscan',           category: 'RECON_TOOL',        threatMultiplier: 2,   pattern: /masscan/i },
  { name: 'WhatWeb',           category: 'RECON_TOOL',        threatMultiplier: 1.5, pattern: /whatweb/i },
  { name: 'Wappalyzer',        category: 'RECON_TOOL',        threatMultiplier: 1.5, pattern: /wappalyzer/i },
  { name: 'Shodan',            category: 'RECON_TOOL',        threatMultiplier: 1.5, pattern: /shodan/i },
  { name: 'CensysInspect',     category: 'RECON_TOOL',        threatMultiplier: 1.5, pattern: /censys/i },
  // ── Scripted Clients (multiplier ×1.2–1.5) ────────────────────────────────
  { name: 'python-requests',   category: 'CRAWLER',           threatMultiplier: 1.5, pattern: /python-requests/i },
  { name: 'python-urllib',     category: 'CRAWLER',           threatMultiplier: 1.5, pattern: /python-urllib/i },
  { name: 'libwww-perl',       category: 'CRAWLER',           threatMultiplier: 1.5, pattern: /libwww-perl/i },
  { name: 'LWP',               category: 'CRAWLER',           threatMultiplier: 1.5, pattern: /LWP::Simple|LWP\/\d/i },
  { name: 'WWW-Mechanize',     category: 'CRAWLER',           threatMultiplier: 1.5, pattern: /WWW-Mechanize/i },
  { name: 'Scrapy',            category: 'CRAWLER',           threatMultiplier: 1.5, pattern: /scrapy/i },
  { name: 'Go-http-client',    category: 'CRAWLER',           threatMultiplier: 1.2, pattern: /^Go-http-client\//i },
  { name: 'Java-http-client',  category: 'CRAWLER',           threatMultiplier: 1.2, pattern: /^Java\//i },
  { name: 'curl-script',       category: 'CRAWLER',           threatMultiplier: 1.2, pattern: /^curl\//i },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface VercelLikeRequest {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
}

function getHeader(req: VercelLikeRequest, name: string): string {
  const val = req.headers[name.toLowerCase()]
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

// ─── Core Detection ───────────────────────────────────────────────────────────

/**
 * Synchronously identify the attack tool making this request.
 *
 * Returns a `ScannerProfile` with full context for countermeasure routing.
 * Never throws — on any error returns a clean "not detected" profile.
 */
export function detectScanner(req: VercelLikeRequest): ScannerProfile {
  const ua = getHeader(req, 'user-agent')
  const accept = getHeader(req, 'accept')
  const acceptLang = getHeader(req, 'accept-language')
  const signals: string[] = []

  // ── Layer 1: User-Agent signature matching ──────────────────────────────────
  for (const sig of TOOL_SIGNATURES) {
    if (sig.pattern.test(ua)) {
      signals.push(`UA_SIGNATURE:${sig.name}`)
      return {
        detected: true,
        toolName: sig.name,
        category: sig.category,
        confidence: 'high',
        threatMultiplier: sig.threatMultiplier,
        signals,
      }
    }
  }

  // ── Layer 2: Behavioral heuristics ─────────────────────────────────────────
  let score = 0

  if (!acceptLang) {
    // Browsers always send Accept-Language
    signals.push('MISSING_ACCEPT_LANGUAGE')
    score += 2
  }
  if (!accept) {
    // Browsers always send Accept
    signals.push('MISSING_ACCEPT')
    score += 2
  } else if (accept === '*/*') {
    // Generic Accept is a scripted-client tell
    signals.push('GENERIC_ACCEPT')
    score += 1
  }
  if (!ua) {
    signals.push('MISSING_USER_AGENT')
    score += 3
  }
  // Burp Suite proxy leaves characteristic headers in some configs
  if (getHeader(req, 'x-custom-ip-authorization') || getHeader(req, 'x-forwarded-scheme')) {
    signals.push('PROXY_TOOL_ARTIFACT')
    score += 2
  }

  if (score >= 4) {
    return {
      detected: true,
      toolName: 'Unknown Bot',
      category: 'UNKNOWN_BOT',
      confidence: score >= 6 ? 'high' : 'medium',
      threatMultiplier: 1.5,
      signals,
    }
  }
  if (score >= 2) {
    return {
      detected: false,
      toolName: null,
      category: null,
      confidence: 'low',
      threatMultiplier: 1.2,
      signals,
    }
  }

  return { detected: false, toolName: null, category: null, confidence: 'low', threatMultiplier: 1, signals: [] }
}

/**
 * Detect scanner and write a structured SCANNER_DETECTED event to the
 * unified security log.  Returns the profile for countermeasure routing.
 * Never throws.
 */
export async function detectAndLogScanner(
  req: VercelLikeRequest,
  hashedIp: string,
  userAgent: string,
): Promise<ScannerProfile> {
  let profile: ScannerProfile
  try {
    profile = detectScanner(req)
  } catch {
    return { detected: false, toolName: null, category: null, confidence: 'low', threatMultiplier: 1, signals: [] }
  }

  if (profile.detected) {
    await logSecurityEvent({
      event: 'SCANNER_DETECTED',
      severity: profile.category === 'EXPLOIT_FRAMEWORK' || profile.category === 'BRUTE_FORCER' ? 'critical' : 'high',
      hashedIp,
      userAgent,
      method: req.method,
      url: req.url,
      countermeasure: 'SCANNER_IDENTIFIED',
      details: {
        toolName: profile.toolName,
        category: profile.category,
        confidence: profile.confidence,
        threatMultiplier: profile.threatMultiplier,
        signals: profile.signals,
      },
    })
  }

  return profile
}
