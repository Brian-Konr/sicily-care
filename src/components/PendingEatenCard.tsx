import type { EatenPct, FeedEntry } from "@/types"
import { Card } from "@/components/ui/card"
import { EatenPicker } from "@/components/EatenPicker"
import { fmtTime, relTime } from "@/lib/format"

export interface PendingEatenCardProps {
  entry: FeedEntry
  now: Date
  onPick: (entryId: string, pct: EatenPct) => void
  /** 另外還有幾筆待填（顯示「還有 N 筆」） */
  moreCount?: number
  onShowMore?: () => void
}

export function pendingQuestion(e: FeedEntry) {
  const what = e.unit === "罐" ? "罐罐" : e.food_name.replace(/（示意）$/, "")
  return `${fmtTime(e.ts)} 的${what}吃了多少？`
}

/** 待填剩食卡：虛線外框＝還沒完成；點一個選項就完成 */
export function PendingEatenCard({ entry, now, onPick, moreCount = 0, onShowMore }: PendingEatenCardProps) {
  const q = pendingQuestion(entry)
  return (
    <Card className="gap-3 border-2 border-dashed border-primary px-4 py-4 shadow-none">
      <div>
        <p className="text-lg font-bold">{q}</p>
        <p className="text-muted-foreground">
          {entry.who} 記錄・{entry.food_name} {entry.qty} {entry.unit}・<span className="whitespace-nowrap">{relTime(entry.ts, now)}</span>
        </p>
      </div>
      <EatenPicker value={entry.eaten_pct} onChange={(p) => onPick(entry.id, p)} label={q} />
      {moreCount > 0 && (
        <button type="button" onClick={onShowMore} className="min-h-11 text-left font-medium text-primary">
          還有 {moreCount} 筆待填 ›
        </button>
      )}
    </Card>
  )
}
