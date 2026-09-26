import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { ClinicInfo, LitterEntry, NetworkState, StoolAmount, StoolCat, StoolFlag, UrineFlag, UrineSize } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BottomActionBar, ScreenLayout } from "@/components/ScreenLayout"
import { CheckList } from "@/components/CheckList"
import { ChoiceSingle } from "@/components/ChoiceGroup"
import { LitterQuickRow } from "@/components/LitterQuickRow"
import { NetworkBanner } from "@/components/NetworkBanner"
import { Stepper } from "@/components/Stepper"
import { TimelineItem, TimelineList } from "@/components/TimelineItem"
import { UrgentVetAlert } from "@/components/UrgentVetAlert"
import { litterDefaults, needsVetNow, STOOL_TO_PURINA } from "@/lib/rules"

export type LitterDetail = Omit<LitterEntry, "id" | "ts" | "who" | "deleted" | "sync">

export interface LitterScreenProps {
  now: Date
  network: NetworkState
  queuedCount: number
  litter: LitterEntry[]
  /** 診所（有電話才傳）：緊急提示會出現「打給 ○○」 */
  clinic?: ClinicInfo
  onBack: () => void
  /** 一鍵「一切正常 ✓」 */
  onNormal: (v: { urine_count: number; stool_count: number }) => void
  /** 「有異常」送出 */
  onSubmitDetail: (d: LitterDetail) => void
}

const URINE_SIZES: UrineSize[] = ["小", "正常", "大"]
const URINE_SIZE_HINT: Record<UrineSize, string> = { "小": "比乒乓球小", "正常": "高爾夫球～網球", "大": "比網球大" }
const URINE_FLAGS: UrineFlag[] = ["很多小塊", "粉紅或帶血", "尿在盆外", "蹲很久/用力", "一直進出砂盆"]
const STOOL_CATS: StoolCat[] = ["硬顆粒", "正常成形", "軟、撿起會散", "爛泥狀", "水便", "今天沒便"]
const STOOL_AMOUNTS: StoolAmount[] = ["少", "正常", "多"]
const STOOL_FLAGS: StoolFlag[] = ["帶血", "黏液", "有蟲或異物", "顏色怪（黑/白）", "便在盆外"]

export function LitterScreen(p: LitterScreenProps) {
  const def = litterDefaults(p.litter)
  const [urine, setUrine] = useState(def.urine_count)
  const [stool, setStool] = useState(def.stool_count)
  const [open, setOpen] = useState(false)
  const [urineSize, setUrineSize] = useState<UrineSize | null>(null)
  const [urineFlags, setUrineFlags] = useState<UrineFlag[]>([])
  const [stoolCat, setStoolCat] = useState<StoolCat | null>(null)
  const [stoolAmount, setStoolAmount] = useState<StoolAmount | null>(null)
  const [stoolFlags, setStoolFlags] = useState<StoolFlag[]>([])
  const [note, setNote] = useState("")

  const vet = needsVetNow(urine, urineFlags)
  const reset = () => { setOpen(false); setUrineSize(null); setUrineFlags([]); setStoolCat(null); setStoolAmount(null); setStoolFlags([]); setNote("") }
  const submit = () => {
    p.onSubmitDetail({
      all_normal: false, urine_count: urine, urine_size: urineSize, urine_flags: urineFlags,
      stool_count: stool, stool_cat: stoolCat, purina_range: stoolCat ? STOOL_TO_PURINA[stoolCat] : null,
      stool_amount: stoolAmount, stool_flags: stoolFlags, photo_ids: [], note,
    })
    reset()
  }
  const recent = [...p.litter].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).slice(0, 3)

  return (
    <ScreenLayout title="清砂" onBack={p.onBack} backLabel="首頁"
      banner={<NetworkBanner network={p.network} queuedCount={p.queuedCount} />}
      bottom={open ? <BottomActionBar><Button size="lg" className="w-full" variant={vet ? "destructive" : "default"} onClick={submit}>記錄異常</Button></BottomActionBar> : undefined}>
      <div className="space-y-5 pt-1">
        <Card className="gap-3 px-4 py-4">
          <h2 className="text-lg font-bold">這次清到</h2>
          {!open ? (
            <LitterQuickRow urine={urine} stool={stool} onChange={(v) => { setUrine(v.urine); setStool(v.stool) }}
              onConfirm={() => p.onNormal({ urine_count: urine, stool_count: stool })} />
          ) : (
            <div className="flex flex-wrap justify-between gap-2">
              <Stepper label="尿塊" value={urine} onChange={setUrine} />
              <Stepper label="便" value={stool} onChange={setStool} />
            </div>
          )}
          <p className="text-muted-foreground">數字已帶入上次的值（尿塊 {def.urine_count}・便 {def.stool_count}）。</p>
        </Card>

        <Card className="gap-0 px-4 py-2">
          <button type="button" aria-expanded={open} onClick={() => (open ? reset() : setOpen(true))}
            className="flex min-h-12 w-full items-center justify-between text-lg font-bold text-primary">
            {open ? "收起，改回一切正常" : "有異常？展開填寫"}
            <ChevronDown className={open ? "size-6 rotate-180 transition-transform" : "size-6 transition-transform"} aria-hidden />
          </button>
          {open && (
            <div className="grid gap-6 pt-2 pb-3">
              <section className="grid gap-4" aria-label="尿">
                <h3 className="text-lg font-bold">尿</h3>
                <div className="grid gap-2">
                  <ChoiceSingle label="尿塊大小" options={URINE_SIZES} value={urineSize} onChange={setUrineSize} layout="grid" cols={3} />
                  {urineSize && <p className="text-muted-foreground">{urineSize}：{URINE_SIZE_HINT[urineSize]}</p>}
                </div>
                <CheckList label="尿的其他" options={URINE_FLAGS} value={urineFlags} onChange={setUrineFlags} emphasize={["蹲很久/用力"]} />
                {vet && (
                  <UrgentVetAlert clinic={p.clinic} noClinicHint="之後可以到「設定」填診所電話，這裡就會出現撥號鈕。">
                    蹲很久、用力，但沒有尿塊，可能是泌尿道阻塞。請先打電話給動物醫院，不要等明天。
                  </UrgentVetAlert>
                )}
              </section>
              <section className="grid gap-4" aria-label="便便">
                <h3 className="text-lg font-bold">便便</h3>
                <ChoiceSingle label="形狀" options={STOOL_CATS} value={stoolCat} onChange={setStoolCat} layout="grid" cols={2} />
                <ChoiceSingle label="便量" options={STOOL_AMOUNTS} value={stoolAmount} onChange={setStoolAmount} layout="grid" cols={3} />
                <CheckList label="便便其他" options={STOOL_FLAGS} value={stoolFlags} onChange={setStoolFlags} />
              </section>
              <div className="grid gap-2">
                <Label htmlFor="litter-note" className="font-bold">備註</Label>
                <Textarea id="litter-note" placeholder="選填" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
          )}
        </Card>

        <section aria-labelledby="litter-recent" className="grid gap-2">
          <h2 id="litter-recent" className="text-lg font-bold">最近清砂</h2>
          <TimelineList>{recent.map((e) => <TimelineItem key={e.id} entry={{ type: "litter", ...e }} />)}</TimelineList>
        </section>
      </div>
    </ScreenLayout>
  )
}
