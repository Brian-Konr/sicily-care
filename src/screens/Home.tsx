import { useState } from "react"
import { RefreshCw, Settings, TriangleAlert } from "lucide-react"
import type { AnyEntry, CareEntry, CareKind, Config, EatenPct, FeedEntry, LitterEntry, MedEntry, NetworkState, WeightEntry } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ActionTile } from "@/components/ActionTile"
import { BottomNav } from "@/components/BottomNav"
import { LastActivityCard } from "@/components/LastActivityCard"
import { LitterQuickRow } from "@/components/LitterQuickRow"
import { NetworkBanner } from "@/components/NetworkBanner"
import { PendingEatenCard } from "@/components/PendingEatenCard"
import { SampleBadge } from "@/components/SampleBadge"
import { ScreenLayout } from "@/components/ScreenLayout"
import { CareCard } from "@/components/CareCard"
import { DueStatus } from "@/components/DueStatus"
import { OverdueDot, SummaryCard } from "@/components/SummaryCard"
import { TimelineItem, TimelineList } from "@/components/TimelineItem"
import { catAgeLabel } from "@/lib/age"
import { fmtDate, fmtDiff } from "@/lib/format"
import { latest, litterDefaults, pendingFeeds, upcomingMeds, weightSummary } from "@/lib/rules"

export type HomeTarget = "feed" | "litter" | "weight" | "med" | "issue" | "timeline" | "settings"

export interface HomeScreenProps {
  /** 名字與品種；年齡由 config.birthday_est＋birthday_estimated 計算（確切「10 個月 25 天」／估計「約 10 個月」） */
  cat: { name: string; breed: string }
  me: string
  now: Date
  /** 讀取狀態：loading＝骨架；error＝讀不到（可重試） */
  status: "ready" | "loading" | "error"
  network: NetworkState
  queuedCount: number
  failedCount: number
  config: Config
  feeds: FeedEntry[]
  litter: LitterEntry[]
  weights: WeightEntry[]
  meds: MedEntry[]
  cares: CareEntry[]
  version: number
  /** 最近紀錄（已排序，新的在前），首頁取前 3 筆 */
  recent: AnyEntry[]
  onOpen: (to: HomeTarget) => void
  onLogCare: (kind: CareKind, onUndo: () => void) => void
  onOpenCareHistory: () => void
  onFillEaten: (entryId: string, pct: EatenPct) => void
  /** 清砂一鍵「一切正常 ✓」 */
  onLitterNormal: (v: { urine_count: number; stool_count: number }) => void
  onRetry: () => void
  onRetrySync: () => void
}

export function HomeScreen(p: HomeScreenProps) {
  const defaults = litterDefaults(p.litter)
  const [quick, setQuick] = useState<{ urine: number; stool: number } | null>(null)
  const q = quick ?? { urine: defaults.urine_count, stool: defaults.stool_count }

  const lastFeed = latest(p.feeds)
  const lastLitter = latest(p.litter)
  const pending = pendingFeeds(p.feeds, p.now)
  const ws = weightSummary(p.weights, p.config, p.now)
  const nextMed = upcomingMeds(p.meds, p.now)[0]
  const empty = !lastFeed && !lastLitter && !ws && p.recent.length === 0

  const header = (
    <div className="flex items-center gap-3 px-4 pt-2 pb-2">
      <span aria-hidden className="grid size-13 flex-none place-items-center rounded-full bg-accent text-[28px]">🐱</span>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold">{p.cat.name}</h1>
        {/* 品種與年齡各自不斷行；窄的時候年齡換到第二行，不會留下開頭的「・」 */}
        <p className="flex flex-wrap gap-x-2 text-muted-foreground">
          {[p.cat.breed, catAgeLabel(p.config.birthday_est, p.now, p.config.birthday_estimated)].filter(Boolean).map((part, i) => (
            <span key={i} className="whitespace-nowrap">{i > 0 && <span className="sr-only">，</span>}{part}</span>
          ))}
        </p>
      </div>
      <div className="ml-auto flex flex-none flex-col items-end gap-1">
        <SampleBadge />
        <button type="button" onClick={() => p.onOpen("settings")} aria-label={`設定（目前身分：${p.me}）`}
          className="inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border border-input bg-card pr-2.5 pl-1 active:bg-muted">
          <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{p.me.slice(0, 1)}</span>
          我是 {p.me}
          <Settings aria-hidden className="size-5 text-muted-foreground" />
        </button>
      </div>
    </div>
  )

  const banner = <NetworkBanner network={p.network} queuedCount={p.queuedCount} failedCount={p.failedCount} onRetry={p.onRetrySync} />

  return (
    <ScreenLayout header={header} banner={banner} bottom={<BottomNav current="home" onNavigate={(to) => { if (to === "timeline") p.onOpen("timeline") }} />}>
      {p.status === "loading" && (
        <div className="space-y-4 pt-2" aria-busy="true" aria-label="讀取中">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <div className="grid grid-cols-2 gap-3"><Skeleton className="col-span-2 h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
          <Skeleton className="h-48 rounded-xl" />
          <p className="text-center text-muted-foreground">正在讀取最新紀錄⋯</p>
        </div>
      )}

      {p.status === "error" && (
        <Alert variant="destructive" className="mt-2 border-destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>讀不到最新紀錄</AlertTitle>
          <AlertDescription>
            <p>可能是網路不穩。畫面上是手機裡的舊資料，還是可以照常記錄。</p>
            <Button variant="outline" size="sm" className="mt-1" onClick={p.onRetry}><RefreshCw aria-hidden />再試一次</Button>
          </AlertDescription>
        </Alert>
      )}

      {p.status !== "loading" && (
        <div className="space-y-4 pt-2">
          {empty ? (
            <Card className="items-center gap-2 px-4 py-6 text-center">
              <span aria-hidden className="text-4xl">🐾</span>
              <p className="text-lg font-bold">還沒有紀錄</p>
              <p className="text-muted-foreground">點下面的按鈕，記下{p.cat.name}的第一筆吧。</p>
            </Card>
          ) : (
            <LastActivityCard now={p.now} rows={[
              { emoji: "🥫", label: "上次餵食", who: lastFeed?.who, ts: lastFeed?.ts },
              { emoji: "🚽", label: "上次清砂", who: lastLitter?.who, ts: lastLitter?.ts },
            ]} />
          )}

          {pending[0] && (
            <PendingEatenCard entry={pending[0]} now={p.now} onPick={p.onFillEaten}
              moreCount={pending.length - 1} onShowMore={() => p.onOpen("feed")} />
          )}

          <section aria-label="記錄" className="grid grid-cols-2 gap-3">
            <ActionTile variant="primary" emoji="🥫" label="副食／零食" hint="點食物就記好" onClick={() => p.onOpen("feed")} />
            <ActionTile emoji="🚽" label="清砂" hint="有異常再展開" onClick={() => p.onOpen("litter")} />
            <ActionTile emoji="⚖️" label="體重" alert={ws?.overdue ? "該量了" : undefined} hint={!ws ? "還沒量過" : !ws.overdue ? `${ws.daysAgo} 天前量` : undefined} onClick={() => p.onOpen("weight")} />
            <ActionTile emoji="💊" label="驅蟲／疫苗" hint="用藥也記這裡" onClick={() => p.onOpen("med")} />
            <ActionTile emoji="📷" label="異常回報" hint="嘔吐、食慾差⋯" onClick={() => p.onOpen("issue")} />
          </section>

          <Card className="gap-3 px-4 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold"><span aria-hidden>🚽</span>清砂一鍵記錄</h2>
            <LitterQuickRow urine={q.urine} stool={q.stool} onChange={setQuick}
              onConfirm={() => { p.onLitterNormal({ urine_count: q.urine, stool_count: q.stool }); setQuick(null) }} />
            <p className="text-muted-foreground">數字已帶入上次的值，有異常請點上方「清砂」。</p>
          </Card>

          <div className="grid gap-3">
            {ws ? (
              <SummaryCard emoji="⚖️" title="體重" onClick={() => p.onOpen("weight")}
                value={<>{ws.last.kg.toFixed(2)} kg</>}
                meta={<>{ws.diff !== null && <>比上次 {fmtDiff(ws.diff)}・</>}{ws.daysAgo} 天前量</>}
                status={ws.overdue
                  ? <OverdueDot>已超過 {-ws.dueInDays} 天，該量體重了</OverdueDot>
                  : <span className="text-muted-foreground">{ws.dueInDays === 0 ? "今天該量了" : `${ws.dueInDays} 天後該量`}</span>} />
            ) : (
              <SummaryCard emoji="⚖️" title="體重" value="—" meta="還沒量過" onClick={() => p.onOpen("weight")} />
            )}
            {nextMed && (
              <SummaryCard emoji="💊" title={`下次${nextMed.entry.kind}`} onClick={() => p.onOpen("med")}
                value={fmtDate(nextMed.next_due + "T12:00:00+08:00")}
                meta={nextMed.entry.product}
                status={<DueStatus daysLeft={nextMed.daysLeft} />} />
            )}
          </div>

          <CareCard cares={p.cares} config={p.config} version={p.version} now={p.now}
            onLogCare={p.onLogCare} onOpenCareHistory={p.onOpenCareHistory} />

          {p.recent.length > 0 && (
            <section aria-labelledby="recent-h">
              <div className="mt-2 mb-2 flex items-center justify-between">
                <h2 id="recent-h" className="text-lg font-bold">最近紀錄</h2>
                <Button variant="ghost" size="sm" onClick={() => p.onOpen("timeline")}>看全部 ›</Button>
              </div>
              <TimelineList label="最近紀錄">
                {p.recent.slice(0, 3).map((e) => <TimelineItem key={e.id} entry={e} />)}
              </TimelineList>
            </section>
          )}
        </div>
      )}
    </ScreenLayout>
  )
}
