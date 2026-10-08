import { useState } from "react"
import { Check, ChevronRight, Eye, OctagonAlert, RotateCcw, TriangleAlert } from "lucide-react"
import type { IssueCategory, IssueEntry, NetworkState, PhotoDraft, Severity, VomitSub } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ChoiceSingle } from "@/components/ChoiceGroup"
import { NetworkBanner } from "@/components/NetworkBanner"
import { PhotoSlots } from "@/components/PhotoSlots"
import { BottomActionBar, ScreenLayout } from "@/components/ScreenLayout"
import { StatusBadge } from "@/components/StatusBadge"
import { UrgentVetAlert } from "@/components/UrgentVetAlert"
import { fmtWhen } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface IssueInput {
  category: IssueCategory
  sub: VomitSub | null
  severity: Severity
  photos: PhotoDraft[]
  note: string
}

export interface IssueScreenProps {
  now: Date
  network: NetworkState
  queuedCount: number
  issues: IssueEntry[]
  onBack: () => void
  /** 選一張照片（正式 App：開相機／相簿、canvas 壓縮）；取消回傳 null */
  pickPhoto: () => Promise<PhotoDraft | null>
  onSubmit: (v: IssueInput) => void
  onResolve: (id: string) => void
  onReopen: (id: string) => void
  onOpenDetail: (id: string) => void
}

const CATS: IssueCategory[] = ["嘔吐", "食慾差", "精神差", "眼鼻分泌物或打噴嚏", "抓癢掉毛", "受傷", "其他"]
const SUBS: VomitSub[] = ["毛球", "食物", "液體"]
const SEVERITY: { v: Severity; Icon: typeof Eye; cls: string; hint: string }[] = [
  { v: "觀察", Icon: Eye, cls: "data-[state=on]:bg-info-soft data-[state=on]:text-info-soft-foreground data-[state=on]:border-info", hint: "先記下來看看" },
  { v: "要注意", Icon: TriangleAlert, cls: "data-[state=on]:bg-warning-soft data-[state=on]:text-warning-soft-foreground data-[state=on]:border-warning", hint: "再發生就問醫生" },
  { v: "緊急", Icon: OctagonAlert, cls: "data-[state=on]:bg-destructive-soft data-[state=on]:text-destructive-soft-foreground data-[state=on]:border-destructive", hint: "現在就要處理" },
]
const sevTone = (s: Severity) => (s === "緊急" ? "urgent" : s === "要注意" ? "watch" : "info")

export function IssueScreen(p: IssueScreenProps) {
  const [cat, setCat] = useState<IssueCategory | null>(null)
  const [sub, setSub] = useState<VomitSub | null>(null)
  const [sev, setSev] = useState<Severity | null>(null)
  const [photos, setPhotos] = useState<PhotoDraft[]>([])
  const [note, setNote] = useState("")

  const ready = !!cat && !!sev
  const submit = () => {
    if (!cat || !sev) return
    p.onSubmit({ category: cat, sub: cat === "嘔吐" ? sub : null, severity: sev, photos, note })
    setCat(null); setSub(null); setSev(null); setPhotos([]); setNote("")
  }
  const live = [...p.issues].filter((i) => !i.deleted).sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
  const open = live.filter((i) => !i.resolved)
  const done = live.filter((i) => i.resolved)

  return (
    <ScreenLayout title="異常回報" onBack={p.onBack} backLabel="首頁"
      banner={<NetworkBanner network={p.network} queuedCount={p.queuedCount} />}
      bottom={<BottomActionBar><Button size="lg" className="w-full" disabled={!ready} onClick={submit}>{ready ? "送出回報" : "選好類別和嚴重度就能送出"}</Button></BottomActionBar>}>
      <div className="space-y-5 pt-1">
        {open.length > 0 && (
          <section aria-labelledby="iss-open" className="grid gap-2">
            <h2 id="iss-open" className="text-lg font-bold">還沒解決（{open.length}）</h2>
            <ul className="grid gap-2">
              {open.map((i) => (
                <li key={i.id} className="rounded-xl border bg-card px-4 py-3">
                  <button type="button" className="flex w-full items-start gap-2 text-left" onClick={() => p.onOpenDetail(i.id)}>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{i.category}{i.sub && `・${i.sub}`}</p>
                      <p className="text-muted-foreground">{fmtWhen(i.ts, p.now)}・{i.who}{i.photo_ids.length > 0 && <span className="whitespace-nowrap">・照片 {i.photo_ids.length} 張</span>}</p>
                    </div>
                    <StatusBadge tone={sevTone(i.severity)} label={i.severity} />
                    <ChevronRight className="size-6 flex-none text-muted-foreground" aria-hidden />
                  </button>
                  {i.note && <p className="mt-1">{i.note}</p>}
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => p.onResolve(i.id)}><Check aria-hidden />標記已解決</Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <Card className="gap-5 px-4 py-4">
          <h2 className="text-lg font-bold">新的回報</h2>
          <ChoiceSingle label="類別" options={CATS} value={cat} onChange={(v) => { setCat(v); if (v !== "嘔吐") setSub(null) }} />
          {cat === "嘔吐" && <ChoiceSingle label="吐了什麼" options={SUBS} value={sub} onChange={setSub} layout="grid" cols={3} />}

          <div className="grid gap-2">
            <span aria-hidden className="font-bold">嚴重度</span>
            <ToggleGroup type="single" variant="outline" spacing={2} aria-label="嚴重度" value={sev ?? ""}
              onValueChange={(v) => setSev((v || null) as Severity | null)} className="grid w-full grid-cols-3 gap-2">
              {SEVERITY.map(({ v, Icon, cls, hint }) => (
                <ToggleGroupItem key={v} value={v} className={cn("h-auto min-h-20 flex-col gap-1 rounded-lg py-2 whitespace-normal data-[state=on]:border-2 data-[state=on]:font-bold", cls)}>
                  <Icon className="size-6" aria-hidden />
                  <span>{v}</span>
                  <span className="sr-only">：{hint}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {sev && <p className="text-muted-foreground">{SEVERITY.find((s) => s.v === sev)?.hint}</p>}
          </div>
          {sev === "緊急" && (
            <UrgentVetAlert>緊急狀況請直接打給動物醫院。App 的紀錄只是給醫生參考，不能代替看診。</UrgentVetAlert>
          )}

          <div className="grid gap-2">
            <span className="font-bold">照片</span>
            <PhotoSlots photos={photos} onRemove={(id) => setPhotos(photos.filter((x) => x.id !== id))}
              onAdd={async () => { const ph = await p.pickPhoto(); if (ph) setPhotos((xs) => (xs.length < 3 ? [...xs, ph] : xs)) }} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="iss-note" className="font-bold">備註</Label>
            <Textarea id="iss-note" placeholder="選填，例如：吐完精神還好，有吃飯" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </Card>

        {done.length > 0 && (
          <section aria-labelledby="iss-done" className="grid gap-2">
            <h2 id="iss-done" className="text-lg font-bold">已解決</h2>
            <ul className="divide-y rounded-xl border bg-card">
              {done.map((i) => (
                <li key={i.id} className="flex items-center gap-2 py-2 pr-2 pl-4">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => p.onOpenDetail(i.id)}>
                    <span className="block font-medium">{i.category}{i.sub && `・${i.sub}`}</span>
                    <span className="block text-muted-foreground">{fmtWhen(i.ts, p.now)}・{i.who}</span>
                  </button>
                  <StatusBadge tone="ok" label="已解決" />
                  <Button variant="ghost" size="icon" onClick={() => p.onReopen(i.id)} aria-label={`改回未解決：${i.category}`}><RotateCcw aria-hidden /></Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </ScreenLayout>
  )
}
