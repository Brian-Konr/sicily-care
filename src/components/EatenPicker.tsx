import type { EatenPct } from "@/types"
import { EATEN_OPTIONS } from "@/lib/rules"
import { cn } from "@/lib/utils"

/** 份量圖示：圓餅填滿比例＝吃了多少（搭配文字，不只靠圖） */
function Pie({ pct }: { pct: number }) {
  const r = 9, c = 11
  const a = (pct / 100) * 2 * Math.PI
  const x = c + r * Math.sin(a), y = c - r * Math.cos(a)
  return (
    <svg viewBox="0 0 22 22" className="size-[22px]" aria-hidden>
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth="2" />
      {pct === 100 && <circle cx={c} cy={c} r={r} fill="currentColor" />}
      {pct > 0 && pct < 100 && <path d={`M${c} ${c} L${c} ${c - r} A${r} ${r} 0 ${pct > 50 ? 1 : 0} 1 ${x} ${y} Z`} fill="currentColor" />}
    </svg>
  )
}

export interface EatenPickerProps {
  value: EatenPct | null
  onChange: (pct: EatenPct) => void
  /** 給螢幕閱讀器的題目，例如「18:05 的罐罐吃了多少」 */
  label: string
}

/** 吃了多少：全吃完／吃大半／一半／一點點／沒吃（一次點擊就送出） */
export function EatenPicker({ value, onChange, label }: EatenPickerProps) {
  return (
    <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1.5">
      {EATEN_OPTIONS.map((o) => {
        const on = value === o.pct
        return (
          <button
            key={o.pct}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.pct)}
            className={cn(
              "flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-input bg-card px-0.5 whitespace-nowrap transition-transform active:scale-[0.96] motion-reduce:active:scale-100",
              on && "border-primary bg-primary font-bold text-primary-foreground",
            )}
          >
            <Pie pct={o.pct} />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
