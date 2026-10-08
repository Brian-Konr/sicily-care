export interface PhotoCache {
  get(fileId: string): Promise<{ mime: string; dataUrl: string } | null>
  put(fileId: string, mime: string, dataUrl: string): Promise<void>
}

export interface PhotoCacheRow {
  fileId: string
  mime: string
  dataUrl: string
  savedAt: number
}

export function evictOldest<T extends { savedAt: number }>(rows: T[], max: number): T[] {
  if (rows.length <= max) return rows
  return [...rows].sort((a, b) => b.savedAt - a.savedAt).slice(0, max)
}

export function createMemoryPhotoCache(max = 50): PhotoCache {
  const rows = new Map<string, PhotoCacheRow>()
  return {
    async get(fileId) {
      const r = rows.get(fileId)
      return r ? { mime: r.mime, dataUrl: r.dataUrl } : null
    },
    async put(fileId, mime, dataUrl) {
      rows.set(fileId, { fileId, mime, dataUrl, savedAt: Date.now() })
      if (rows.size > max) {
        const kept = evictOldest([...rows.values()], max)
        rows.clear()
        for (const r of kept) rows.set(r.fileId, r)
      }
    },
  }
}

export function createIdbPhotoCache(max = 50): PhotoCache {
  if (typeof indexedDB === "undefined") return createMemoryPhotoCache(max)
  const DB = "sicily-photos"
  const STORE = "photos"
  const open = () => new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: "fileId" }) }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return {
    async get(fileId) {
      try {
        const db = await open()
        return await new Promise<{ mime: string; dataUrl: string } | null>((resolve, reject) => {
          const tx = db.transaction(STORE, "readonly")
          const req = tx.objectStore(STORE).get(fileId)
          req.onsuccess = () => {
            const r = req.result as PhotoCacheRow | undefined
            resolve(r ? { mime: r.mime, dataUrl: r.dataUrl } : null)
          }
          req.onerror = () => reject(req.error)
        })
      } catch {
        return null
      }
    },
    async put(fileId, mime, dataUrl) {
      try {
        const db = await open()
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(STORE, "readwrite")
          const store = tx.objectStore(STORE)
          store.put({ fileId, mime, dataUrl, savedAt: Date.now() })
          const all = store.getAll()
          all.onsuccess = () => {
            const kept = evictOldest((all.result as PhotoCacheRow[]) ?? [], max)
            const keepIds = new Set(kept.map((r) => r.fileId))
            for (const r of (all.result as PhotoCacheRow[]) ?? []) {
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
  }
}
