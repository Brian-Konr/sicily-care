import { cn } from "@/lib/utils"

export interface ActionTileProps {
  emoji: string
  label: string
  hint?: string
  /** 紅點提醒（例如體重逾期）；一定要附文字，不只靠顏色 */
  alert?: string
  variant?: "default" | "primary"
  onClick: () => void
}

/** 首頁大按鈕磚（≥96px 高）。primary 橫跨兩欄，給最常用的動作。 */
export function ActionTile({ emoji, label, hint, alert, variant = "default", onClick }: ActionTileProps) {
  const primary = variant === "primary"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[var(--tile-min-h)] flex-col items-start justify-between rounded-xl border bg-card p-3 pl-4 text-left shadow-sm transition-transform active:scale-[0.97] motion-reduce:active:scale-100",
        primary && "col-span-2 flex-row items-center justify-start gap-4 border-primary bg-primary text-primary-foreground",
      )}
    >
      <span aria-hidden className={cn("leading-none", primary ? "text-[40px]" : "text-[32px]")}>{emoji}</span>
      <span className="flex flex-col">
        <span className="text-lg font-bold">{label}</span>
        {hint && <span className={cn(primary ? "text-primary-foreground" : "text-muted-foreground")}>{hint}</span>}
        {alert && (
          <span className="flex items-center gap-1.5 font-bold text-destructive">
            <span aria-hidden className="size-2.5 rounded-full bg-destructive" />
            {alert}
          </span>
        )}
      </span>
    </button>
  )
}
