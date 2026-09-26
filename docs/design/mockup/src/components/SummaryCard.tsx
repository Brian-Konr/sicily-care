import type { ReactNode } from "react"
import { ChevronRight } from "lucide-react"

export interface SummaryCardProps {
  emoji: string
  title: string
  value: ReactNode
  meta?: ReactNode
  /** 狀態列（例如逾期紅點＋文字） */
  status?: ReactNode
  onClick: () => void
}

/** 可點的摘要卡（體重、下次驅蟲） */
export function SummaryCard({ emoji, title, value, meta, status, onClick }: SummaryCardProps) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm active:bg-muted">
      <span aria-hidden className="text-[28px] leading-none">{emoji}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-muted-foreground">{title}</span>
        <span className="block font-num text-2xl font-bold">{value}</span>
        {meta && <span className="block text-muted-foreground">{meta}</span>}
        {status && <span className="mt-1 block">{status}</span>}
      </span>
      <ChevronRight className="size-6 flex-none text-muted-foreground" aria-hidden />
    </button>
  )
}

/** 紅點＋文字（逾期）；顏色之外一定有文字 */
export function OverdueDot({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-bold text-destructive">
      <span aria-hidden className="size-2.5 flex-none rounded-full bg-destructive" />
      {children}
    </span>
  )
}
