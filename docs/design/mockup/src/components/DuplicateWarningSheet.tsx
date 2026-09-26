import { TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export interface DuplicateWarningSheetProps {
  open: boolean
  who: string
  minutesAgo: number
  /** 食物類別，例如「零食」「副食罐」 */
  kindLabel: string
  /** 上一筆的內容，例如「18:05・Hello Fresh 鯖魚 1 罐」 */
  previous: string
  onCancel: () => void
  onConfirm: () => void
}

/** 2 小時內同類重複記錄提醒（底部 Sheet，不用置中對話框） */
export function DuplicateWarningSheet({ open, who, minutesAgo, kindLabel, previous, onCancel, onConfirm }: DuplicateWarningSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onCancel()}>
      <SheetContent side="bottom" className="gap-0 px-5 pt-3" showCloseButton={false}>
        <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-input" />
        <SheetHeader className="gap-2 p-0">
          <span className="grid size-12 place-items-center rounded-full bg-warning-soft text-warning-soft-foreground">
            <TriangleAlert className="size-7" aria-hidden />
          </span>
          <SheetTitle className="text-xl leading-7 font-bold">
            {who} {minutesAgo < 1 ? "剛剛" : `${minutesAgo} 分鐘前`}給過{kindLabel}，還要記錄嗎？
          </SheetTitle>
          <SheetDescription>上一筆：{previous}</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-3">
          <Button size="lg" onClick={onCancel} autoFocus>不用了，不記錄</Button>
          <Button size="lg" variant="outline" onClick={onConfirm}>還是要記錄</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
