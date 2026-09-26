import { useState } from "react"
import type { Config, NetworkState, WeighMethod, WeightEntry } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChoiceSingle } from "@/components/ChoiceGroup"
import { NetworkBanner } from "@/components/NetworkBanner"
import { BottomActionBar, ScreenLayout } from "@/components/ScreenLayout"
import { OverdueDot } from "@/components/SummaryCard"
import { WeightChart } from "@/components/WeightChart"
import { fmtDate, fmtDiff } from "@/lib/format"
import { weightSummary } from "@/lib/rules"

export interface WeightScreenProps {
  now: Date
  network: NetworkState
  queuedCount: number
  config: Config
  weights: WeightEntry[]
  onBack: () => void
  onSubmit: (v: { kg: number; method: WeighMethod; note: string }) => void
}

const METHODS: WeighMethod[] = ["寵物秤", "抱著量扣人重"]
const parseKg = (s: string) => {
  const n = Number(s.replace(",", "."))
  return s.trim() && Number.isFinite(n) ? n : null
}

export function WeightScreen(p: WeightScreenProps) {
  const [kg, setKg] = useState("")
  const [both, setBoth] = useState("")
  const [person, setPerson] = useState("")
  const [method, setMethod] = useState<WeighMethod>("寵物秤")
  const [note, setNote] = useState("")

  const ws = weightSummary(p.weights, p.config, p.now)
  const value = method === "寵物秤" ? parseKg(kg)
    : (() => { const a = parseKg(both), b = parseKg(person); return a !== null && b !== null ? +(a - b).toFixed(2) : null })()
  const invalid = value !== null && !(value > 0.3 && value < 15)
  const diff = value !== null && !invalid && ws ? +(value - ws.last.kg).toFixed(2) : null
  const history = [...p.weights].filter((e) => !e.deleted).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))

  const submit = () => {
    if (value === null || invalid) return
    p.onSubmit({ kg: Math.round(value * 100) / 100, method, note })
    setKg(""); setBoth(""); setPerson(""); setNote("")
  }

  return (
    <ScreenLayout title="體重" onBack={p.onBack} backLabel="首頁"
      banner={<NetworkBanner network={p.network} queuedCount={p.queuedCount} />}
      bottom={<BottomActionBar><Button size="lg" className="w-full" disabled={value === null || invalid} onClick={submit}>記錄體重</Button></BottomActionBar>}>
      <div className="space-y-5 pt-1">
        {ws && (
          <Card className="gap-1 px-4 py-4">
            <p className="text-muted-foreground">上次（{ws.last.who}・{fmtDate(ws.last.ts)}）</p>
            <p className="font-num text-3xl font-bold">{ws.last.kg.toFixed(2)} kg</p>
            <p className="text-muted-foreground">{ws.diff !== null && <>比前一次 {fmtDiff(ws.diff)}・</>}{ws.daysAgo} 天前量</p>
            <p className="mt-1">
              {ws.overdue
                ? <OverdueDot>已經 {ws.daysAgo} 天沒量了（建議每 {p.config.weight_interval_days} 天量一次）</OverdueDot>
                : <span className="text-muted-foreground">建議每 {p.config.weight_interval_days} 天量一次，{ws.dueInDays === 0 ? "今天該量了" : `${ws.dueInDays} 天後再量`}</span>}
            </p>
          </Card>
        )}

        <Card className="gap-4 px-4 py-4">
          <h2 className="text-lg font-bold">這次量到</h2>
          <ChoiceSingle label="量法" options={METHODS} value={method} layout="grid" cols={2} onChange={(v) => v && setMethod(v)} />
          {method === "寵物秤" ? (
            <div className="grid gap-2">
              <Label htmlFor="kg" className="font-bold">體重（公斤）</Label>
              <div className="flex items-center gap-2">
                <Input id="kg" inputMode="decimal" enterKeyHint="done" autoComplete="off" placeholder="0.00" value={kg}
                  onChange={(e) => setKg(e.target.value)} aria-invalid={invalid} aria-describedby="kg-diff"
                  className="h-16 text-center font-num text-3xl font-bold placeholder:font-normal" />
                <span className="text-lg font-bold">kg</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="kg-both" className="font-bold">抱著貓</Label>
                <Input id="kg-both" inputMode="decimal" placeholder="kg" value={both} onChange={(e) => setBoth(e.target.value)} className="font-num text-lg" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kg-person" className="font-bold">人自己</Label>
                <Input id="kg-person" inputMode="decimal" placeholder="kg" value={person} onChange={(e) => setPerson(e.target.value)} className="font-num text-lg" />
              </div>
              {value !== null && !invalid && <p className="col-span-2 text-lg">算出來：<b className="font-num">{value.toFixed(2)} kg</b></p>}
            </div>
          )}
          <p id="kg-diff" aria-live="polite" className="min-h-6">
            {invalid ? <span className="font-bold text-destructive">數字好像不太對，請再確認（0.3～15 kg）</span>
              : diff !== null ? <span className="font-bold">比上次 {fmtDiff(diff)} kg</span>
              : <span className="text-muted-foreground">輸入後會顯示跟上次的差值</span>}
          </p>
          <div className="grid gap-2">
            <Label htmlFor="w-note" className="font-bold">備註</Label>
            <Textarea id="w-note" placeholder="選填" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-12" />
          </div>
        </Card>

        <section aria-labelledby="w-hist" className="grid gap-3">
          <h2 id="w-hist" className="text-lg font-bold">成長紀錄</h2>
          <Card className="px-3 py-3"><WeightChart entries={p.weights} /></Card>
          <ul className="divide-y rounded-xl border bg-card">
            {history.map((e, i) => {
              const prev = history[i + 1]
              return (
                <li key={e.id} className="flex min-h-12 items-center gap-3 px-4 py-2">
                  <span className="w-[6.5em]">{fmtDate(e.ts)}</span>
                  <span className="font-num text-lg font-bold">{e.kg.toFixed(2)}</span>
                  <span className="text-muted-foreground">{prev ? fmtDiff(e.kg - prev.kg) : "—"}</span>
                  <span className="ml-auto text-muted-foreground">{e.who}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </ScreenLayout>
  )
}
