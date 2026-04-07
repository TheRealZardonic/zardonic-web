import { createGzip } from 'node:zlib'
import { Readable } from 'node:stream'

interface VercelLikeResponse {
  setHeader(key: string, value: string | number): VercelLikeResponse
  status(code: number): VercelLikeResponse
  send(data: unknown): VercelLikeResponse
}

// 10 MB of null bytes, gzip-compressed at maximum compression.
// The compressed buffer is sent as raw application/zip without Content-Encoding
// so that the bot's own ZIP decoder (not the HTTP layer) handles decompression,
// producing the full 10 MB in the bot's memory.
let ZIP_BOMB_BUFFER: Buffer | null = null

// 1×1 transparent PNG — silent fallback when ZIP_BOMB_BUFFER is unavailable
const FALLBACK_PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQAB' +
  'Nl7BcQAAAABJRU5ErkJggg==',
  'base64'
)

function getZipBombBuffer(): Promise<Buffer> {
  if (ZIP_BOMB_BUFFER) return Promise.resolve(ZIP_BOMB_BUFFER)
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const gz = createGzip({ level: 9 })
    const total = 10 * 1024 * 1024
    let sent = 0
    const chunkSize = 65536
    const source = new Readable({
      read() {
        // Push one chunk at a time when requested by the stream
        if (sent >= total) {
          this.push(null)
          return
        }
        const size = Math.min(chunkSize, total - sent)
        this.push(Buffer.alloc(size, 0))
        sent += size
      }
    })
    source.pipe(gz)
    gz.on('data', (c: Buffer) => chunks.push(c))
    gz.on('end', () => {
      ZIP_BOMB_BUFFER = Buffer.concat(chunks)
      resolve(ZIP_BOMB_BUFFER)
    })
    gz.on('error', reject)
  })
}

/**
 * Serve a zip-bomb response to the requester.
 *
 * The response is served as a raw `application/zip` payload without
 * `Content-Encoding`, so HTTP clients pass it through unchanged.  Bots that
 * attempt to unzip the file will expand it to 10 MB of nulls, wasting their
 * memory and CPU.  Browsers that don't auto-decompress ZIP files are
 * unaffected — they simply download an opaque file.
 *
 * ONLY call this for confirmed bots/attackers — never for legitimate traffic.
 */
export async function serveZipBomb(res: VercelLikeResponse): Promise<unknown> {
  try {
    const bomb = await getZipBombBuffer()
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', 'attachment; filename="data.zip"')
    res.setHeader('Content-Length', bomb.length)
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.status(200).send(bomb)
  } catch {
    // ZIP generation failed — return a silent 1×1 pixel so the caller
    // still receives a valid HTTP response without leaking error details.
    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(FALLBACK_PIXEL)
  }
}
