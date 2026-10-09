// 照片 bytes：mime / base64 / magic 檢查與解碼。不碰 API 或快取。

export type PhotoMime = 'image/jpeg' | 'image/png' | 'image/webp'
/**
 * 照片失敗的診斷碼（畫面上「代碼：…」與 console.warn 用）。
 * - 內容：bad_mime（後端說是別的格式、bytes 也不是 JPEG/PNG/WebP）、bad_base64、bad_magic、decode_failed、img_error
 * - getPhoto 失敗：net_timeout、net_fetch、http_<status>、bad_response、server_<後端 error 代碼>
 * - unexpected：其他沒預期的例外（不該發生，發生了也要看得到）
 */
export type PhotoFailCode =
  | 'bad_mime' | 'bad_base64' | 'bad_magic' | 'decode_failed' | 'img_error'
  | 'net_timeout' | 'net_fetch' | `http_${number}` | 'bad_response' | `server_${string}` | 'unexpected'

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

export function decodeBase64(raw: string): Uint8Array | null {
  if (typeof raw !== 'string') return null
  // 容忍 MIME 式換行（每 76 字一行）與前後空白；Utilities.base64Encode 本身不換行
  const data = /\s/.test(raw) ? raw.replace(/\s+/g, '') : raw
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

/** 依檔頭判斷格式；不是 JPEG／PNG／WebP 就回 null */
export function sniffPhotoMime(bytes: Uint8Array): PhotoMime | null {
  for (const m of ['image/jpeg', 'image/png', 'image/webp'] as const) if (magicMatches(bytes, m)) return m
  return null
}

/**
 * 驗證 getPhoto 回應。格式一律看檔頭（magic bytes），不看後端給的 contentType：
 * Drive 的 getContentType() 可能是 image/heic、application/octet-stream、空字串等，只要 bytes 是 JPEG／PNG／WebP 就收，
 * Blob 的 type 用檔頭判斷出來的值。檔頭不對時：後端明說是別的非支援格式 → bad_mime，否則 → bad_magic。
 */
export function validatePhotoPayload(mime: unknown, data: unknown): PhotoCheck {
  if (typeof data !== 'string') return { ok: false, code: 'bad_base64', byteLength: 0 }
  const bytes = decodeBase64(data)
  if (!bytes) return { ok: false, code: 'bad_base64', byteLength: 0 }
  const sniffed = sniffPhotoMime(bytes)
  if (sniffed) return { ok: true, mime: sniffed, bytes }
  const declared = typeof mime === 'string' ? mime.trim().toLowerCase() : ''
  const declaresOther = declared !== '' && !normalizePhotoMime(declared) && declared !== 'application/octet-stream'
  return { ok: false, code: declaresOther ? 'bad_mime' : 'bad_magic', byteLength: bytes.length }
}

async function decodeWithImage(blob: Blob): Promise<void> {
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

/** 先用 createImageBitmap；失敗（舊版 iOS 對某些 JPEG／記憶體吃緊時會拒絕）再用 <img>.decode() 試一次，兩個都失敗才算解不開 */
export async function defaultPhotoDecoder(blob: Blob): Promise<void> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(blob)
      bmp.close?.()
      return
    } catch (err) {
      if (typeof Image === 'undefined') throw err
    }
  }
  await decodeWithImage(blob)
}

export async function decodePhotoBlob(blob: Blob, decode: PhotoDecoder = defaultPhotoDecoder): Promise<void> {
  await decode(blob)
}

export function warnPhoto(code: PhotoFailCode, byteLength: number): void {
  console.warn('sicily-photo', code, byteLength)
}

/** 診斷碼只留小寫英數與底線，避免把後端訊息或奇怪字元帶進畫面 */
export function safeCodePart(raw: unknown): string {
  const s = String(raw ?? '').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32)
  return s || 'unknown'
}

/** 多張失敗時的代碼行內容：去重、依出現順序、用「、」連接；沒有就回 null */
export function joinPhotoCodes(codes: (string | undefined)[]): string | null {
  const seen: string[] = []
  for (const c of codes) if (c && !seen.includes(c)) seen.push(c)
  return seen.length ? seen.join('、') : null
}

export function dataUrlByteLength(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma < 0) return 0
  const bytes = decodeBase64(dataUrl.slice(comma + 1))
  return bytes ? bytes.length : 0
}
