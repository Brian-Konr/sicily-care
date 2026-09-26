import { Card } from "@/components/ui/card"
import { fmtTime, fmtDayLabel, relTime } from "@/lib/format"

export interface LastActivityRow {
  emoji: string
  label: string
  /** 沒有紀錄時為 undefined */
  who?: string
  ts?: string
}

/** 首頁「上次餵食／清砂：誰・幾點」 */
export function LastActivityCard({ rows, now }: { rows: LastActivityRow[]; now: Date }) {
  return (
    <Card className="gap-0 px-4 py-1">
      {rows.map((r, i) => {
        const day = r.ts ? fmtDayLabel(r.ts, now) : ""
        return (
          <div key={r.label} className={i ? "flex min-h-14 items-center gap-3 border-t" : "flex min-h-14 items-center gap-3"}>
            <span aria-hidden className="text-2xl leading-none">{r.emoji}</span>
            <span className="text-muted-foreground">{r.label}</span>
            {r.who && r.ts ? (
              <>
                <span className="text-lg font-bold">
                  {r.who} {day !== "今天" ? `${day} ` : ""}{fmtTime(r.ts)}
                </span>
                <span className="ml-auto whitespace-nowrap text-muted-foreground">{relTime(r.ts, now)}</span>
              </>
            ) : (
              <span className="text-muted-foreground">還沒有紀錄</span>
            )}
          </div>
        )
      })}
    </Card>
  )
}
