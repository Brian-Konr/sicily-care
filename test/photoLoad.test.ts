import { test, expect, vi } from 'vitest'
import { NetworkError, ServerError } from '@/api/errors'
import { createMemoryPhotoCache, type PhotoCache } from '@/data/photoCache'
import { loadIssuePhoto, noteImgError, photoFetchFailCode } from '@/data/photoLoad'
import type { PhotoDecoder, PhotoFailCode } from '@/data/photoBytes'

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')

const jpeg = new Uint8Array(100)
jpeg[0] = 0xff
jpeg[1] = 0xd8
jpeg[2] = 0xff
jpeg.fill(1, 3)
const jpeg64 = b64(jpeg)

const decodeOk: PhotoDecoder = async () => {}

function countingCache(inner: PhotoCache = createMemoryPhotoCache()) {
  const counts = { get: 0, put: 0, delete: 0 }
  const cache: PhotoCache = {
    async get(id) { counts.get += 1; return inner.get(id) },
    async put(id, mime, blob) { counts.put += 1; return inner.put(id, mime, blob) },
    async delete(id) { counts.delete += 1; return inner.delete(id) },
  }
  return { cache, counts, inner }
}

function countingApi(impl: (fileId: string) => Promise<{ mime: string; data: string }>) {
  let n = 0
  return {
    get n() { return n },
    api: {
      async getPhoto(fileId: string) {
        n += 1
        return impl(fileId)
      },
    },
  }
}

test('1 合法 JPEG 解碼成功是 ready，getPhoto 與 put 各一次', async () => {
  const { cache, counts, inner } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r.status).toBe('ready')
  if (r.status === 'ready') {
    expect(r.blob.size).toBe(100)
    expect(r.blob.type).toBe('image/jpeg')
  }
  expect(getPhoto.n).toBe(1)
  expect(counts.put).toBe(1)
  expect(warn).not.toHaveBeenCalled()
  const stored = await inner.get('f')
  expect(stored?.blob.size).toBe(100)
})

test('2 後端說 image/heic 且 bytes 不是 JPEG/PNG/WebP 是 bad_mime，不 put', async () => {
  const { cache, counts, inner } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/heic', data: b64(new Uint8Array([0, 0, 0, 0x18])) }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r).toEqual({ status: 'error', code: 'bad_mime', byteLength: 4 })
  expect(counts.put).toBe(0)
  expect(await inner.get('f')).toBeNull()
  expect(warn).toHaveBeenCalledWith('bad_mime', 4)
})

test('2b contentType 是 heic／octet-stream／空字串但 bytes 是 JPEG：顯示，Blob type 與快取 mime 用 image/jpeg', async () => {
  for (const mime of ['image/heic', 'application/octet-stream', '', 'image/jpg']) {
    const { cache, inner } = countingCache()
    const getPhoto = countingApi(async () => ({ mime, data: jpeg64 }))
    const r = await loadIssuePhoto({ fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn: () => {} })
    expect(r.status).toBe('ready')
    if (r.status === 'ready') expect(r.blob.type).toBe('image/jpeg')
    expect((await inner.get('f'))?.mime).toBe('image/jpeg')
  }
})

test('3 data 空字串是 bad_base64，不 put', async () => {
  const { cache, counts, inner } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: '' }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r).toEqual({ status: 'error', code: 'bad_base64', byteLength: 0 })
  expect(counts.put).toBe(0)
  expect(await inner.get('f')).toBeNull()
})

test('4 JPEG mime 配非圖片 bytes 是 bad_magic，不 put', async () => {
  const { cache, counts, inner } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: b64(new Uint8Array([1, 2, 3, 4])) }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r).toEqual({ status: 'error', code: 'bad_magic', byteLength: 4 })
  expect(counts.put).toBe(0)
  expect(await inner.get('f')).toBeNull()
})

test('5 100 bytes JPEG 解碼失敗是 decode_failed，不 put', async () => {
  const { cache, counts, inner } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true,
    decode: async () => { throw new Error('x') }, warn,
  })
  expect(r).toEqual({ status: 'error', code: 'decode_failed', byteLength: 100 })
  expect(counts.put).toBe(0)
  expect(await inner.get('f')).toBeNull()
  expect(warn).toHaveBeenCalledWith('decode_failed', 100)
})

test('6 快取命中且解碼成功：不 getPhoto、不 put', async () => {
  const inner = createMemoryPhotoCache()
  const blob = new Blob([jpeg], { type: 'image/jpeg' })
  await inner.put('f', 'image/jpeg', blob)
  const { cache, counts } = countingCache(inner)
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r.status).toBe('ready')
  expect(getPhoto.n).toBe(0)
  expect(counts.put).toBe(0)
})

test('7 快取解碼失敗會刪掉並改抓網路成功的 JPEG', async () => {
  const inner = createMemoryPhotoCache()
  await inner.put('f', 'image/jpeg', new Blob([new Uint8Array(50)]))
  const { cache } = countingCache(inner)
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true,
    decode: async (blob) => { if (blob.size === 50) throw new Error('bad') },
    warn,
  })
  expect(r.status).toBe('ready')
  expect((await inner.get('f'))?.blob.size).toBe(100)
  expect(getPhoto.n).toBe(1)
  expect(warn).toHaveBeenCalledTimes(1)
  expect(warn).toHaveBeenCalledWith('decode_failed', 50)
})

test('8 skipCache 不呼叫 cache.get，會 getPhoto', async () => {
  const inner = createMemoryPhotoCache()
  await inner.put('f', 'image/jpeg', new Blob([jpeg], { type: 'image/jpeg' }))
  const { cache, counts } = countingCache(inner)
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, skipCache: true, online: true, decode: decodeOk, warn,
  })
  expect(r.status).toBe('ready')
  expect(counts.get).toBe(0)
  expect(getPhoto.n).toBe(1)
})

test('9 version 0 空快取是 unavailable，不 getPhoto', async () => {
  const { cache, counts, inner } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 0, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r).toEqual({ status: 'unavailable' })
  expect(getPhoto.n).toBe(0)
  expect(counts.put).toBe(0)
  expect(await inner.get('f')).toBeNull()
})

test('10 version 0 快取命中解碼成功是 ready，不 getPhoto', async () => {
  const inner = createMemoryPhotoCache()
  await inner.put('f', 'image/jpeg', new Blob([jpeg], { type: 'image/jpeg' }))
  const { cache } = countingCache(inner)
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 0, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r.status).toBe('ready')
  expect(getPhoto.n).toBe(0)
})

test('11 version 0 快取解碼失敗是 decode_failed，不 getPhoto', async () => {
  const inner = createMemoryPhotoCache()
  await inner.put('f', 'image/jpeg', new Blob([new Uint8Array(50)]))
  const { cache, counts } = countingCache(inner)
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 0, api: getPhoto.api, cache, online: true,
    decode: async () => { throw new Error('x') }, warn,
  })
  expect(r).toEqual({ status: 'error', code: 'decode_failed', byteLength: 50 })
  expect(counts.delete).toBe(1)
  expect(await inner.get('f')).toBeNull()
  expect(getPhoto.n).toBe(0)
})

test('12 離線空快取是 offline，不 getPhoto', async () => {
  const { cache, counts } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg', data: jpeg64 }))
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: false, decode: decodeOk, warn,
  })
  expect(r).toEqual({ status: 'offline' })
  expect(getPhoto.n).toBe(0)
  expect(counts.put).toBe(0)
})

test('13 forbidden 不 warn、不 put', async () => {
  const { cache, counts, inner } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  const getPhoto = countingApi(async () => { throw new ServerError('forbidden', '讀不到這張照片') })
  const r = await loadIssuePhoto({
    fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
  })
  expect(r).toEqual({ status: 'forbidden' })
  expect(warn).not.toHaveBeenCalled()
  expect(counts.put).toBe(0)
  expect(await inner.get('f')).toBeNull()
})

test('14 getPhoto 失敗都有診斷碼並 warn，不 put', async () => {
  const cases: [unknown, PhotoFailCode][] = [
    [new NetworkError(undefined, 'timeout'), 'net_timeout'],
    [new NetworkError(), 'net_fetch'],
    [new NetworkError(undefined, 'fetch'), 'net_fetch'],
    [new NetworkError('x', 'http-503'), 'http_503'],
    [new NetworkError('x', 'http-404'), 'http_404'],
    [new ServerError('bad_response', '回應不是 JSON'), 'bad_response'],
    [new ServerError('server_error', 'Exceeded memory'), 'server_error'],
    [new ServerError('no_folder'), 'server_no_folder'],
    [new ServerError('busy'), 'server_busy'],
    [new ServerError('unauthorized'), 'server_unauthorized'],
    [new TypeError('boom'), 'unexpected'],
  ]
  for (const [err, code] of cases) {
    const { cache, counts, inner } = countingCache()
    const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
    const getPhoto = countingApi(async () => { throw err })
    const r = await loadIssuePhoto({
      fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn,
    })
    expect(r).toEqual({ status: 'error', code, byteLength: 0 })
    expect(warn).toHaveBeenCalledWith(code, 0)
    expect(counts.put).toBe(0)
    expect(await inner.get('f')).toBeNull()
  }
})

test('14b photoFetchFailCode 不把後端訊息帶進代碼', () => {
  expect(photoFetchFailCode(new ServerError('Weird Code!', '含 email a@b.c 的訊息'))).toBe('server_weird_code')
})

test('14c getPhoto 回 ok 但沒有 data 是 bad_base64', async () => {
  const { cache } = countingCache()
  const getPhoto = countingApi(async () => ({ mime: 'image/jpeg' } as unknown as { mime: string; data: string }))
  const r = await loadIssuePhoto({ fileId: 'f', version: 2, api: getPhoto.api, cache, online: true, decode: decodeOk, warn: () => {} })
  expect(r).toEqual({ status: 'error', code: 'bad_base64', byteLength: 0 })
})

test('15 noteImgError 有 fileId 會刪快取並 warn img_error', async () => {
  const cache = createMemoryPhotoCache()
  await cache.put('f', 'image/jpeg', new Blob([jpeg], { type: 'image/jpeg' }))
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  await noteImgError({ fileId: 'f', byteLength: 12, cache, warn })
  expect(await cache.get('f')).toBeNull()
  expect(warn).toHaveBeenCalledWith('img_error', 12)
})

test('16 noteImgError 沒有 fileId 只 warn、不 delete', async () => {
  const { cache, counts } = countingCache()
  const warn = vi.fn<(code: PhotoFailCode, n: number) => void>()
  await noteImgError({ byteLength: 12, cache, warn })
  expect(warn).toHaveBeenCalledTimes(1)
  expect(warn).toHaveBeenCalledWith('img_error', 12)
  expect(counts.delete).toBe(0)
})

test('17 預設 warn 不把 base64 印進 console', async () => {
  const unique = 'QQQQnotAphotoZZZZ'
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    const cache = createMemoryPhotoCache()
    await loadIssuePhoto({
      fileId: 'f',
      version: 2,
      api: { getPhoto: async () => ({ mime: 'image/jpeg', data: unique }) },
      cache,
      online: true,
      decode: decodeOk,
    })
    expect(spy).toHaveBeenCalledWith('sicily-photo', 'bad_base64', 0)
    const joined = spy.mock.calls.flat().map(String).join(' ')
    expect(joined).not.toContain(unique)
  } finally {
    spy.mockRestore()
  }
})

test('14c photoFetchFailCode 不重複 server_ 前綴', () => {
  expect(photoFetchFailCode(new ServerError('server_error', 'x'))).toBe('server_error')
  expect(photoFetchFailCode(new ServerError('busy', 'x'))).toBe('server_busy')
})
