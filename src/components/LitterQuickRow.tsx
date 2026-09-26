import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Stepper } from "@/components/Stepper"

export interface LitterQuickRowProps {
  urine: number
  stool: number
  onChange: (next: { urine: number; stool: number }) => void
  /** 一次點擊完成：以目前數字記錄「一切正常」 */
  onConfirm: () => void
}

/** 清砂一鍵列：尿塊 [2]・便 [1]・正常 ✓（數字預填上次值） */
export function LitterQuickRow({ urine, stool, onChange, onConfirm }: LitterQuickRowProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stepper label="尿塊" value={urine} onChange={(v) => onChange({ urine: v, stool })} />
        <Stepper label="便" value={stool} onChange={(v) => onChange({ urine, stool: v })} />
      </div>
      <Button variant="success" size="lg" className="w-full" onClick={onConfirm}>
        一切正常
        <Check aria-hidden strokeWidth={3} />
      </Button>
    </div>
  )
}
