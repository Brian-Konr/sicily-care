import { NetworkError, ServerError } from '@/api/errors'
import { supportsV11 } from '@/data/codec'
import type { PhotoCache } from '@/data/photoCache'
import {
  type PhotoDecoder,
  type PhotoFailCode,
  decodePhotoBlob,
  defaultPhotoDecoder,
  validatePhotoPayload,
  warnPhoto,
} from '@/data/photoBytes'

export type LoadPhotoResult =
  | { status: 'ready'; blob: Blob; byteLength: number }
  | { status: 'error'; byteLength: number; code?: PhotoFailCode }
  | { status: 'offline' }
  | { status: 'forbidden' }
  | { status: 'unavailable' }

export async function loadIssuePhoto(opts: {
  fileId: string
  version: number
  api: { getPhoto(fileId: string): Promise<{ mime: string; data: string }> }
  cache: PhotoCache
  skipCache?: boolean
  online?: boolean
  decode?: PhotoDecoder
  warn?: (code: PhotoFailCode, byteLength: number) => void
}): Promise<LoadPhotoResult> {
  const {
    fileId,
    version,
    api,
    cache,
    skipCache,
    online = (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    decode = defaultPhotoDecoder,
    warn = warnPhoto,
  } = opts

  if (skipCache !== true) {
    const hit = await cache.get(fileId)
    if (hit && hit.blob instanceof Blob) {
      try {
        await decodePhotoBlob(hit.blob, decode)
        return { status: 'ready', blob: hit.blob, byteLength: hit.blob.size }
      } catch {
        await cache.delete(fileId)
        warn('decode_failed', hit.blob.size)
        if (!supportsV11(version)) {
          return { status: 'error', code: 'decode_failed', byteLength: hit.blob.size }
        }
      }
    } else if (hit) {
      await cache.delete(fileId)
    }
  }

  if (!supportsV11(version)) return { status: 'unavailable' }
  if (!online) return { status: 'offline' }

  let response: { mime: string; data: string }
  try {
    response = await api.getPhoto(fileId)
  } catch (err) {
    if (err instanceof ServerError && err.code === 'forbidden') return { status: 'forbidden' }
    if (err instanceof NetworkError && !online) return { status: 'offline' }
    return { status: 'error', byteLength: 0 }
  }

  const checked = validatePhotoPayload(response.mime, response.data)
  if (!checked.ok) {
    warn(checked.code, checked.byteLength)
    return { status: 'error', code: checked.code, byteLength: checked.byteLength }
  }

  const bytes = new Uint8Array(checked.bytes.byteLength)
  bytes.set(checked.bytes)
  const blob = new Blob([bytes], { type: checked.mime })
  try {
    await decodePhotoBlob(blob, decode)
  } catch {
    warn('decode_failed', blob.size)
    return { status: 'error', code: 'decode_failed', byteLength: blob.size }
  }

  await cache.put(fileId, checked.mime, blob)
  return { status: 'ready', blob, byteLength: blob.size }
}

export async function noteImgError(opts: {
  fileId?: string
  byteLength: number
  cache: PhotoCache
  warn?: (code: PhotoFailCode, byteLength: number) => void
}): Promise<void> {
  const warn = opts.warn ?? warnPhoto
  warn('img_error', opts.byteLength)
  if (typeof opts.fileId === 'string' && opts.fileId.length > 0) {
    await opts.cache.delete(opts.fileId)
  }
}
