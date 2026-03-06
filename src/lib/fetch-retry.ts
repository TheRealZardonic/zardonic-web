const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

/**
 * Fetch a URL with automatic retry when the server responds with HTTP 429
 * (Too Many Requests). Respects the `Retry-After` response header when present;
 * otherwise uses exponential backoff (1 s, 2 s, 4 s …).
 */
export async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let attempt = 0
  while (true) {
    const response = await fetch(input, init)
    if (response.status !== 429 || attempt >= MAX_RETRIES) {
      return response
    }
    const retryAfter = response.headers.get('Retry-After')
    let delayMs: number
    if (retryAfter) {
      const seconds = parseFloat(retryAfter)
      if (!isNaN(seconds)) {
        delayMs = seconds * 1000
      } else {
        const retryDate = new Date(retryAfter).getTime()
        delayMs = isNaN(retryDate) ? BASE_DELAY_MS * Math.pow(2, attempt) : Math.max(0, retryDate - Date.now())
      }
    } else {
      delayMs = BASE_DELAY_MS * Math.pow(2, attempt)
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs))
    attempt++
  }
}
