import { useLayoutEffect, useRef, useState, type Ref, type UIEventHandler } from "react"
import type { AnyEntry, NetworkState } from "@/types"
import { BottomNav } from "@/components/BottomNav"
import { DayHeader } from "@/components/DayHeader"
import { EditEntrySheet, type EntryPatch } from "@/components/EditEntrySheet"
import { FilterChips } from "@/components/FilterChips"
import { ListEndState, type ListEndKind } from "@/components/ListEndState"
import { NetworkBanner } from "@/components/NetworkBanner"
import { ScreenLayout } from "@/components/ScreenLayout"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { TimelineItem, TimelineList } from "@/components/TimelineItem"
import { dateKey, fmtDate } from "@/lib/format"
import { matchesFilter, type TimelineFilter } from "@/lib/history"

export interface TimelineScreenProps {
  now: Date
  network: NetworkState
  queuedCount: number
  failedCount: number
  entries: AnyEntry[]
  loading: boolean
  filters: TimelineFilter[]
  onFilters: (v: TimelineFilter[]) => void
  from: string
  end: ListEndKind
  mainRef?: Ref<HTMLElement>
  onMainScroll?: UIEventHandler<HTMLElement>
  scrollTop: number
  onHome: () => void
  onOpen: (e: AnyEntry) => void
  onUndo: (e: AnyEntry) => void
  onRestore: (e: AnyEntry) => void
  onEdit: (id: string, patch: EntryPatch) => void
  onRetrySync: () => void
}

export function TimelineScreen(p: TimelineScreenProps) {
  const [editing, setEditing] = useState<AnyEntry | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const el = restoreRef.current
    if (el) el.scrollTop = p.scrollTop
  }, [])

  const setMainRef = (node: HTMLElement | null) => {
    restoreRef.current = node
    const r = p.mainRef
    if (typeof r === "function") r(node)
    else if (r) (r as { current: HTMLElement | null }).current = node
  }

  const items = [...p.entries].filter((e) => matchesFilter(e.type, p.filters))
    .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
  const groups: { key: string; items: AnyEntry[] }[] = []
  for (const e of items) {
    const key = dateKey(e.ts)
    const g = groups.find((x) => x.key === key)
    if (g) g.items.push(e)
    else groups.push({ key, items: [e] })
  }

  const emptyAll = p.filters.length === 0 && items.length === 0 && !p.loading
  const emptyFilter = p.filters.length > 0 && items.length === 0 && !p.loading

  return (
    <ScreenLayout title="紀錄" mainRef={setMainRef} onMainScroll={p.onMainScroll}
      toolbar={<FilterChips filters={p.filters} onChange={p.onFilters} />}
      banner={<NetworkBanner network={p.network} queuedCount={p.queuedCount} failedCount={p.failedCount} onRetry={p.onRetrySync} />}
      bottom={<BottomNav current="timeline" onNavigate={(to) => { if (to === "home") p.onHome() }} />}>
      <div className="pt-1">
        <p className="text-muted-foreground">點「撤銷」會劃掉，不會真的刪除，隨時可以復原。</p>
        {p.loading && (
          <div className="grid gap-2 pt-4" aria-busy="true">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <p className="text-center text-muted-foreground">正在讀取最新紀錄⋯</p>
          </div>
        )}
        {emptyAll && <p className="py-10 text-center text-muted-foreground">還沒有紀錄。</p>}
        {emptyFilter && (
          <div className="grid justify-items-center gap-2 py-10">
            <p className="text-center text-muted-foreground">{fmtDate(p.from)}以來沒有「{p.filters.join("、")}」紀錄。</p>
            <Button variant="ghost" size="sm" onClick={() => p.onFilters([])}>看全部類型</Button>
          </div>
        )}
        {groups.map((g) => (
          <section key={g.key} aria-label={g.key}>
            <DayHeader iso={g.items[0].ts} now={p.now} />
            <TimelineList>
              {g.items.map((e) => (
                <TimelineItem key={e.id} entry={e} actions onOpen={p.onOpen} onUndo={p.onUndo} onRestore={p.onRestore} onEdit={setEditing} />
              ))}
            </TimelineList>
          </section>
        ))}
        <ListEndState {...p.end} />
      </div>
      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onSave={(id, patch) => { p.onEdit(id, patch); setEditing(null) }}
        maxDate={dateKey(p.now)} />
    </ScreenLayout>
  )
}
