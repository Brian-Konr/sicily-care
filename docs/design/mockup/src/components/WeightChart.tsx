import type { WeightEntry } from "@/types"
import { fmtDate } from "@/lib/format"

/** 簡單體重折線圖（SVG，無外部套件）。資料由舊到新。 */
export function WeightChart({ entries, height = 160 }: { entries: WeightEntry[]; height?: number }) {
  const xs = entries.filter((e) => !e.deleted).sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts))
  if (xs.length < 2) return <p className="text-muted-foreground">量兩次以上就會畫出曲線。</p>
  const W = 340, H = height, padL = 48, padR = 12, padT = 16, padB = 28
  const kgs = xs.map((e) => e.kg)
  const lo = Math.floor((Math.min(...kgs) - 0.05) * 10) / 10, hi = Math.ceil((Math.max(...kgs) + 0.05) * 10) / 10
  const t0 = Date.parse(xs[0].ts), t1 = Date.parse(xs[xs.length - 1].ts)
  const px = (t: number) => padL + ((t - t0) / (t1 - t0)) * (W - padL - padR)
  const py = (kg: number) => padT + (1 - (kg - lo) / (hi - lo)) * (H - padT - padB)
  const pts = xs.map((e) => [px(Date.parse(e.ts)), py(e.kg)] as const)
  const last = xs[xs.length - 1]
  const summary = `體重從 ${fmtDate(xs[0].ts)} 的 ${xs[0].kg.toFixed(2)} kg 到 ${fmtDate(last.ts)} 的 ${last.kg.toFixed(2)} kg`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={summary}>
      {[lo, (lo + hi) / 2, hi].map((v) => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={py(v)} y2={py(v)} stroke="var(--border)" strokeWidth="1" />
          <text x={padL - 6} y={py(v) + 5} textAnchor="end" fontSize="17" fill="var(--muted-foreground)">{v.toFixed(1)}</text>
        </g>
      ))}
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === pts.length - 1 ? 6 : 4} fill={i === pts.length - 1 ? "var(--primary)" : "var(--card)"} stroke="var(--primary)" strokeWidth="2.5" />
      ))}
      <text x={padL} y={H - 6} fontSize="17" fill="var(--muted-foreground)">{fmtDate(xs[0].ts).replace(/（.）/, "")}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize="17" fill="var(--muted-foreground)">{fmtDate(last.ts).replace(/（.）/, "")}</text>
    </svg>
  )
}
