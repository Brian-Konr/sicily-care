import { test, expect } from 'vitest'
import { createMemoryPhotoCache, evictOldest } from '@/data/photoCache'

test('evictOldest 留下 savedAt 最新的 max 筆', () => {
  const rows = Array.from({ length: 55 }, (_, i) => ({ savedAt: i, id: String(i) }))
  const kept = evictOldest(rows, 50)
  expect(kept).toHaveLength(50)
  expect(Math.min(...kept.map((r) => r.savedAt))).toBe(5)
  expect(Math.max(...kept.map((r) => r.savedAt))).toBe(54)
})

test('createMemoryPhotoCache get/put；第 51 筆會丟掉最舊的', async () => {
  const cache = createMemoryPhotoCache(50)
  expect(await cache.get('x')).toBeNull()
  await cache.put('a', 'image/jpeg', 'data:image/jpeg;base64,aa')
  expect(await cache.get('a')).toEqual({ mime: 'image/jpeg', dataUrl: 'data:image/jpeg;base64,aa' })

  for (let i = 0; i < 51; i++) {
    await cache.put(`id-${i}`, 'image/jpeg', `data:image/jpeg;base64,${i}`)
    await new Promise((r) => setTimeout(r, 1))
  }
  expect(await cache.get('id-0')).toBeNull()
  expect(await cache.get('id-50')).not.toBeNull()
})
