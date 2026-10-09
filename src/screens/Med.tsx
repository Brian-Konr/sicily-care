import { useMemo, useState } from "react"
import { Check, ChevronDown, RotateCcw } from "lucide-react"
import type { Config, MedEntry, MedKind, NetworkState } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ChoiceSingle } from "@/components/ChoiceGroup"
import { NetworkBanner } from "@/components/NetworkBanner"
import { ScreenLayout } from "@/components/ScreenLayout"
import { DueStatus } from "@/components/DueStatus"
import { dateKey, fmtDate } from "@/lib/format"
import { autoNextDue, upcomingMeds } from "@/lib/rules"

export interface MedInput {
  kind: MedKind
  product: string
  dose: string
  /** YYYY-MM-DD */
  given_date: string
  next_due: string | null
  note: string
}

export interface MedScreenProps {
  now: Date
  network: NetworkState
  queuedCount: number
  config: Config
  meds: MedEntry[]
  onBack: () => void
  /** 一鍵「已給 [上次產品]」：沿用該筆的類型、產品、劑量，今天給、自動算下次 */
  onGiveAgain: (last: MedEntry) => void
  onSubmit: (v: MedInput) => void
}

const KINDS: MedKind[] = ["體內驅蟲", "體外驅蟲", "內外同驅", "三合一疫苗", "狂犬病疫苗", "用藥"]
const d2 = (k: string) => k + "T12:00:00+08:00"

export function MedScreen(p: MedScreenProps) {
  const today = dateKey(p.now)
  const upcoming = upcomingMeds(p.meds, p.now)
  const hero = upcoming[0]
  const rest = upcoming.slice(1)

  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<MedKind>(hero?.entry.kind ?? "體內驅蟲")
  const [product, setProduct] = useState(hero?.entry.product ?? "")
  const [dose, setDose] = useState(hero?.entry.dose ?? "")
  const [given, setGiven] = useState(today)
  const [manualNext, setManualNext] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const autoNext = useMemo(() => autoNextDue(kind, given, p.config), [kind, given, p.config])
  const next = manualNext ?? autoNext ?? ""

  const pickKind = (k: MedKind) => {
    setKind(k); setManualNext(null)
    const last = [...p.meds].filter((m) => !m.deleted && m.kind === k).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))[0]
    setProduct(last?.product ?? ""); setDose(last?.dose ?? "")
  }
  const history = [...p.meds].filter((m) => !m.deleted).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))

  return (
    <ScreenLayout title="驅蟲／疫苗／用藥" onBack={p.onBack} backLabel="首頁"
      banner={<NetworkBanner network={p.network} queuedCount={p.queuedCount} />}>
      <div className="space-y-5 pt-1">
        {hero ? (
          <Card className="gap-3 px-4 py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-muted-foreground">最近要到期</p>
                <p className="text-lg font-bold">{hero.entry.kind}：{hero.entry.product}</p>
                <p className="text-muted-foreground">上次 {fmtDate(hero.entry.ts)}・{hero.entry.who}・{hero.entry.dose}</p>
              </div>
              <DueStatus daysLeft={hero.daysLeft} />
            </div>
            <Button size="lg" className="w-full whitespace-normal" onClick={() => p.onGiveAgain(hero.entry)}>
              <Check aria-hidden strokeWidth={3} />已給 {hero.entry.product}
            </Button>
            <p className="text-muted-foreground">
              點一下就記成今天給，下次日期自動排到 {autoNextDue(hero.entry.kind, today, p.config)?.replaceAll("-", "/") ?? "—"}。
            </p>
          </Card>
        ) : (
          <Card className="px-4 py-5 text-center text-muted-foreground">還沒有紀錄。展開下方表單記第一筆。</Card>
        )}

        {rest.length > 0 && (
          <section aria-labelledby="med-up" className="grid gap-2">
            <h2 id="med-up" className="text-lg font-bold">其他排程</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {rest.map((u) => (
                <li key={u.entry.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{u.entry.kind}</span>
                    <span className="block text-muted-foreground">下次 {fmtDate(d2(u.next_due))} <DueStatus daysLeft={u.daysLeft} /></span>
                  </span>
                  <Button variant="outline" size="sm" onClick={() => p.onGiveAgain(u.entry)} aria-label={`已給 ${u.entry.product}`}>
                    <Check aria-hidden />已給
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Card className="gap-0 px-4 py-2">
          <button type="button" aria-expanded={open} onClick={() => setOpen((x) => !x)}
            className="flex min-h-12 w-full items-center justify-between text-lg font-bold text-primary">
            其他類型或修改內容
            <ChevronDown className={open ? "size-6 rotate-180 transition-transform" : "size-6 transition-transform"} aria-hidden />
          </button>
          {open && (
            <div className="grid gap-5 pt-2 pb-3">
              <ChoiceSingle label="類型" options={KINDS} value={kind} layout="grid" cols={2} onChange={(v) => v && pickKind(v)} />
              <div className="grid gap-2">
                <Label htmlFor="med-product" className="font-bold">產品</Label>
                <Input id="med-product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="例如：驅蟲藥錠" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="med-dose" className="font-bold">劑量</Label>
                <Input id="med-dose" value={dose} onChange={(e) => setDose(e.target.value)} placeholder="例如：1 錠" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="med-given" className="font-bold">給的日期</Label>
                  <Input id="med-given" type="date" value={given} max={today} onChange={(e) => { setGiven(e.target.value); setManualNext(null) }} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="med-next" className="font-bold">下次日期</Label>
                  <Input id="med-next" type="date" value={next} min={given} onChange={(e) => setManualNext(e.target.value || null)} aria-describedby="med-next-hint" />
                </div>
              </div>
              <div id="med-next-hint" className="-mt-2">
                {manualNext ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">已手動修改。</span>
                    <Button variant="ghost" size="sm" onClick={() => setManualNext(null)}><RotateCcw aria-hidden />改回自動（{autoNext?.replaceAll("-", "/") ?? "不排"}）</Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    {autoNext ? `自動計算：給的日期＋${p.config.med_interval_days[kind]} 天。可以直接改。` : "用藥不自動排下次，需要的話自己填。"}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="med-note" className="font-bold">備註</Label>
                <Textarea id="med-note" placeholder="選填，例如：醫生說下次改滴劑" value={note} onChange={(e) => setNote(e.target.value)} className="min-h-12" />
              </div>
              <Button size="lg" disabled={!product.trim()} onClick={() => {
                p.onSubmit({ kind, product, dose, given_date: given, next_due: next || null, note })
                setOpen(false); setNote(""); setManualNext(null); setGiven(today)
              }}>記錄</Button>
            </div>
          )}
        </Card>

        <section aria-labelledby="med-hist" className="grid gap-2">
          <h2 id="med-hist" className="text-lg font-bold">紀錄</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {history.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <p className="font-medium">{fmtDate(m.ts)}・{m.kind}</p>
                <p className="text-muted-foreground">{m.product}・{m.dose}・{m.who}{m.next_due && `・下次 ${m.next_due.replaceAll("-", "/")}`}</p>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">間隔是示意預設值，請依獸醫建議在設定裡調整。</p>
        </section>
      </div>
    </ScreenLayout>
  )
}
