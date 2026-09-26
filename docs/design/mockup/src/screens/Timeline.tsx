import { useState } from "react"
import type { AnyEntry, EntryType, NetworkState } from "@/types"
import { BottomNav } from "@/components/BottomNav"
import { ChoiceSingle } from "@/components/ChoiceGroup"
import { EditEntrySheet, type EntryPatch } from "@/components/EditEntrySheet"
import { NetworkBanner } from "@/components/NetworkBanner"
import { ScreenLayout } from "@/components/ScreenLayout"
import { TimelineItem, TimelineList } from "@/components/TimelineItem"
import { fmtDayLabel } from "@/lib/format"
import { timelineItems } from "@/lib/rules"

export interface TimelineScreenProps {
  now: Date
  network: NetworkState
  queuedCount: number
  failedCount: number
  /** 所有類型的紀錄（含 deleted=TRUE），畫面自己篩 7 天 */
  entries: AnyEntry[]
  onHome: () => void
  /** 撤銷＝軟刪除（deleted=TRUE），不刪列 */
  onUndo: (e: AnyEntry) => void
  onRestore: (e: AnyEntry) => void
  onEdit: (id: string, patch: EntryPatch) => void
  onRetrySync: () => void
}

const FILTERS = ["全部", "餵食", "清砂", "體重", "用藥", "異常"] as const
type Filter = (typeof FILTERS)[number]
const FILTER_TYPE: Record<Exclude<Filter, "全部">, EntryType> = { "餵食": "feed", "清砂": "litter", "體重": "weight", "用藥": "med", "異常": "issue" }

export function TimelineScreen(p: TimelineScreenProps) {
  const [filter, setFilter] = useState<Filter>("全部")
  const [editing, setEditing] = useState<AnyEntry | null>(null)

  const items = timelineItems(p.entries, p.now).filter((e) => filter === "全部" || e.type === FILTER_TYPE[filter])
  const groups: { label: string; items: AnyEntry[] }[] = []
  for (const e of items) {
    const label = fmtDayLabel(e.ts, p.now)
    const g = groups.find((x) => x.label === label)
    if (g) g.items.push(e)
    else groups.push({ label, items: [e] })
  }

  return (
    <ScreenLayout title="7 天紀錄"
      banner={<NetworkBanner network={p.network} queuedCount={p.queuedCount} failedCount={p.failedCount} onRetry={p.onRetrySync} />}
      bottom={<BottomNav current="timeline" onNavigate={(to) => { if (to === "home") p.onHome() }} />}>
      <div className="pt-1">
        <ChoiceSingle label="篩選" hideLabel options={FILTERS} value={filter} onChange={(v) => setFilter(v ?? "全部")} className="gap-2" />
        <p className="mt-3 text-muted-foreground">點「撤銷」會劃掉，不會真的刪除，隨時可以復原。</p>
        {groups.length === 0 && <p className="py-10 text-center text-muted-foreground">這 7 天沒有{filter === "全部" ? "" : filter}紀錄。</p>}
        {groups.map((g) => (
          <section key={g.label} aria-label={g.label}>
            <h2 className="mt-5 mb-2 font-bold text-muted-foreground">{g.label}</h2>
            <TimelineList>
              {g.items.map((e) => (
                <TimelineItem key={e.id} entry={e} actions onUndo={p.onUndo} onRestore={p.onRestore} onEdit={setEditing} />
              ))}
            </TimelineList>
          </section>
        ))}
      </div>
      <EditEntrySheet entry={editing} onClose={() => setEditing(null)} onSave={(id, patch) => { p.onEdit(id, patch); setEditing(null) }} />
    </ScreenLayout>
  )
}
