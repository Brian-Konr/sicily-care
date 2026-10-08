import { useState, type ReactNode } from "react"
import { CloudOff, TriangleAlert } from "lucide-react"
import type { CareEntry, CareKind, Config } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { RecurringItemRow } from "@/components/RecurringItemRow"
import { UpdateNeededNote } from "@/components/UpdateNeededNote"
import { CARE_ITEMS, careStatus, careSummary, lastDoneLine } from "@/lib/care"

export function CareCard({
  cares, config, version, now, onLogCare, onOpenCareHistory,
}: {
  cares: CareEntry[]
  config: Config
  version: number
  now: Date
  onLogCare: (kind: CareKind, onUndo: () => void) => void
  onOpenCareHistory: () => void
}) {
  const [locked, setLocked] = useState<Partial<Record<CareKind, boolean>>>({})

  const rows = CARE_ITEMS.map((it) => {
    const interval = Number(config[it.configKey]) || 30
    return { ...it, ...careStatus(cares, it.kind, interval, now) }
  })

  return (
    <Card className="gap-0 p-0">
      <div className="flex items-center px-4 pt-4 pb-1">
        <h2 className="text-lg font-bold"><span aria-hidden>🧽</span> 居家維護</h2>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={onOpenCareHistory}>紀錄 ›</Button>
      </div>
      {version < 2 ? (
        <div className="px-4 pt-2 pb-4"><UpdateNeededNote action="記錄居家維護" /></div>
      ) : (
        <>
          <p className="px-4 pb-3 text-muted-foreground">{careSummary(rows)}</p>
          <ul className="divide-y border-t">
            {rows.map((it) => {
              const last: ReactNode = (() => {
                const text = lastDoneLine(it.last, now)
                if (!it.last) return text
                if (it.last.sync === "queued") {
                  return <span className="inline-flex flex-wrap items-center gap-1">{text}<span className="inline-flex items-center gap-1 text-info"><CloudOff className="size-4" aria-hidden />・待上傳</span></span>
                }
                if (it.last.sync === "failed") {
                  return <span className="inline-flex flex-wrap items-center gap-1">{text}<span className="inline-flex items-center gap-1 font-bold text-destructive"><TriangleAlert className="size-4" aria-hidden />沒送出</span></span>
                }
                return text
              })()
              return (
                <RecurringItemRow key={it.kind} name={it.label} daysLeft={it.daysLeft} lastLine={last}
                  buttonLabel={it.action} ariaLabel={`${it.action}：${it.label}`} disabled={!!locked[it.kind]}
                  onPress={() => {
                    setLocked((m) => ({ ...m, [it.kind]: true }))
                    const t = window.setTimeout(() => setLocked((m) => ({ ...m, [it.kind]: false })), 5000)
                    onLogCare(it.kind, () => { clearTimeout(t); setLocked((m) => ({ ...m, [it.kind]: false })) })
                  }} />
              )
            })}
          </ul>
        </>
      )}
    </Card>
  )
}
