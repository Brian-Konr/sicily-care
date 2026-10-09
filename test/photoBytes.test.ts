import { test, expect, vi } from 'vitest'
import {
  decodePhotoBlob,
  joinPhotoCodes,
  safeCodePart,
  sniffPhotoMime,
  validatePhotoPayload,
  warnPhoto,
} from '@/data/photoBytes'

const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64')

const jpeg = new Uint8Array(100)
jpeg[0] = 0xff
jpeg[1] = 0xd8
jpeg[2] = 0xff
jpeg.fill(1, 3)

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46,
  0, 0, 0, 0,
  0x57, 0x45, 0x42, 0x50,
  0,
])

test('JPEG、PNG、WebP 通過驗證且 bytes 與輸入相同', () => {
  const j = validatePhotoPayload('image/jpeg', b64(jpeg))
  expect(j.ok).toBe(true)
  if (j.ok) expect(j.bytes).toEqual(jpeg)

  const p = validatePhotoPayload('image/png', b64(png))
  expect(p.ok).toBe(true)
  if (p.ok) expect(p.bytes).toEqual(png)

  const w = validatePhotoPayload('image/webp', b64(webp))
  expect(w.ok).toBe(true)
  if (w.ok) expect(w.bytes).toEqual(webp)
})

test('IMAGE/JPEG 與前後空白視為 image/jpeg', () => {
  const a = validatePhotoPayload('IMAGE/JPEG', b64(jpeg))
  expect(a.ok).toBe(true)
  if (a.ok) expect(a.mime).toBe('image/jpeg')

  const b = validatePhotoPayload(' image/jpeg ', b64(jpeg))
  expect(b.ok).toBe(true)
  if (b.ok) expect(b.mime).toBe('image/jpeg')
})

test('空字串、非 base64、data URL 是 bad_base64', () => {
  for (const data of ['', 'abc', '****', 'data:image/jpeg;base64,/9j/']) {
    const r = validatePhotoPayload('image/jpeg', data)
    expect(r).toEqual({ ok: false, code: 'bad_base64', byteLength: 0 })
  }
})

test('格式看檔頭不看 contentType：heic、octet-stream、空字串、image/jpg、帶參數、非字串都收，mime 用檔頭決定', () => {
  const cases: [Uint8Array, string][] = [[jpeg, 'image/jpeg'], [png, 'image/png'], [webp, 'image/webp']]
  for (const [bytes, expected] of cases) {
    for (const mime of ['image/heic', 'application/octet-stream', '', 'image/jpg', 'image/jpeg; charset=binary', 'image/gif', undefined, null, 1]) {
      const r = validatePhotoPayload(mime, b64(bytes))
      expect(r.ok).toBe(true)
      if (r.ok) {
        expect(r.mime).toBe(expected)
        expect(r.bytes).toEqual(bytes)
      }
    }
  }
})

test('contentType 說 PNG 但 bytes 是 JPEG：以檔頭為準', () => {
  const r = validatePhotoPayload('image/png', b64(jpeg))
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.mime).toBe('image/jpeg')
})

test('檔頭不是 JPEG/PNG/WebP：後端說是別的格式 → bad_mime，否則 bad_magic', () => {
  const heicLike = new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])
  expect(validatePhotoPayload('image/heic', b64(heicLike))).toEqual({ ok: false, code: 'bad_mime', byteLength: 12 })
  expect(validatePhotoPayload('text/html', b64(heicLike))).toEqual({ ok: false, code: 'bad_mime', byteLength: 12 })
  for (const mime of ['image/jpeg', 'application/octet-stream', '', undefined]) {
    expect(validatePhotoPayload(mime, b64(heicLike))).toEqual({ ok: false, code: 'bad_magic', byteLength: 12 })
  }
})

test('MIME 式換行的 base64 也能解', () => {
  const big = new Uint8Array(400)
  big.set(jpeg)
  const wrapped = b64(big).replace(/(.{76})/g, '$1\r\n')
  const r = validatePhotoPayload('image/jpeg', wrapped)
  expect(r.ok).toBe(true)
  if (r.ok) expect(r.bytes).toEqual(big)
})

test('sniffPhotoMime', () => {
  expect(sniffPhotoMime(jpeg)).toBe('image/jpeg')
  expect(sniffPhotoMime(png)).toBe('image/png')
  expect(sniffPhotoMime(webp)).toBe('image/webp')
  expect(sniffPhotoMime(new Uint8Array([1, 2, 3, 4]))).toBeNull()
  expect(sniffPhotoMime(new Uint8Array())).toBeNull()
})

test('joinPhotoCodes 去重、保留順序、用「、」連接；沒有就 null', () => {
  expect(joinPhotoCodes([])).toBeNull()
  expect(joinPhotoCodes([undefined, undefined])).toBeNull()
  expect(joinPhotoCodes(['net_timeout'])).toBe('net_timeout')
  expect(joinPhotoCodes(['net_timeout', undefined, 'net_timeout', 'bad_magic'])).toBe('net_timeout、bad_magic')
})

test('safeCodePart 只留小寫英數底線', () => {
  expect(safeCodePart('server_error')).toBe('server_error')
  expect(safeCodePart('No-Folder!')).toBe('no_folder')
  expect(safeCodePart('')).toBe('unknown')
  expect(safeCodePart(undefined)).toBe('unknown')
  expect(safeCodePart('<b>x</b>').includes('<')).toBe(false)
})

test('WebP 只有 RIFF 四個 bytes 是 bad_magic', () => {
  const r = validatePhotoPayload('application/octet-stream', b64(new Uint8Array([0x52, 0x49, 0x46, 0x46])))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.code).toBe('bad_magic')
})

test('WebP RIFF 加 XXXX 是 bad_magic', () => {
  const bytes = new Uint8Array([
    0x52, 0x49, 0x46, 0x46,
    0, 0, 0, 0,
    0x58, 0x58, 0x58, 0x58,
  ])
  const r = validatePhotoPayload('image/webp', b64(bytes))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.code).toBe('bad_magic')
})

test('JPEG 缺第三個 FF 是 bad_magic', () => {
  const r = validatePhotoPayload('image/jpeg', b64(new Uint8Array([0xff, 0xd8])))
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.code).toBe('bad_magic')
})

test('100 bytes JPEG 通過 magic（不解碼）', () => {
  const r = validatePhotoPayload('image/jpeg', b64(jpeg))
  expect(r.ok).toBe(true)
})

test('decodePhotoBlob 注入成功會呼叫一次', async () => {
  const blob = new Blob([jpeg], { type: 'image/jpeg' })
  let n = 0
  await decodePhotoBlob(blob, async () => { n += 1 })
  expect(n).toBe(1)
})

test('decodePhotoBlob 注入失敗會 reject', async () => {
  const blob = new Blob([jpeg], { type: 'image/jpeg' })
  await expect(decodePhotoBlob(blob, async () => { throw new Error('x') })).rejects.toThrow('x')
})

test('warnPhoto 只印 sicily-photo、代碼、長度', () => {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  try {
    warnPhoto('bad_magic', 4)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy).toHaveBeenCalledWith('sicily-photo', 'bad_magic', 4)
  } finally {
    spy.mockRestore()
  }
})

test('defaultPhotoDecoder：createImageBitmap 失敗時改用 <img>.decode() 再試', async () => {
  const { defaultPhotoDecoder } = await import('@/data/photoBytes')
  let imgTried = 0
  vi.stubGlobal('createImageBitmap', async () => { throw new Error('InvalidStateError') })
  vi.stubGlobal('Image', class { src = ''; async decode() { imgTried += 1 } })
  try {
    await expect(defaultPhotoDecoder(new Blob([jpeg], { type: 'image/jpeg' }))).resolves.toBeUndefined()
    expect(imgTried).toBe(1)
    vi.stubGlobal('Image', class { src = ''; async decode() { throw new Error('EncodingError') } })
    await expect(defaultPhotoDecoder(new Blob([jpeg], { type: 'image/jpeg' }))).rejects.toThrow()
  } finally {
    vi.unstubAllGlobals()
  }
})
