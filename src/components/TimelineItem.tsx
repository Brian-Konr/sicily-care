import { useId, type ReactNode } from "react"
import { ChevronRight, Pencil, RotateCcw, Undo2, CloudOff, TriangleAlert } from "lucide-react"
import type { AnyEntry } from "@/types"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/StatusBadge"
import { describe } from "@/lib/describe"
import { fmtTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface TimelineItemProps {
  entry: AnyEntry
  /** 顯示撤銷／復原／編輯按鈕（首頁精簡版不顯示） */
  actions?: boolean
  onOpen?: (e: AnyEntry) => void
  onUndo?: (e: AnyEntry) => void
  onRestore?: (e: AnyEntry) => void
  onEdit?: (e: AnyEntry) => void
}

/** 時間軸列：上半部可點開詳細；編輯／撤銷是兄弟元素，不包在按鈕裡。 */
export function TimelineItem({ entry, actions = false, onOpen, onUndo, onRestore, onEdit }: TimelineItemProps) {
  const d = describe(entry)
  const del = entry.deleted
  const descId = useId()
  return (
    <li className={cn(del && "bg-muted")}>
      <button
        type="button"
        onClick={() => onOpen?.(entry)}
        aria-describedby={descId}
        className={cn(
          "flex w-full min-h-14 items-start gap-3 py-3 pr-2 pl-4 text-left",
          "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "active:bg-accent",
        )}
      >
        <span className={cn("w-[3.1em] flex-none pt-0.5 font-num font-bold", del && "text-muted-foreground line-through")}>
          {fmtTime(entry.ts)}
        </span>
        <span aria-hidden className="pt-0.5 text-[22px] leading-6">{d.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium", del && "text-muted-foreground line-through")}>{d.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
            <span>{entry.who}</span>
            {d.detail && <span>・{d.detail}</span>}
            {del ? <StatusBadge tone="muted" label="已撤銷" icon={Undo2} /> : d.badge && <StatusBadge tone={d.badge.tone} label={d.badge.label} />}
            {entry.sync === "queued" && (
              <span className="inline-flex items-center gap-1 text-info"><CloudOff className="size-4" aria-hidden />待上傳</span>
            )}
            {entry.sync === "failed" && (
              <span className="inline-flex items-center gap-1 font-bold text-destructive"><TriangleAlert className="size-4" aria-hidden />沒送出</span>
            )}
          </div>
        </div>
        <ChevronRight className="size-5 flex-none self-center text-muted-foreground" aria-hidden />
      </button>
      <span id={descId} className="sr-only">打開詳細</span>
      {actions && (
        <div className="pr-3 pb-2 pl-4">
          <div className="flex gap-3">
            <span className="w-[3.1em] flex-none" aria-hidden />
            <span className="w-[22px] flex-none" aria-hidden />
            <div className="-ml-3 flex gap-1">
              {del ? (
                <Button variant="ghost" size="sm" onClick={() => onRestore?.(entry)}>
                  <RotateCcw aria-hidden />復原
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => onEdit?.(entry)}>
                    <Pencil aria-hidden />編輯
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onUndo?.(entry)}>
                    <Undo2 aria-hidden />撤銷
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  )
}

/** 列表容器 */
export function TimelineList({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <ul aria-label={label} className="divide-y overflow-hidden rounded-xl border bg-card">
      {children}
    </ul>
  )
}
