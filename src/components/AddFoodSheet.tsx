import { useState } from "react"
import type { FoodKind } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ChoiceSingle } from "@/components/ChoiceGroup"
import type { NewFood } from "@/screens/Feed"

const KINDS: FoodKind[] = ["副食罐", "零食", "肉泥", "凍乾"]

export function AddFoodSheet({ open, onOpenChange, onAdd }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (food: NewFood) => void
}) {
  const [nf, setNf] = useState<NewFood>({ name: "", kind: "副食罐", unit: "罐", grams_per_unit: null })
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="gap-0 px-5 pt-3" onOpenAutoFocus={(e) => e.preventDefault()}>
        <div aria-hidden className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-input" />
        <SheetHeader className="p-0 pr-10"><SheetTitle className="text-xl font-bold">新增食物</SheetTitle></SheetHeader>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nf-name" className="font-bold">名稱</Label>
            <Input id="nf-name" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} placeholder="例如：鮪魚慕斯罐" />
          </div>
          <ChoiceSingle label="類型" options={KINDS} value={nf.kind} layout="grid" cols={4} onChange={(v) => v && setNf({ ...nf, kind: v })} />
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="nf-unit" className="font-bold">單位</Label>
              <Input id="nf-unit" value={nf.unit} onChange={(e) => setNf({ ...nf, unit: e.target.value })} placeholder="罐、條、顆" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="nf-g" className="font-bold">每單位公克</Label>
              <Input id="nf-g" inputMode="decimal" value={nf.grams_per_unit ?? ""} placeholder="選填"
                onChange={(e) => setNf({ ...nf, grams_per_unit: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <Button disabled={!nf.name.trim() || !nf.unit.trim()} onClick={() => { onAdd(nf); onOpenChange(false); setNf({ name: "", kind: "副食罐", unit: "罐", grams_per_unit: null }) }}>
            加入清單
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
