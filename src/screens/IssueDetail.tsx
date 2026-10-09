import { useMemo, useRef, useState } from "react"
import { Check, ExternalLink, Pencil, RotateCcw, Undo2 } from "lucide-react"
import type { Api } from "@/api"
import type { IssueEntry, NetworkState } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EditEntrySheet, type EntryPatch } from "@/components/EditEntrySheet"
import { NetworkBanner } from "@/components/NetworkBanner"
import { PhotoThumb, PHOTO_WAIT, photoAria, photoCaption } from "@/components/PhotoThumb"
import { PhotoViewer, type ViewerPhoto } from "@/components/PhotoViewer"
import { BottomActionBar, ScreenLayout } from "@/components/ScreenLayout"
import { StatusBadge } from "@/components/StatusBadge"
import { UpdateNeededNote } from "@/components/UpdateNeededNote"
import { WaitHint } from "@/components/WaitHint"
import type { PhotoCache } from "@/data/photoCache"
import { useIssuePhotos } from "@/hooks/useIssuePhotos"
import { dateKey, dayDiff, fmtDate, fmtFullDate, fmtTime, fmtWhen } from "@/lib/format"

function issueWhen(ts: string, now: Date): string {
  const d = dayDiff(ts, now)
  if (d >= 0 && d < 7) return fmtWhen(ts, now)
  if (dateKey(ts).slice(0, 4) === dateKey(now).slice(0, 4)) return `${fmtDate(ts)}${fmtTime(ts)}`
  return `${fmtFullDate(ts)} ${fmtTime(ts)}`
}

const sevTone = (s: IssueEntry["severity"]): "urgent" | "watch" | "info" =>
  s === "緊急" ? "urgent" : s === "要注意" ? "watch" : "info"

export function IssueDetailScreen({
  now, network, queuedCount, issue, version, api, cache, onBack,
  onEdit, onUndo, onRestore, onResolve, onReopen,
}: {
  now: Date
  network: NetworkState
  queuedCount: number
  issue: IssueEntry | undefined
  version: number
  api: Api
  cache: PhotoCache
  onBack: () => void
  onEdit: (id: string, patch: EntryPatch) => void
  onUndo: () => void
  onRestore: () => void
  onResolve: () => void
  onReopen: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [viewer, setViewer] = useState<number | null>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([])
  const title = issue ? `${issue.category}${issue.sub ? `・${issue.sub}` : ""}` : ""
  const photos = useIssuePhotos({
    issueId: issue?.id ?? "",
    photoIds: issue?.photo_ids ?? [],
    version,
    api,
    cache,
  })
  const n = photos.items.length
  const caption = photoCaption(photos.items.map((p) => p.status))
  const driveUrl = issue?.photo_urls.find((u) => u) ?? ""
  const v11 = version >= 2
  const showPhotos = issue && (n > 0 || ((issue.photo_ids.length > 0 || issue.photo_urls.some(Boolean)) && !v11))

  const viewerPhotos: ViewerPhoto[] = useMemo(() => photos.items.map((p, i) => ({
    status: p.status, src: p.src, alt: photoAria(title, i, n, p.status),
  })), [photos.items, title, n])

  if (!issue) {
    return (
      <ScreenLayout title="異常詳情" onBack={onBack} backLabel="異常回報">
        <div className="grid justify-items-center gap-3 py-16 text-center">
          <p className="text-muted-foreground">找不到這筆回報，可能已經撤銷了。</p>
          <Button variant="outline" onClick={onBack}>回異常回報</Button>
        </div>
      </ScreenLayout>
    )
  }

  return (
    <ScreenLayout title="異常詳情" onBack={onBack} backLabel="異常回報"
      banner={<NetworkBanner network={network} queuedCount={queuedCount} />}
      bottom={!issue.deleted ? (
        <BottomActionBar>
          {issue.resolved
            ? <Button variant="outline" size="lg" className="w-full" onClick={onReopen}><RotateCcw aria-hidden />改回未解決</Button>
            : <Button size="lg" className="w-full" onClick={onResolve}><Check aria-hidden />標記已解決</Button>}
        </BottomActionBar>
      ) : undefined}>
      <div className="space-y-5 pt-1">
        <div>
          <h2 className={`text-xl font-bold ${issue.deleted ? "line-through" : ""}`}>{title}</h2>
          <div className="mt-1 flex flex-wrap gap-2">
            <StatusBadge tone={sevTone(issue.severity)} label={issue.severity} />
            <StatusBadge tone={issue.resolved ? "ok" : "pending"} label={issue.resolved ? "已解決" : "還沒解決"} />
            {issue.deleted && <StatusBadge tone="muted" label="已撤銷" />}
          </div>
        </div>

        <Card className="px-4 py-4">
          <dl className="grid gap-2">
            <div className="grid grid-cols-[5em_1fr] gap-x-3"><dt className="text-muted-foreground">時間</dt><dd>{issueWhen(issue.ts, now)}</dd></div>
            <div className="grid grid-cols-[5em_1fr] gap-x-3"><dt className="text-muted-foreground">記錄人</dt><dd>{issue.who}</dd></div>
            <div className="grid grid-cols-[5em_1fr] gap-x-3"><dt className="text-muted-foreground">備註</dt>
              <dd className={issue.note ? "whitespace-pre-wrap" : "text-muted-foreground"}>{issue.note || "沒有備註"}</dd></div>
          </dl>
        </Card>

        {showPhotos && (
          <section className="grid gap-2">
            <h2 className="text-lg font-bold">照片（{v11 ? n : issue.photo_ids.length || issue.photo_urls.filter(Boolean).length}）</h2>
            {v11 ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {photos.items.map((p, i) => (
                    <PhotoThumb key={p.key} status={p.status} src={p.src}
                      onImgError={() => photos.markImgError(p.key)}
                      alt={photoAria(title, i, n, p.status)} label={photoAria(title, i, n, p.status)}
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
            {driveUrl && (
              <Button variant="link" asChild className="justify-start px-0">
                <a href={driveUrl} target="_blank" rel="noopener noreferrer"><ExternalLink aria-hidden />在 Google Drive 開啟</a>
              </Button>
            )}
          </section>
        )}

        <div className="-ml-3 flex gap-1">
          {issue.deleted ? (
            <Button variant="ghost" size="sm" onClick={onRestore}><RotateCcw aria-hidden />復原</Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil aria-hidden />編輯</Button>
              <Button variant="ghost" size="sm" onClick={onUndo}><Undo2 aria-hidden />撤銷</Button>
            </>
          )}
        </div>
      </div>

      <EditEntrySheet entry={editing ? { type: "issue", ...issue } : null} onClose={() => setEditing(false)}
        onSave={(id, patch) => { onEdit(id, patch); setEditing(false) }} maxDate={dateKey(now)} />
      <PhotoViewer open={viewer !== null} title={title} photos={viewerPhotos} index={viewer ?? 0}
        onIndex={setViewer} onClose={() => setViewer(null)}
        onImgError={(i) => photos.markImgError(photos.items[i]?.key ?? "")}
        onRetry={(i) => photos.retry(photos.items[i]?.key ?? "")}
        openerRef={openerRef} />
    </ScreenLayout>
  )
}
