const DB_NAME = 'zardonic-image-cache'
const STORE_NAME = 'images'
const DB_VERSION = 1
const MAX_DIMENSION = 1200
const JPEG_QUALITY = 0.8

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getCached(key: string): Promise<string | null> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const req = store.get(key)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function setCached(key: string, value: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      store.put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
  } catch {
    // silently fail
  }
}

function compressImage(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  let { width, height } = img

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height)
    width = Math.round(width * ratio)
    height = Math.round(height * ratio)
  }

  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return img.src
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY)
}

interface WsrvOptions {
  w?: number;
  h?: number;
  q?: number;
  output?: 'webp' | 'jpeg' | 'png' | 'gif';
}

function appendWsrvOptions(baseUrl: string, options?: WsrvOptions): string {
  if (!options) return baseUrl;

  const params = new URLSearchParams();
  if (options.w) params.append('w', options.w.toString());
  if (options.h) params.append('h', options.h.toString());
  if (options.q) params.append('q', options.q.toString());
  if (options.output) params.append('output', options.output);

  const queryString = params.toString();
  if (!queryString) return baseUrl;

  return baseUrl.includes('?')
    ? `${baseUrl}&${queryString}`
    : `${baseUrl}?${queryString}`;
}

/**
 * Transform any image URL into a wsrv.nl-proxied URL to bypass CORS restrictions
 * and provide CDN caching.
 *
 * Special handling for Google Drive share links and lh3 CDN URLs:
 *   - /file/d/{id}/view        → wsrv.nl/?url=lh3.../{id}
 *   - /open?id={id}            → wsrv.nl/?url=lh3.../{id}
 *   - /uc?export=view&id={id}  → wsrv.nl/?url=lh3.../{id}
 *   - lh3.googleusercontent.com/d/{id} → wsrv.nl/?url=lh3.../{id}
 *
 * All other external http/https URLs are wrapped as:
 *   - https://wsrv.nl/?url=<encoded-url>
 *
 * Data URLs, relative paths and already-proxied URLs are returned as-is.
 * Returns empty string for null/undefined/empty input.
 */
export function toDirectImageUrl(url: string | null | undefined, options?: WsrvOptions): string {
  // Default to webp and quality 80 for all proxied images
  const finalOptions = { output: 'webp' as const, q: 80, ...(options || {}) };

  // Handle null, undefined, or empty string
  if (!url) return ''

  // Data URLs and relative paths — return as-is
  if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('.')) return url

  // Already proxied through wsrv.nl — avoid double-wrapping, but append new options if needed
  if (url.startsWith('https://wsrv.nl/')) {
    // If it already has query parameters, we need to append carefully to not override 'url'
    return appendWsrvOptions(url, finalOptions);
  }

  let proxyUrl = '';

  // Google Drive: /file/d/{fileId}/view  →  wsrv.nl proxy via lh3
  const driveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/?#]+)/)
  if (driveFileMatch) {
    proxyUrl = `https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/${driveFileMatch[1]}`
  }
  // Google Drive: open?id={fileId}
  else if (url.match(/drive\.google\.com\/open\?id=([^&#]+)/)) {
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&#]+)/)
    proxyUrl = `https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/${driveOpenMatch![1]}`
  }
  // Google Drive: uc?export=view&id={fileId}
  else if (url.match(/drive\.google\.com\/uc\?[^#]*?id=([^&#]+)/)) {
    const driveUcMatch = url.match(/drive\.google\.com\/uc\?[^#]*?id=([^&#]+)/)
    proxyUrl = `https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/${driveUcMatch![1]}`
  }
  // lh3.googleusercontent.com/d/{id} URL
  else if (url.match(/lh3\.googleusercontent\.com\/d\/([^/?#]+)/)) {
    const lh3Match = url.match(/lh3\.googleusercontent\.com\/d\/([^/?#]+)/)
    proxyUrl = `https://wsrv.nl/?url=https://lh3.googleusercontent.com/d/${lh3Match![1]}`
  }
  // All other external http/https URLs → proxy through wsrv.nl to fix CORS
  else if (url.startsWith('http://') || url.startsWith('https://')) {
    proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}`
  }

  if (proxyUrl) {
    return appendWsrvOptions(proxyUrl, finalOptions);
  }

  return url
}

/**
 * Load image element via wsrv.nl proxy (all external URLs are already wrapped).
 * No further server-side fallback is attempted since wsrv.nl handles CORS for
 * every external host.
 */
function loadImageElement(url: string): Promise<HTMLImageElement> {
  const directUrl = toDirectImageUrl(url)

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = directUrl
  })
}

/**
 * Loads an image from a URL, compresses it, and caches the result in IndexedDB.
 * Returns a data URL (from cache on subsequent calls).
 * All external URLs are proxied through wsrv.nl to bypass CORS restrictions.
 */
export async function cacheImage(url: string): Promise<string> {
  const cached = await getCached(url)
  if (cached) return cached

  try {
    const img = await loadImageElement(url)
    const compressed = compressImage(img)
    await setCached(url, compressed)
    return compressed
  } catch (error) {
    console.warn('Failed to cache image:', url, error)
    return url
  }
}

/**
 * Prepares an image URL for use, triggering background caching if needed.
 * All external http/https URLs are proxied through wsrv.nl to bypass CORS.
 * Data URLs are returned directly.
 */
export function prepareImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // If it's already a data URL, return it directly
  if (url.startsWith('data:')) return url
  
  // For external URLs (including Google Drive), use the direct URL initially
  // Background caching will happen asynchronously
  const directUrl = toDirectImageUrl(url)
  
  // Trigger background caching (don't await)
  cacheImage(url).catch(() => {
    // Silently fail - we'll use the direct URL
  })
  
  return directUrl
}

/**
 * Normalizes an image URL entered by a user in edit mode.
 * Automatically converts Google Drive URLs to wsrv.nl proxy URLs.
 * This should be called when saving image URLs from input fields.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // If it's already a data URL or empty, return it directly
  if (url.startsWith('data:') || !url.trim()) return url
  
  // Convert to direct image URL (Google Drive → wsrv.nl)
  return toDirectImageUrl(url)
}
