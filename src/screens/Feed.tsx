import { useState } from "react"
import { ChevronDown, Plus, Star } from "lucide-react"
import type { EatenPct, FeedEntry, Food, FoodKind, NetworkState, Reaction } from "@/types"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { AddFoodSheet } from "@/components/AddFoodSheet"
import { ChoiceSingle } from "@/components/ChoiceGroup"
import { DuplicateWarningSheet } from "@/components/DuplicateWarningSheet"
import { EatenPicker } from "@/components/EatenPicker"
import { NetworkBanner } from "@/components/NetworkBanner"
import { PendingEatenCard, pendingQuestion } from "@/components/PendingEatenCard"
import { ScreenLayout } from "@/components/ScreenLayout"
import { Stepper } from "@/components/Stepper"
import { eatenLabel, findDuplicateFeed, pendingFeeds } from "@/lib/rules"
import { fmtTime, relTime } from "@/lib/format"

export interface FeedDetailPatch {
  reaction: Reaction | null
  qty: number
  note: string
}
export interface NewFood {
  name: string
  kind: FoodKind
  unit: string
  grams_per_unit: number | null
}

export interface FeedScreenProps {
  me: string
  now: Date
  network: NetworkState
  queuedCount: number
  foods: Food[]
  feeds: FeedEntry[]
  onBack: () => void
  /** 一鍵記錄（重複提醒已在畫面內處理，呼叫時代表使用者確定要記） */
  onLog: (food: Food) => void
  onFillEaten: (entryId: string, pct: EatenPct) => void
  onSaveDetail: (entryId: string, patch: FeedDetailPatch) => void
  onAddFood: (food: NewFood) => void
  onManageFoods: () => void
}

const REACTIONS: Reaction[] = ["喜歡", "普通", "勉強", "拒吃"]
const KIND_EMOJI: Record<FoodKind, string> = { "副食罐": "🥫", "零食": "🍪", "肉泥": "🧴", "凍乾": "🍗" }

export function FeedScreen(p: FeedScreenProps) {
  const [dup, setDup] = useState<{ food: Food; prev: FeedEntry } | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState<FeedDetailPatch | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  const active = p.foods.filter((f) => f.active)
  const recentIds = [...new Set([...p.feeds].sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).map((e) => e.food_id))]
  const recent = [...recentIds.map((id) => active.find((f) => f.food_id === id)).filter((f): f is Food => !!f),
    ...active.filter((f) => !recentIds.includes(f.food_id))]
  const favs = active.filter((f) => f.fav)

  const pending = pendingFeeds(p.feeds, p.now)
  const mineJust = pending.find((e) => e.who === p.me && p.now.getTime() - Date.parse(e.ts) < 30 * 60_000)
  const others = pending.filter((e) => e !== mineJust)

  const tap = (food: Food) => {
    const prev = findDuplicateFeed(food, p.feeds, p.foods, p.now)
    if (prev) setDup({ food, prev })
    else { p.onLog(food); setExpanded(false); setDetail(null) }
  }

  const foodList = (list: Food[], empty: string) => (
    <div className="grid gap-2">
      {list.map((f) => (
        <button key={f.food_id} type="button" onClick={() => tap(f)}
          className="flex min-h-14 w-full items-center gap-3 rounded-lg border border-input bg-card px-3 text-left transition-transform active:scale-[0.98] active:bg-accent motion-reduce:active:scale-100">
          <span aria-hidden className="text-2xl">{KIND_EMOJI[f.kind]}</span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{f.name}</span>
            <span className="block text-muted-foreground">{f.kind}</span>
          </span>
          {f.fav && <Star className="size-5 fill-current text-warning" aria-label="收藏" />}
          <span className="font-num font-bold whitespace-nowrap">{f.default_qty} {f.unit}</span>
        </button>
      ))}
      {list.length === 0 && <p className="py-4 text-center text-muted-foreground">{empty}</p>}
    </div>
  )

  const d = mineJust ? (detail ?? { reaction: mineJust.reaction, qty: mineJust.qty, note: mineJust.note }) : null

  return (
    <ScreenLayout title="副食／零食" onBack={p.onBack} backLabel="首頁"
      banner={<NetworkBanner network={p.network} queuedCount={p.queuedCount} />}>
      <div className="space-y-5 pt-1">
        {mineJust && d && (
          <Card className="gap-3 border-2 border-dashed border-primary px-4 py-4 shadow-none">
            <div>
              <p className="font-bold text-success">✓ 已記錄 {fmtTime(mineJust.ts)}・{mineJust.food_name} {mineJust.qty} {mineJust.unit}</p>
              <p className="text-lg font-bold">{pendingQuestion(mineJust)}</p>
              <p className="text-muted-foreground">可以等牠吃完再回來填，首頁也會提醒。</p>
            </div>
            <EatenPicker value={mineJust.eaten_pct} onChange={(pct) => p.onFillEaten(mineJust.id, pct)} label={pendingQuestion(mineJust)} />
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((x) => !x)}
              className="flex min-h-11 items-center justify-between font-bold text-primary">
              展開選填（反應、份量、備註）
              <ChevronDown className={expanded ? "size-5 rotate-180 transition-transform" : "size-5 transition-transform"} aria-hidden />
            </button>
            {expanded && (
              <div className="grid gap-4">
                <ChoiceSingle label="反應" options={REACTIONS} value={d.reaction} layout="grid" cols={4}
                  onChange={(v) => setDetail({ ...d, reaction: v })} />
                <div className="flex items-center justify-between">
                  <span className="font-bold">份量（{mineJust.unit}）</span>
                  <Stepper label={`份量（${mineJust.unit}）`} showLabel={false} value={d.qty} min={1} max={10} onChange={(v) => setDetail({ ...d, qty: v })} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feed-note" className="font-bold">備註</Label>
                  <Textarea id="feed-note" placeholder="選填，例如：加了一點溫水" value={d.note} onChange={(e) => setDetail({ ...d, note: e.target.value })} />
                </div>
                <Button onClick={() => { p.onSaveDetail(mineJust.id, d); setExpanded(false); setDetail(null) }}>儲存選填內容</Button>
              </div>
            )}
          </Card>
        )}

        <section aria-labelledby="pick-h" className="grid gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 id="pick-h" className="text-lg font-bold">點一下就記錄</h2>
            <Button variant="ghost" size="sm" onClick={p.onManageFoods}>管理品項 ›</Button>
          </div>
          <Tabs defaultValue="recent">
            <TabsList className="w-full">
              <TabsTrigger value="recent">近期</TabsTrigger>
              <TabsTrigger value="fav">收藏</TabsTrigger>
            </TabsList>
            <TabsContent value="recent" className="pt-2">{foodList(recent, "還沒有品項，先新增一個吧。")}</TabsContent>
            <TabsContent value="fav" className="pt-2">{foodList(favs, "還沒有收藏。記錄時點 ☆ 就能加入。")}</TabsContent>
          </Tabs>
          <Button variant="outline" onClick={() => setAddOpen(true)}><Plus aria-hidden />新增食物</Button>
        </section>

        {others.length > 0 && (
          <section aria-labelledby="pending-h" className="grid gap-3">
            <h2 id="pending-h" className="text-lg font-bold">待填剩食</h2>
            {others.map((e) => <PendingEatenCard key={e.id} entry={e} now={p.now} onPick={p.onFillEaten} />)}
          </section>
        )}

        <section aria-labelledby="today-h" className="grid gap-2">
          <h2 id="today-h" className="text-lg font-bold">最近 24 小時</h2>
          <ul className="divide-y rounded-xl border bg-card">
            {p.feeds.filter((e) => !e.deleted && p.now.getTime() - Date.parse(e.ts) < 24 * 3_600_000)
              .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts)).map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-[3.1em] font-num font-bold">{fmtTime(e.ts)}</span>
                  <span className="min-w-0 flex-1">{e.food_name} {e.qty} {e.unit}<span className="block text-muted-foreground">{e.who}・{relTime(e.ts, p.now)}</span></span>
                  <span className={e.eaten_pct === null ? "font-bold text-primary" : "text-muted-foreground"}>{eatenLabel(e.eaten_pct)}</span>
                </li>
              ))}
          </ul>
        </section>
      </div>

      {dup && (
        <DuplicateWarningSheet open who={dup.prev.who} kindLabel={p.foods.find((f) => f.food_id === dup.prev.food_id)?.kind ?? "同類食物"}
          minutesAgo={Math.round((p.now.getTime() - Date.parse(dup.prev.ts)) / 60_000)}
          previous={`${fmtTime(dup.prev.ts)}・${dup.prev.food_name} ${dup.prev.qty} ${dup.prev.unit}`}
          onCancel={() => setDup(null)}
          onConfirm={() => { p.onLog(dup.food); setDup(null); setExpanded(false); setDetail(null) }} />
      )}

      <AddFoodSheet open={addOpen} onOpenChange={setAddOpen} onAdd={p.onAddFood} />
    </ScreenLayout>
  )
}
