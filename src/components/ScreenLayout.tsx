import type { ReactNode, Ref, UIEventHandler } from "react"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SampleBadge } from "@/components/SampleBadge"
import { cn } from "@/lib/utils"

export interface ScreenLayoutProps {
  /** 子畫面標題；首頁不傳，用 header 自訂 */
  title?: string
  /** 有傳才顯示返回鍵 */
  onBack?: () => void
  backLabel?: string
  /** 取代預設標題列（首頁用） */
  header?: ReactNode
  /** 標題列下方的橫幅（離線、錯誤） */
  banner?: ReactNode
  /** 橫幅下方、跟標題列一起固定（篩選晶片列） */
  toolbar?: ReactNode
  /** 固定在底部拇指區：主要按鈕列或 BottomNav */
  bottom?: ReactNode
  /** 是否顯示「示意資料」徽章（原型預設 true；正式 App 傳 false） */
  sample?: boolean
  mainRef?: Ref<HTMLElement>
  onMainScroll?: UIEventHandler<HTMLElement>
  children: ReactNode
  className?: string
}

/** 畫面骨架：安全區、標題列、可捲動內容、底部拇指區。 */
export function ScreenLayout({ title, onBack, backLabel = "返回", header, banner, toolbar, bottom, sample = true, mainRef, onMainScroll, children, className }: ScreenLayoutProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <header className="sticky top-0 z-10 bg-background pt-[var(--safe-top)]">
        {header ?? (
          <div className="flex min-h-14 items-center gap-1 pr-4 pl-1">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="px-2" aria-label={backLabel}>
                <ChevronLeft className="size-6" aria-hidden />
                <span>{backLabel}</span>
              </Button>
            )}
            <h1 className={cn("flex-1 truncate text-xl font-bold", !onBack && "pl-3")}>{title}</h1>
            {sample && <SampleBadge />}
          </div>
        )}
        {banner && <div className="px-4 pb-2">{banner}</div>}
        {toolbar && <div className="px-4 pb-2">{toolbar}</div>}
      </header>
      <main ref={mainRef} onScroll={onMainScroll} className={cn("relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6", className)}>{children}</main>
      {bottom}
    </div>
  )
}

/** 底部固定按鈕列（子畫面的主要動作放這裡，落在拇指區） */
export function BottomActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex-none border-t bg-card px-4 pt-3 pb-[calc(var(--safe-bottom)+0.5rem)]">{children}</div>
  )
}
