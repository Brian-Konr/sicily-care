import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"

export interface StepperProps {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  /** 每按一下 ± 的量（預設 1） */
  step?: number
  /** 中間可直接輸入數字（inputMode numeric）；大數字（例如 365 天）用 */
  editable?: boolean
  /** 數字後面的單位，例如「天」 */
  unit?: string
  /** 是否在外框前顯示文字標籤 */
  showLabel?: boolean
}

/** 數字 ± 調整器（每顆按鈕 44×44） */
export function Stepper({ label, value, onChange, min = 0, max = 20, step = 1, editable = false, unit, showLabel = true }: StepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const [text, setText] = useState(String(value))
  useEffect(() => setText(String(value)), [value])
  const btn = "grid size-11 flex-none place-items-center rounded-lg text-primary active:bg-accent disabled:opacity-40"
  return (
    <div className="inline-flex items-center gap-2" role="group" aria-label={label}>
      {showLabel && <span className="font-medium">{label}</span>}
      <div className="inline-flex items-center rounded-lg border border-input bg-card">
        <button type="button" className={btn} onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={step === 1 ? `${label}減一` : `${label}減 ${step}`}>
          <Minus className="size-5" aria-hidden strokeWidth={2.5} />
        </button>
        {editable ? (
          <label className="flex items-baseline gap-0.5">
            <span className="sr-only">{label}</span>
            <input
              inputMode="numeric" pattern="[0-9]*" enterKeyHint="done" value={text}
              onChange={(e) => {
                const t = e.target.value.replace(/[^0-9]/g, "")
                setText(t)
                if (t !== "") onChange(clamp(Number(t)))
              }}
              onBlur={() => setText(String(value))}
              className="h-11 w-14 bg-transparent text-center font-num text-lg font-bold outline-none"
            />
            {unit && <span aria-hidden className="pr-1 text-muted-foreground">{unit}</span>}
          </label>
        ) : (
          <output aria-live="polite" className="min-w-8 text-center font-num text-lg font-bold">{value}{unit && <span className="text-muted-foreground"> {unit}</span>}</output>
        )}
        <button type="button" className={btn} onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={step === 1 ? `${label}加一` : `${label}加 ${step}`}>
          <Plus className="size-5" aria-hidden strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}
