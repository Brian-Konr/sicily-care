import { History, House } from "lucide-react"
import { cn } from "@/lib/utils"

export type BottomNavTarget = "home" | "timeline"

export interface BottomNavProps {
  current: BottomNavTarget
  onNavigate: (to: BottomNavTarget) => void
}

const ITEMS: { id: BottomNavTarget; label: string; Icon: typeof House }[] = [
  { id: "home", label: "首頁", Icon: House },
  { id: "timeline", label: "紀錄", Icon: History },
]

export function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav aria-label="主要導覽" className="grid flex-none grid-cols-2 border-t bg-card pb-[var(--safe-bottom)]">
      {ITEMS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onNavigate(id)}
          aria-current={current === id ? "page" : undefined}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center gap-0.5 font-medium text-muted-foreground",
            current === id && "font-bold text-primary",
          )}
        >
          <Icon className="size-6" aria-hidden strokeWidth={current === id ? 2.5 : 2} />
          {label}
        </button>
      ))}
    </nav>
  )
}
