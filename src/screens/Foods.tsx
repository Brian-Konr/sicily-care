import { useState } from "react"
import { Archive, ChevronDown, RotateCcw, Star } from "lucide-react"
import type { Food, FoodKind, NetworkState } from "@/types"
import { Button } from "@/components/ui/button"
import { AddFoodSheet } from "@/components/AddFoodSheet"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { NetworkBanner } from "@/components/NetworkBanner"
import { RowMenu } from "@/components/RowMenu"
import { ScreenLayout } from "@/components/ScreenLayout"
import { SwipeRow } from "@/components/SwipeRow"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import type { NewFood } from "@/screens/Feed"

const KIND_EMOJI: Record<FoodKind, string> = { "副食罐": "🥫", "零食": "🍪", "肉泥": "🧴", "凍乾": "🍗" }

export function FoodsScreen({
  now: _now, network, queuedCount, foods, onBack, onArchive, onRestore, onAddFood,
}: {
  now: Date
  network: NetworkState
  queuedCount: number
  foods: Food[]
  onBack: () => void
  onArchive: (food: Food) => void
  onRestore: (food: Food) => void
  onAddFood: (food: NewFood) => void
}) {
  const active = foods.filter((f) => f.active)
  const archived = foods.filter((f) => !f.active)
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<Food | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const askArchive = (food: Food) => { setOpenId(null); setConfirm(food) }

  return (
    <ScreenLayout title="管理品項" onBack={onBack} backLabel="副食／零食"
      banner={<NetworkBanner network={network} queuedCount={queuedCount} />}
      onMainScroll={() => setOpenId(null)}>
      <div className="space-y-5 pt-1">
        <p className="text-muted-foreground">封存的品項不會出現在選單裡，過去的紀錄不受影響。往左滑或點「⋯」都能封存。</p>

        {active.length === 0 ? (
          <div className="grid justify-items-center gap-3 py-6">
            <p className="text-muted-foreground">目前沒有使用中的品項。</p>
            <Button variant="outline" onClick={() => setAddOpen(true)}>新增食物</Button>
          </div>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl border bg-card" onScroll={() => setOpenId(null)}>
            {active.map((f) => (
              <li key={f.food_id}>
                <SwipeRow open={openId === f.food_id} onOpenChange={(o) => setOpenId(o ? f.food_id : null)}
                  onConfirm={() => askArchive(f)} onRevealPress={() => askArchive(f)}>
                  <div className="flex items-center gap-3 py-2 pr-2 pl-4"
                    onClick={() => { if (openId === f.food_id) setOpenId(null) }}>
                    <span aria-hidden className="text-[22px] leading-none">{KIND_EMOJI[f.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1 font-medium">{f.name}
                        {f.fav && <Star className="size-5 fill-current text-warning" aria-label="收藏" />}
                      </span>
                      <span className="block text-muted-foreground">{f.kind}・{f.default_qty} {f.unit}</span>
                    </span>
                    <RowMenu label={`${f.name}的更多動作`} onPointerDown={(e) => e.stopPropagation()}>
                      <DropdownMenuItem onSelect={() => askArchive(f)}><Archive aria-hidden />封存</DropdownMenuItem>
                    </RowMenu>
                  </div>
                </SwipeRow>
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <section>
            <button type="button" aria-expanded={showArchived} onClick={() => setShowArchived((x) => !x)}
              className="flex min-h-11 w-full items-center justify-between font-medium">
              已封存（{archived.length}）
              <ChevronDown className={showArchived ? "size-5 rotate-180" : "size-5"} aria-hidden />
            </button>
            {showArchived && (
              <ul className="mt-2 divide-y overflow-hidden rounded-xl border bg-card">
                {archived.map((f) => (
                  <li key={f.food_id} className="flex items-center gap-3 bg-muted py-2 pr-2 pl-4">
                    <span aria-hidden className="text-[22px] leading-none">{KIND_EMOJI[f.kind]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-muted-foreground">{f.name}</span>
                      <span className="block text-muted-foreground">已封存</span>
                    </span>
                    <Button variant="outline" size="sm" aria-label={`恢復 ${f.name}`} onClick={() => onRestore(f)}>
                      <RotateCcw aria-hidden />恢復
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      <ConfirmDialog open={!!confirm} confirmVariant="default"
        title={`封存『${confirm?.name ?? ""}』？`}
        description="之後不會出現在選單裡，過去的紀錄會保留。需要時可以在下方「已封存」恢復。"
        confirmLabel="封存" onCancel={() => setConfirm(null)}
        onConfirm={() => { if (confirm) onArchive(confirm); setConfirm(null) }} />
      <AddFoodSheet open={addOpen} onOpenChange={setAddOpen} onAdd={onAddFood} />
    </ScreenLayout>
  )
}
