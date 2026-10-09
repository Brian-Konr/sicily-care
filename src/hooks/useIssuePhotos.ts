import { useCallback, useEffect, useRef, useState } from "react"
import type { Api } from "@/api"
import type { PhotoCache } from "@/data/photoCache"
import { pendingLocalPhotos } from "@/data/photo"
import { dataUrlByteLength, warnPhoto, type PhotoFailCode } from "@/data/photoBytes"
import { loadIssuePhoto, noteImgError } from "@/data/photoLoad"
import { supportsV11 } from "@/data/codec"
import type { PhotoThumbStatus } from "@/components/PhotoThumb"

export interface IssuePhotoItem {
  key: string
  fileId?: string
  status: PhotoThumbStatus
  /** Remote ready: blob: URL. Local: data URL. Absent otherwise. */
  src?: string
  byteLength?: number
  /** 只在 status === "error" 時有值：診斷碼（畫面「代碼：…」） */
  code?: PhotoFailCode
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
  const itemsRef = useRef(items)
  itemsRef.current = items
  const inflight = useRef(new Set<string>())
  const urls = useRef(new Map<string, string>())
  const gen = useRef(0)
  const broken = useRef(new Set<string>())

  const setOne = useCallback((key: string, patch: Partial<IssuePhotoItem>) => {
    setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...patch } : x)))
  }, [])

  const revoke = useCallback((key: string) => {
    const u = urls.current.get(key)
    if (!u) return
    URL.revokeObjectURL(u)
    urls.current.delete(key)
  }, [])

  const urlFor = useCallback((key: string, blob: Blob) => {
    revoke(key)
    const u = URL.createObjectURL(blob)
    urls.current.set(key, u)
    return u
  }, [revoke])

  const fetchOne = useCallback(async (fileId: string, ticket: number, skipCache?: boolean) => {
    if (inflight.current.has(fileId)) return
    inflight.current.add(fileId)
    revoke(fileId)
    setOne(fileId, { status: "loading", src: undefined, code: undefined })
    try {
      let result: Awaited<ReturnType<typeof loadIssuePhoto>>
      try {
        result = await loadIssuePhoto({ fileId, version, api, cache, skipCache })
      } catch {
        // 不該發生；發生了也不要永遠停在「載入中」
        warnPhoto("unexpected", 0)
        result = { status: "error", code: "unexpected", byteLength: 0 }
      }
      if (ticket !== gen.current) return
      if (result.status === "ready") {
        try {
          const src = urlFor(fileId, result.blob)
          setOne(fileId, { status: "ready", src, byteLength: result.byteLength })
        } catch {
          warnPhoto("decode_failed", result.blob.size)
          setOne(fileId, { status: "error", src: undefined, byteLength: result.blob.size, code: "decode_failed" })
        }
        return
      }
      if (result.status === "error") {
        setOne(fileId, { status: "error", src: undefined, byteLength: result.byteLength, code: result.code })
        return
      }
      if (result.status === "offline" || result.status === "forbidden") {
        setOne(fileId, { status: result.status, src: undefined })
        return
      }
      setOne(fileId, { status: "loading", src: undefined })
    } finally {
      inflight.current.delete(fileId)
    }
  }, [api, cache, setOne, version, revoke, urlFor])

  useEffect(() => {
    gen.current += 1
    const ticket = gen.current
    for (const key of [...urls.current.keys()]) revoke(key)
    urls.current.clear()
    inflight.current.clear()
    broken.current.clear()

    const local = pendingLocalPhotos(issueId, storage)
    const ids = photoIds.slice(0, 3)
    const next: IssuePhotoItem[] = [
      ...ids.map((id) => ({ key: id, fileId: id, status: "loading" as const })),
      ...local.map((p, i) => {
        const src = p.dataUrl
        return { key: `local-${i}`, status: "local" as const, src, byteLength: dataUrlByteLength(src) }
      }),
    ]
    setItems(next)
    if (!supportsV11(version)) return
    for (const id of ids) void fetchOne(id, ticket, false)
  }, [issueId, photoIds.join(","), version, fetchOne, storage, revoke])

  useEffect(() => {
    const on = () => {
      for (const it of items) if (it.fileId && it.status === "offline") void fetchOne(it.fileId, gen.current, false)
    }
    addEventListener("online", on)
    return () => removeEventListener("online", on)
  }, [items, fetchOne])

  useEffect(() => () => {
    gen.current += 1
    for (const key of [...urls.current.keys()]) revoke(key)
    urls.current.clear()
  }, [revoke])

  const retry = (key: string) => {
    broken.current.delete(key)
    if (key.startsWith("local-")) {
      const index = Number(key.slice("local-".length))
      const local = pendingLocalPhotos(issueId, storage)
      const p = local[index]
      if (p) {
        const src = p.dataUrl
        setOne(key, { status: "local", src, byteLength: dataUrlByteLength(src), code: undefined })
      }
      return
    }
    const it = itemsRef.current.find((x) => x.key === key)
    if (it?.fileId) void fetchOne(it.fileId, gen.current, true)
  }

  const markImgError = (key: string) => {
    if (broken.current.has(key)) return
    const item = itemsRef.current.find((x) => x.key === key)
    if (!item || (item.status !== "ready" && item.status !== "local")) return
    broken.current.add(key)
    revoke(key)
    setOne(key, { status: "error", src: undefined, byteLength: item.byteLength ?? 0, code: "img_error" })
    void noteImgError({ fileId: item.fileId, byteLength: item.byteLength ?? 0, cache })
  }

  return { items, retry, markImgError }
}
