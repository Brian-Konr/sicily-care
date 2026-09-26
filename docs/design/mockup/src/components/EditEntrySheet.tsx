import { useEffect, useState } from "react"
import type { AnyEntry, EatenPct } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EatenPicker } from "@/components/EatenPicker"
import { Stepper } from "@/components/Stepper"
import { describe } from "@/lib/describe"
import { dateKey, fmtDate, fmtTime } from "@/lib/format"

export interface EntryPatch {
  ts?: string
  note?: string
  eaten_pct?: EatenPct | null
  urine_count?: number
  stool_count?: number
  kg?: number
}

export interface EditEntrySheetProps {
  entry: AnyEntry | null
  onClose: () => void
  onSave: (id: string, patch: EntryPatch) => void
}

/** 編輯一筆紀錄（底部 Sheet）：時間、備註＋各類型主要欄位 */
export function EditEntrySheet({ entry, onClose, onSave }: EditEntrySheetProps) {
  const [time, setTime] = useState("")
  const [note, setNote] = useState("")
  const [eaten, setEaten] = useState<EatenPct | null>(null)
  const [urine, setUrine] = useState(0)
  const [stool, setStool] = useState(0)
  const [kg, setKg] = useState("")

  useEffect(() => {
    if (!entry) return
    setTime(fmtTime(entry.ts))
    setNote("note" in entry ? entry.note : "")
    if (entry.type === "feed") setEaten(entry.eaten_pct)
    if (entry.type === "litter") { setUrine(entry.urine_count); setStool(entry.stool_count) }
    if (entry.type === "weight") setKg(entry.kg.toFixed(2))
  }, [entry])

  const kgNum = Number(kg)
  const kgBad = entry?.type === "weight" && !(kgNum > 0.3 && kgNum < 15)

  const save = () => {
    if (!entry) return
    const patch: EntryPatch = { note, ts: `${dateKey(entry.ts)}T${time}:00+08:00` }
    if (entry.type === "feed") patch.eaten_pct = eaten
    if (entry.type === "litter") Object.assign(patch, { urine_count: urine, stool_count: stool })
    if (entry.type === "weight") patch.kg = Math.round(kgNum * 100) / 100
    onSave(entry.id, patch)
  }

  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="gap-0 px-5 pt-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-input" />
        {entry && (
          <>
            <SheetHeader className="p-0 pr-10">
              <SheetTitle className="text-xl font-bold">編輯紀錄</SheetTitle>
              <SheetDescription>{describe(entry).emoji} {describe(entry).title}・{entry.who}・{fmtDate(entry.ts)}</SheetDescription>
            </SheetHeader>
            <div className="mt-4 grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="edit-time" className="font-bold">時間</Label>
                <Input id="edit-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-40" />
              </div>
              {entry.type === "feed" && (
                <div className="grid gap-2">
                  <span className="font-bold">吃了多少</span>
                  <EatenPicker value={eaten} onChange={setEaten} label="吃了多少" />
                </div>
              )}
              {entry.type === "litter" && (
                <div className="flex flex-wrap justify-between gap-3">
                  <Stepper label="尿塊" value={urine} onChange={setUrine} />
                  <Stepper label="便" value={stool} onChange={setStool} />
                </div>
              )}
              {entry.type === "weight" && (
                <div className="grid gap-2">
                  <Label htmlFor="edit-kg" className="font-bold">體重（kg）</Label>
                  <Input id="edit-kg" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} aria-invalid={kgBad} className="w-40" />
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="edit-note" className="font-bold">備註</Label>
                <Textarea id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="選填" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" onClick={onClose}>取消</Button>
                <Button onClick={save} disabled={kgBad}>儲存</Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
