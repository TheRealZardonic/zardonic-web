const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000
const DEFAULT_TIMEOUT_MS = 15_000 // 15 seconds — prevents indefinitely stalled upstream fetches

/**
 * Fetch a URL with automatic retry on HTTP 429 (Too Many Requests) and a
 * configurable per-attempt timeout via AbortController.
 * Respects the Retry-After response header when present; otherwise uses
 * exponential backoff (1 s, 2 s, 4 s …).
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options ?? {}
  let attempt = 0
  while (true) {
    // A fresh AbortController is created for every attempt so that a timed-out
    // attempt does not cancel the subsequent retry.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    let response: Response
    try {
      response = await fetch(url, { ...fetchOptions, signal: controller.signal })
    } finally {
      clearTimeout(timeoutId)
    }

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
