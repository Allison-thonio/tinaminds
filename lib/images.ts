import sharp from 'sharp'

export class ImageError extends Error {
  constructor(public readonly status: 415 | 400, message: string) {
    super(message)
  }
}

export const MAX_FILE_BYTES = 2 * 1024 * 1024

export function sniffImage(buf: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg'
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  return null
}

export async function processImage(buf: Buffer, maxEdge: number): Promise<Buffer> {
  if (buf.length > MAX_FILE_BYTES) throw new ImageError(400, 'File too large')
  if (!sniffImage(buf)) throw new ImageError(415, 'Unsupported file type')
  try {
    return await sharp(buf, { limitInputPixels: 40_000_000, failOn: 'error' })
      .rotate()
      .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer()
  } catch {
    throw new ImageError(415, 'File could not be read as an image')
  }
}
