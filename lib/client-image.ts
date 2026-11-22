const MAX_SOURCE_BYTES = 20 * 1024 * 1024
const MAX_OUTPUT_BYTES = 1_900 * 1024
const MAX_PIXELS = 40_000_000
const MAX_EDGE = 1600
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('This image could not be prepared. Try another image.')), 'image/jpeg', quality)
  })
}

export async function prepareRegistrationImage(file: File): Promise<File> {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error('Choose a JPEG, PNG or WebP image.')
  if (file.size > MAX_SOURCE_BYTES) throw new Error('Choose an image smaller than 20 MB.')

  let image: ImageBitmap
  try {
    image = await createImageBitmap(file)
  } catch {
    throw new Error('This image could not be opened. Try another image.')
  }

  try {
    if (image.width * image.height > MAX_PIXELS) throw new Error('This image is too large to process. Choose a smaller image.')
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
    let width = Math.max(1, Math.round(image.width * scale))
    let height = Math.max(1, Math.round(image.height * scale))
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image preparation is unavailable in this browser.')

    for (let resizeAttempt = 0; resizeAttempt < 4; resizeAttempt += 1) {
      canvas.width = width
      canvas.height = height
      context.clearRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      for (const quality of [0.88, 0.8, 0.72, 0.64, 0.56]) {
        const blob = await canvasBlob(canvas, quality)
        if (blob.size <= MAX_OUTPUT_BYTES) {
          const basename = file.name.replace(/\.[^.]+$/, '').slice(0, 100) || 'registration-image'
          return new File([blob], `${basename}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
        }
      }
      width = Math.max(1, Math.round(width * 0.8))
      height = Math.max(1, Math.round(height * 0.8))
    }
    throw new Error('This image could not be reduced enough. Choose a smaller or clearer image.')
  } finally {
    image.close()
  }
}
