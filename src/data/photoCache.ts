export interface PhotoCache {
  get(fileId: string): Promise<{ mime: string; blob: Blob } | null>
  put(fileId: string, mime: string, blob: Blob): Promise<void>
  delete(fileId: string): Promise<void>
}

export interface PhotoCacheRow {
  fileId: string
  mime: string
  blob: Blob
  savedAt: number
}

/** v1 cached undecoded data URLs under sicily-photos; opening v2 deletes that database. */
export const PHOTO_DB_NAME = 'sicily-photos-v2'
export const PHOTO_DB_PREV = 'sicily-photos'
export const PHOTO_STORE = 'photos'

export function evictOldest<T extends { savedAt: number }>(rows: T[], max: number): T[] {
  if (rows.length <= max) return rows
  return [...rows].sort((a, b) => b.savedAt - a.savedAt).slice(0, max)
}

export function createMemoryPhotoCache(max = 50): PhotoCache {
  const rows = new Map<string, PhotoCacheRow>()
  const cache: PhotoCache = {
    async get(fileId) {
      const r = rows.get(fileId)
      if (!r) return null
      if (!(r.blob instanceof Blob)) {
        rows.delete(fileId)
        return null
      }
      return { mime: r.mime, blob: r.blob }
    },
    async put(fileId, mime, blob) {
      rows.set(fileId, { fileId, mime, blob, savedAt: Date.now() })
      if (rows.size > max) {
        const kept = evictOldest([...rows.values()], max)
        rows.clear()
        for (const r of kept) rows.set(r.fileId, r)
      }
    },
    async delete(fileId) {
      rows.delete(fileId)
    },
  }
  return cache
}

export function createIdbPhotoCache(max = 50, factory?: IDBFactory): PhotoCache {
  const idb = factory ?? (typeof indexedDB === 'undefined' ? undefined : indexedDB)
  if (!idb) return createMemoryPhotoCache(max)

  let dropOnce: Promise<void> | undefined

  const dropOld = (): Promise<void> => {
    if (!dropOnce) {
      dropOnce = new Promise<void>((resolve) => {
        try {
          const req = idb.deleteDatabase(PHOTO_DB_PREV)
          req.onsuccess = () => resolve()
          req.onerror = () => resolve()
          req.onblocked = () => resolve()
        } catch {
          resolve()
        }
      })
    }
    return dropOnce
  }

  const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const req = idb.open(PHOTO_DB_NAME, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(PHOTO_STORE, { keyPath: 'fileId' }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

  const withDb = async () => {
    await dropOld()
    return open()
  }

  const cache: PhotoCache = {
    async get(fileId) {
      try {
        const db = await withDb()
        const row = await new Promise<PhotoCacheRow | undefined>((resolve, reject) => {
          const tx = db.transaction(PHOTO_STORE, 'readonly')
          const req = tx.objectStore(PHOTO_STORE).get(fileId)
          req.onsuccess = () => resolve(req.result as PhotoCacheRow | undefined)
          req.onerror = () => reject(req.error)
        })
        if (!row) return null
        if (!(row.blob instanceof Blob)) {
          await cache.delete(fileId)
          return null
        }
        return { mime: row.mime, blob: row.blob }
      } catch {
        return null
      }
    },
    async put(fileId, mime, blob) {
      try {
        const db = await withDb()
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(PHOTO_STORE, 'readwrite')
          const store = tx.objectStore(PHOTO_STORE)
          store.put({ fileId, mime, blob, savedAt: Date.now() })
          const all = store.getAll()
          all.onsuccess = () => {
            const rows = (all.result as PhotoCacheRow[]) ?? []
            const kept = evictOldest(rows, max)
            const keepIds = new Set(kept.map((r) => r.fileId))
            for (const r of rows) {
              if (!keepIds.has(r.fileId)) store.delete(r.fileId)
            }
            resolve()
          }
          all.onerror = () => reject(all.error)
        })
      } catch {
        /* indexedDB 寫入失敗就略過快取 */
      }
    },
    async delete(fileId) {
      try {
        const db = await withDb()
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(PHOTO_STORE, 'readwrite')
          const req = tx.objectStore(PHOTO_STORE).delete(fileId)
          req.onsuccess = () => resolve()
          req.onerror = () => reject(req.error)
        })
      } catch {
        /* indexedDB 刪除失敗就略過 */
      }
    },
  }
  return cache
}
