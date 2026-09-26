import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"

export interface UnsavedChangesSheetProps {
  open: boolean
  /** 目前能否儲存（有錯誤時隱藏「儲存後離開」） */
  canSave: boolean
  onSaveAndLeave: () => void
  onDiscard: () => void
  onStay: () => void
}

/** 未儲存提醒（底部 Sheet）：儲存後離開／不儲存，直接離開／繼續編輯 */
export function UnsavedChangesSheet({ open, canSave, onSaveAndLeave, onDiscard, onStay }: UnsavedChangesSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onStay()}>
      <SheetContent side="bottom" className="gap-0 px-5 pt-3" showCloseButton={false}>
        <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-input" />
        <SheetHeader className="gap-1 p-0">
          <SheetTitle className="text-xl leading-7 font-bold">還沒儲存，要離開嗎？</SheetTitle>
          <SheetDescription>剛剛改的內容還沒存起來。</SheetDescription>
        </SheetHeader>
        <div className="mt-6 grid gap-3">
          {canSave && <Button size="lg" onClick={onSaveAndLeave} autoFocus>儲存後離開</Button>}
          <Button size="lg" variant="outline" onClick={onDiscard} className="text-destructive">不儲存，直接離開</Button>
          <Button size="lg" variant="ghost" onClick={onStay} autoFocus={!canSave}>繼續編輯</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
