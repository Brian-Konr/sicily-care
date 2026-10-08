import { useCallback, useEffect, useRef, useState } from "react"
import { NetworkError, ServerError } from "@/api/errors"
import type { Api } from "@/api"
import type { PhotoCache } from "@/data/photoCache"
import { pendingLocalPhotos } from "@/data/photo"
import { supportsV11 } from "@/data/codec"
import type { PhotoThumbStatus } from "@/components/PhotoThumb"

export interface IssuePhotoItem {
  key: string
  fileId?: string
  status: PhotoThumbStatus
  dataUrl?: string
}

export function useIssuePhotos(opts: {
  issueId: string
  photoIds: string[]
  version: number
  api: Api
  cache: PhotoCache
  storage?: Storage
}) {
  const { issueId, photoIds, version, api, cache, storage = localStorage } = opts
  const [items, setItems] = useState<IssuePhotoItem[]>([])
  const inflight = useRef(new Set<string>())

  const setOne = useCallback((key: string, patch: Partial<IssuePhotoItem>) => {
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }, [])

  const fetchOne = useCallback(async (fileId: string) => {
    if (inflight.current.has(fileId)) return
    inflight.current.add(fileId)
    setOne(fileId, { status: "loading" })
    try {
      const hit = await cache.get(fileId)
      if (hit) { setOne(fileId, { status: "ready", dataUrl: hit.dataUrl }); return }
      if (!supportsV11(version)) return
      if (navigator.onLine === false) { setOne(fileId, { status: "offline" }); return }
      const r = await api.getPhoto(fileId)
      const dataUrl = `data:${r.mime};base64,${r.data}`
      await cache.put(fileId, r.mime, dataUrl)
      setOne(fileId, { status: "ready", dataUrl })
    } catch (err) {
      if (err instanceof ServerError && err.code === "forbidden") setOne(fileId, { status: "forbidden" })
      else if (err instanceof NetworkError && navigator.onLine === false) setOne(fileId, { status: "offline" })
      else setOne(fileId, { status: "error" })
    } finally {
      inflight.current.delete(fileId)
    }
  }, [api, cache, setOne, version])

  useEffect(() => {
    const local = pendingLocalPhotos(issueId, storage)
    const ids = photoIds.slice(0, 3)
    const next: IssuePhotoItem[] = [
      ...ids.map((id) => ({ key: id, fileId: id, status: "loading" as const })),
      ...local.map((p, i) => ({ key: `local-${i}`, status: "local" as const, dataUrl: p.dataUrl })),
    ]
    setItems(next)
    if (!supportsV11(version)) return
    for (const id of ids) void fetchOne(id)
  }, [issueId, photoIds.join(","), version, fetchOne, storage])

  useEffect(() => {
    const on = () => {
      for (const it of items) if (it.fileId && it.status === "offline") void fetchOne(it.fileId)
    }
    addEventListener("online", on)
    return () => removeEventListener("online", on)
  }, [items, fetchOne])

  const retry = (key: string) => {
    const it = items.find((x) => x.key === key)
    if (it?.fileId) void fetchOne(it.fileId)
  }

  return { items, retry }
}
