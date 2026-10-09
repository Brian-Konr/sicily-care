import { test, expect, vi } from 'vitest'
import {
  decodePhotoBlob,
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

test('gif、image/jpg、帶參數與非字串 mime 是 bad_mime', () => {
  const data = b64(jpeg)
  for (const mime of ['image/gif', 'image/jpg', 'image/jpeg; charset=binary', 1]) {
    const r = validatePhotoPayload(mime, data)
    expect(r).toEqual({ ok: false, code: 'bad_mime', byteLength: 0 })
  }
})

test('JPEG mime 配 PNG bytes 是 bad_magic', () => {
  const r = validatePhotoPayload('image/jpeg', b64(png))
  expect(r).toEqual({ ok: false, code: 'bad_magic', byteLength: png.length })
})

test('WebP 只有 RIFF 四個 bytes 是 bad_magic', () => {
  const r = validatePhotoPayload('image/webp', b64(new Uint8Array([0x52, 0x49, 0x46, 0x46])))
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
