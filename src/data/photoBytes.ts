// 照片 bytes：mime / base64 / magic 檢查與解碼。不碰 API 或快取。

export type PhotoMime = 'image/jpeg' | 'image/png' | 'image/webp'
export type PhotoFailCode = 'bad_mime' | 'bad_base64' | 'bad_magic' | 'decode_failed' | 'img_error'

export type PhotoCheck =
  | { ok: true; mime: PhotoMime; bytes: Uint8Array }
  | { ok: false; code: 'bad_mime' | 'bad_base64' | 'bad_magic'; byteLength: number }

export type PhotoDecoder = (blob: Blob) => Promise<void>

export function normalizePhotoMime(mime: unknown): PhotoMime | null {
  if (typeof mime !== 'string') return null
  const m = mime.trim().toLowerCase()
  if (m === 'image/jpeg' || m === 'image/png' || m === 'image/webp') return m
  return null
}

export function decodeBase64(data: string): Uint8Array | null {
  if (typeof data !== 'string') return null
  if (data.length === 0) return null
  if (data.length % 4 !== 0) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null
  let bin: string
  try {
    bin = atob(data)
  } catch {
    return null
  }
  if (bin.length === 0) return null
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function magicMatches(bytes: Uint8Array, mime: PhotoMime): boolean {
  if (mime === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  }
  if (mime === 'image/png') {
    return bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  }
  if (mime === 'image/webp') {
    return (
      bytes.length >= 12
      && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    )
  }
  return false
}

export function validatePhotoPayload(mime: unknown, data: unknown): PhotoCheck {
  const normalized = normalizePhotoMime(mime)
  if (!normalized) return { ok: false, code: 'bad_mime', byteLength: 0 }
  if (typeof data !== 'string') return { ok: false, code: 'bad_base64', byteLength: 0 }
  const bytes = decodeBase64(data)
  if (!bytes) return { ok: false, code: 'bad_base64', byteLength: 0 }
  if (!magicMatches(bytes, normalized)) return { ok: false, code: 'bad_magic', byteLength: bytes.length }
  return { ok: true, mime: normalized, bytes }
}

export async function defaultPhotoDecoder(blob: Blob): Promise<void> {
  if (typeof createImageBitmap === 'function') {
    const bmp = await createImageBitmap(blob)
    bmp.close?.()
    return
  }
  if (typeof Image === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('decode')
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function decodePhotoBlob(blob: Blob, decode: PhotoDecoder = defaultPhotoDecoder): Promise<void> {
  await decode(blob)
}

export function warnPhoto(code: PhotoFailCode, byteLength: number): void {
  console.warn('sicily-photo', code, byteLength)
}

export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  const bytes = decodeBase64(dataUrl.slice(comma + 1))
  return bytes ? bytes.length : 0
}
