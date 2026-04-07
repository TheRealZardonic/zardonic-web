import { Redis } from '@upstash/redis'
const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || ''
})

/**
 * Canary fingerprint script endpoint.
 *
 * Serves the browser-side tracking JavaScript for canary documents as an
 * *external* same-origin script so it is allowed by `Content-Security-Policy:
 * script-src 'self'`.  Inline `<script>` tags are blocked by CSP, but
 * `<script src="/api/canary-script?t=TOKEN">` is a same-origin external
 * resource and is explicitly permitted.
 *
 * GET /api/canary-script?t=<32-char hex token>
 *
 * Security properties:
 * - Token must be a valid 32-char hex string (128 bits of entropy)
 * - Token must exist in KV (proves a canary document was actually served)
 * - The script only phones home to /api/canary-callback — same origin
 * - No secrets are embedded; the response is not cacheable
 */

const CANARY_TOKEN_PREFIX = 'nk-canary:'

interface VercelRequest {
  method?: string
  query?: Record<string, string | string[]>
  headers: Record<string, string | string[] | undefined>
}

interface VercelResponse {
  setHeader(key: string, value: string): VercelResponse
  status(code: number): VercelResponse
  end(): VercelResponse
  send(data: unknown): VercelResponse
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).end()
    return
  }

  const token = req.query?.t
  if (!token || typeof token !== 'string' || !/^[a-f0-9]{32}$/.test(token)) {
    res.status(404).end()
    return
  }

  // Verify the token exists in KV — prevents serving scripts for
  // non-existent tokens and confirms a real canary document was served.
  try {
    const tokenData = await kv.get(`${CANARY_TOKEN_PREFIX}${token}`)
    if (!tokenData) {
      res.status(404).end()
      return
    }
  } catch (err) {
    // KV failure — serve the script anyway (fail open for tracking purposes).
    // Refusing here would tip off the attacker that something is unusual.
    // Log so operators can investigate KV availability issues.
    console.error('[SECURITY:CANARY_SCRIPT_KV_FAIL]', JSON.stringify({
      timestamp: new Date().toISOString(),
      event: 'CANARY_SCRIPT_KV_FAIL',
      token,
      error: (err as Error).message,
    }))
  }

  const callbackUrl = `/api/canary-callback?t=${token}`

  // Fingerprinting script:
  //   1. Collects browser metadata (timezone, language, platform, screen, …)
  //   2. Performs canvas fingerprinting for cross-session correlation
  //   3. Uses WebRTC STUN to discover the real IP behind VPN/proxy
  //   4. Posts all collected data to the canary callback endpoint
  const script = `(function(){
  var d={t:"${token}",ts:Date.now(),tz:Intl.DateTimeFormat().resolvedOptions().timeZone,
    lang:navigator.language,plat:navigator.platform,cores:navigator.hardwareConcurrency||0,
    mem:navigator.deviceMemory||0,sw:screen.width,sh:screen.height,cd:screen.colorDepth,
    touch:'ontouchstart'in window};
  try{var c=document.createElement('canvas');var g=c.getContext('2d');
    g.textBaseline='top';g.font='14px Arial';g.fillText('fp',2,2);
    d.cvs=c.toDataURL().slice(-32)}catch(e){}
  try{var r=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.services.mozilla.com'}]});
    r.createDataChannel('');r.createOffer().then(function(o){r.setLocalDescription(o)});
    r.onicecandidate=function(e){if(e.candidate){
      var m=e.candidate.candidate.match(/([0-9]{1,3}(\\.[0-9]{1,3}){3})/);
      if(m){d.realIp=m[1];send()}}}}catch(e){}
  function send(){var x=new XMLHttpRequest();x.open('POST',"${callbackUrl}&e=js");
    x.setRequestHeader('Content-Type','application/json');x.send(JSON.stringify(d))}
  setTimeout(send,2000);
})();`

  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.status(200).send(script)
}
