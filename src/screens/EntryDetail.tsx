import { useMemo, useRef, useState } from "react"
import { CloudOff, Pencil, RotateCcw, TriangleAlert, Undo2 } from "lucide-react"
import type { Api } from "@/api"
import type { AnyEntry, NetworkState } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { DueStatus } from "@/components/DueStatus"
import { EditEntrySheet, type EntryPatch } from "@/components/EditEntrySheet"
import { NetworkBanner } from "@/components/NetworkBanner"
import { PhotoThumb, PHOTO_WAIT, photoAria, photoCaption } from "@/components/PhotoThumb"
import { PhotoViewer, type ViewerPhoto } from "@/components/PhotoViewer"
import { ScreenLayout } from "@/components/ScreenLayout"
import { StatusBadge } from "@/components/StatusBadge"
import { UpdateNeededNote } from "@/components/UpdateNeededNote"
import { WaitHint } from "@/components/WaitHint"
import type { PhotoCache } from "@/data/photoCache"
import { useIssuePhotos } from "@/hooks/useIssuePhotos"
import { describe, detailRows } from "@/lib/describe"
import { dateKey } from "@/lib/format"
import { cn } from "@/lib/utils"

export function EntryDetailScreen({
  now, network, queuedCount, entry, pending = false, version, api, cache,
  title, backLabel, onBack, onBackToTimeline, onEdit, onUndo, onRestore,
}: {
  now: Date
  network: NetworkState
  queuedCount: number
  entry: AnyEntry | undefined
  pending?: boolean
  version: number
  api: Api
  cache: PhotoCache
  title: string
  backLabel: string
  onBack: () => void
  onBackToTimeline: () => void
  onEdit: (id: string, patch: EntryPatch) => void
  onUndo: () => void
  onRestore: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const photoIds = entry?.type === "litter" ? entry.photo_ids : []
  const photos = useIssuePhotos({
    issueId: entry?.id ?? "",
    photoIds,
    version,
    api,
    cache,
  })
  const d = entry ? describe(entry) : null
  const n = photos.items.length
  const caption = photoCaption(photos.items.map((p) => p.status))
  const v11 = version >= 2
  const viewerTitle = d?.title ?? ""

  const viewerPhotos: ViewerPhoto[] = useMemo(() => photos.items.map((p, i) => ({
    status: p.status, src: p.src, alt: photoAria(viewerTitle, i, n, p.status),
  })), [photos.items, viewerTitle, n])

  return (
    <ScreenLayout title={title} onBack={onBack} backLabel={backLabel}
      banner={<NetworkBanner network={network} queuedCount={queuedCount} />}>
      <div className="mx-auto w-full max-w-xl space-y-5 pt-1">
        {pending ? (
          <div className="grid gap-2 pt-4" aria-busy="true">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <p className="text-center text-muted-foreground">正在讀取最新紀錄⋯</p>
          </div>
        ) : !entry ? (
          <div className="grid justify-items-center gap-3 py-16 text-center">
            <p className="text-muted-foreground">找不到這筆紀錄，可能還沒載入或已經移除。</p>
            <Button variant="outline" onClick={onBackToTimeline}>回紀錄頁</Button>
          </div>
        ) : (
          <>
            <div>
              <h2 className={cn("text-xl font-bold", entry.deleted && "line-through")}>{d!.title}</h2>
              <div className="mt-1 flex flex-wrap gap-2">
                {d!.badge && <StatusBadge tone={d!.badge.tone} label={d!.badge.label} />}
                {entry.sync === "queued" && <StatusBadge tone="info" label="待上傳" icon={CloudOff} />}
                {entry.sync === "failed" && <StatusBadge tone="urgent" label="沒送出" icon={TriangleAlert} />}
                {entry.deleted && <StatusBadge tone="muted" label="已撤銷" />}
              </div>
            </div>

            <Card className="px-4 py-4">
              <dl className="grid gap-2">
                {detailRows(entry, now).map((row) => (
                  <div key={row.label} className="grid grid-cols-[5em_1fr] gap-x-3">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className={cn(row.numeric && "font-num", row.muted && "text-muted-foreground", row.pre && "whitespace-pre-wrap")}>
                      {row.text}
                      {row.daysLeft !== undefined && (
                        <div className="mt-1"><DueStatus daysLeft={row.daysLeft} /></div>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            {entry.type === "litter" && entry.photo_ids.length > 0 && (
              <section className="grid gap-2">
                <h2 className="text-lg font-bold">照片（{v11 ? n : entry.photo_ids.length}）</h2>
                {v11 ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {photos.items.map((p, i) => (
                        <PhotoThumb key={p.key} status={p.status} src={p.src}
                          onImgError={() => photos.markImgError(p.key)}
                          alt={photoAria(d!.title, i, n, p.status)} label={photoAria(d!.title, i, n, p.status)}
                          buttonRef={(el) => { thumbRefs.current[i] = el }}
                          onClick={() => {
                            openerRef.current = thumbRefs.current[i]
                            if (p.status === "error") photos.retry(p.key)
                            else if (p.status === "ready" || p.status === "local") setViewer(i)
                          }} />
                      ))}
                    </div>
                    <div aria-live="polite">
                      {caption === "wait" ? <WaitHint busy hint5={PHOTO_WAIT.hint5} hint20={PHOTO_WAIT.hint20} />
                        : caption ? <p className="text-muted-foreground">{caption}</p> : null}
                    </div>
                  </>
                ) : (
                  <UpdateNeededNote action="在 App 裡看照片" />
                )}
              </section>
            )}

            <div className="-ml-3 flex gap-1">
              {entry.deleted ? (
                <Button variant="ghost" size="sm" onClick={onRestore}><RotateCcw aria-hidden />復原</Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil aria-hidden />編輯</Button>
                  <Button variant="ghost" size="sm" onClick={onUndo}><Undo2 aria-hidden />撤銷</Button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      <EditEntrySheet entry={editing && entry ? entry : null} onClose={() => setEditing(false)}
        onSave={(id, patch) => { onEdit(id, patch); setEditing(false) }} maxDate={dateKey(now)} />
      <PhotoViewer open={viewer !== null} title={viewerTitle} photos={viewerPhotos} index={viewer ?? 0}
        onIndex={setViewer} onClose={() => setViewer(null)}
        onImgError={(i) => photos.markImgError(photos.items[i]?.key ?? "")}
        onRetry={(i) => photos.retry(photos.items[i]?.key ?? "")}
        openerRef={openerRef} />
    </ScreenLayout>
  )
}
