import { test, expect } from 'vitest'
import {
  createIdbPhotoCache,
  createMemoryPhotoCache,
  evictOldest,
  type PhotoCacheRow,
} from '@/data/photoCache'

test('evictOldest 留下 savedAt 最新的 max 筆', () => {
  const rows = Array.from({ length: 55 }, (_, i) => ({ savedAt: i, id: String(i) }))
  const kept = evictOldest(rows, 50)
  expect(kept).toHaveLength(50)
  expect(Math.min(...kept.map((r) => r.savedAt))).toBe(5)
  expect(Math.max(...kept.map((r) => r.savedAt))).toBe(54)
})

test('createMemoryPhotoCache get/put 存 Blob，回傳只有 mime 與 blob', async () => {
  const cache = createMemoryPhotoCache(50)
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
  expect(await cache.get('x')).toBeNull()
  await cache.put('a', 'image/jpeg', blob)
  const got = await cache.get('a')
  expect(got?.blob).toBe(blob)
  expect(got?.mime).toBe('image/jpeg')
  expect(got).not.toHaveProperty('dataUrl')
  expect(Object.keys(got!).sort()).toEqual(['blob', 'mime'])
})

test('createMemoryPhotoCache 第 51 筆會丟掉最舊的', async () => {
  const cache = createMemoryPhotoCache(50)
  for (let i = 0; i < 51; i++) {
    await cache.put(`id-${i}`, 'image/jpeg', new Blob([new Uint8Array([i])]))
    await new Promise((r) => setTimeout(r, 1))
  }
  expect(await cache.get('id-0')).toBeNull()
  expect(await cache.get('id-50')).not.toBeNull()
})

test('put 後 delete 再 get 是 null', async () => {
  const cache = createMemoryPhotoCache()
  await cache.put('a', 'image/jpeg', new Blob([new Uint8Array([1])]))
  await cache.delete('a')
  expect(await cache.get('a')).toBeNull()
})

type FakeReq = {
  result?: unknown
  error?: unknown
  onsuccess: ((ev?: unknown) => void) | null
  onerror: ((ev?: unknown) => void) | null
  onblocked: ((ev?: unknown) => void) | null
  onupgradeneeded: ((ev?: unknown) => void) | null
}

function fakeIdbFactory() {
  const calls: string[] = []
  const data = new Map<string, PhotoCacheRow>()

  const objectStore = () => ({
    get(fileId: string) {
      const req: FakeReq = { result: data.get(fileId), onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
    put(row: PhotoCacheRow) {
      data.set(row.fileId, row)
      const req: FakeReq = { onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
    getAll() {
      const req: FakeReq = { result: [...data.values()], onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
    delete(fileId: string) {
      data.delete(fileId)
      const req: FakeReq = { onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
  })

  const db = {
    createObjectStore() { return objectStore() },
    transaction() { return { objectStore } },
  }

  const factory = {
    deleteDatabase(name: string) {
      calls.push(`delete:${name}`)
      const req: FakeReq = { onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
    open(name: string) {
      calls.push(`open:${name}`)
      const req: FakeReq = { result: db, onsuccess: null, onerror: null, onblocked: null, onupgradeneeded: null }
      queueMicrotask(() => {
        req.onupgradeneeded?.()
        req.onsuccess?.()
      })
      return req
    },
    cmp() { return 0 },
    databases: async () => [],
  }

  return { factory: factory as unknown as IDBFactory, calls, data }
}

test('IDB 先刪 sicily-photos 再開 sicily-photos-v2，存 Blob', async () => {
  const { factory, calls, data } = fakeIdbFactory()
  const cache = createIdbPhotoCache(50, factory)
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' })
  await cache.put('a', 'image/jpeg', blob)
  const got = await cache.get('a')

  expect(calls[0]).toBe('delete:sicily-photos')
  expect(calls[1]).toBe('open:sicily-photos-v2')
  expect(got?.blob).toBe(blob)
  expect(got?.mime).toBe('image/jpeg')
  expect(got).not.toHaveProperty('dataUrl')

  const stored = data.get('a')
  expect(stored?.blob).toBe(blob)
  expect(stored).not.toHaveProperty('dataUrl')

  await cache.put('b', 'image/jpeg', new Blob([new Uint8Array([4])]))
  expect(calls.filter((c) => c.startsWith('delete:'))).toHaveLength(1)
})

test('createIdbPhotoCache 沒有 indexedDB 時用記憶體快取存 Blob', async () => {
  const cache = createIdbPhotoCache()
  const blob = new Blob([new Uint8Array([9])], { type: 'image/jpeg' })
  await cache.put('a', 'image/jpeg', blob)
  const got = await cache.get('a')
  expect(got?.blob).toBe(blob)
  expect(got?.mime).toBe('image/jpeg')
})
