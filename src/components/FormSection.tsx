import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/** 設定表單分組：標題＋說明＋卡片（內含多個 FormRow，以分隔線隔開），類似 iOS「設定」 */
export function FormSection({ title, description, badge, children, id }: {
  title: string
  description?: ReactNode
  /** 標題右側徽章（例如「示意」「選填」） */
  badge?: ReactNode
  children: ReactNode
  id?: string
}) {
  const hid = id ? `${id}-title` : undefined
  return (
    <section aria-labelledby={hid} className="grid gap-2">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 id={hid} className="text-lg font-bold">{title}</h2>
        {badge}
      </div>
      <div className="divide-y rounded-xl border bg-card">{children}</div>
      {description && <div className="px-1 text-muted-foreground">{description}</div>}
    </section>
  )
}

/**
 * 表單列：左標籤、右控制項；`stack` 時標籤在上、控制項滿版（輸入框用）。
 * 列高 ≥56，整列 padding 16。htmlFor 讓點標籤也能聚焦／切換；inline 列的標籤撐滿左側，
 * 所以 Switch 列整列（標籤＋開關）都是點擊區。
 */
export function FormRow({ label, htmlFor, hint, error, children, stack = false, className }: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  stack?: boolean
  className?: string
}) {
  const Label = htmlFor ? "label" : "span"
  return (
    <div className={cn("px-4 py-3", className)}>
      <div className={cn(stack ? "grid gap-2" : "flex min-h-11 items-center justify-between gap-3")}>
        <Label {...(htmlFor ? { htmlFor } : {})}
          className={cn("font-medium", !stack && "flex min-h-11 flex-1 items-center self-stretch")}>{label}</Label>
        {children}
      </div>
      {error && <p role="alert" className="mt-1.5 font-bold text-destructive">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-muted-foreground">{hint}</p>}
    </div>
  )
}
