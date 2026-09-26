/**
 * 原型殼（唯一有狀態的地方）：記憶體內的示意資料、審閱用畫面切換器、示範開關。
 * 正式 App 不會用到這個檔案；請只複製 src/components、src/screens、src/lib、src/types.ts。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { BatteryFull, SignalHigh, Wifi } from "lucide-react"
import type { AnyEntry, Config, FeedEntry, Food, IssueEntry, LitterEntry, MedEntry, NetworkState, ScreenId, SettingsValues, SyncState, WeightEntry } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"
import { PortalContainerContext } from "@/components/ui/portal-context"
import type { EntryPatch } from "@/components/EditEntrySheet"
import { LocalTrialBanner } from "@/components/NetworkBanner"
import { HomeScreen } from "@/screens/Home"
import { FeedScreen } from "@/screens/Feed"
import { LitterScreen } from "@/screens/Litter"
import { WeightScreen } from "@/screens/Weight"
import { MedScreen } from "@/screens/Med"
import { IssueScreen } from "@/screens/Issue"
import { TimelineScreen } from "@/screens/Timeline"
import { OnboardingScreen } from "@/screens/Onboarding"
import { SettingsScreen } from "@/screens/Settings"
import { dateKey, fmtTime, toTaipeiISO } from "@/lib/format"
import { autoNextDue, clinicFromConfig, eatenLabel, timelineItems } from "@/lib/rules"
import * as S from "@/fixtures/sample"

const SCREENS: { id: ScreenId; label: string }[] = [
  { id: "home", label: "1 首頁" }, { id: "feed", label: "2 副食／零食" }, { id: "litter", label: "3 清砂" },
  { id: "weight", label: "4 體重" }, { id: "med", label: "5 驅蟲／疫苗／用藥" }, { id: "issue", label: "6 異常回報" },
  { id: "timeline", label: "7 七天紀錄" }, { id: "onboarding", label: "8 首次開啟" }, { id: "settings", label: "9 設定" },
]
const params = new URLSearchParams(location.search)
const SHOT = params.has("shot")
const FULL = params.has("full")
const HOME_PARAM = params.get("home")
type ObStatus = "idle" | "checking" | "bad-secret" | "offline" | "unreachable"
const OB_PARAM = params.get("ob")
const OB_INITIAL: ObStatus = OB_PARAM === "checking" || OB_PARAM === "bad-secret" || OB_PARAM === "offline" || OB_PARAM === "unreachable" ? OB_PARAM : "idle"
const readHash = (): ScreenId => {
  const h = location.hash.replace("#", "") as ScreenId
  return SCREENS.some((s) => s.id === h) ? h : "home"
}

/** 示意時鐘：從 2026-09-26 18:35 開始走 */
function useDemoNow() {
  const start = useRef(Date.now())
  const [, tick] = useState(0)
  useEffect(() => { const t = setInterval(() => tick((x) => x + 1), 15_000); return () => clearInterval(t) }, [])
  return new Date(Date.parse(S.SAMPLE_NOW) + (Date.now() - start.current))
}

function useSystemDark() {
  const mq = typeof matchMedia !== "undefined" ? matchMedia("(prefers-color-scheme: dark)") : null
  const [dark, setDark] = useState(mq?.matches ?? false)
  useEffect(() => {
    if (!mq) return
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [mq])
  return dark
}

const useIsPhone = () => {
  const [phone, setPhone] = useState(() => innerWidth <= 500)
  useEffect(() => { const on = () => setPhone(innerWidth <= 500); addEventListener("resize", on); return () => removeEventListener("resize", on) }, [])
  return phone
}

let seq = 0
const uid = () => `new-${Date.now().toString(36)}-${++seq}`
type Setter<T> = React.Dispatch<React.SetStateAction<T[]>>

export default function App() {
  const now = useDemoNow()
  const systemDark = useSystemDark()
  const isPhone = useIsPhone()
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null)
  const dark = darkOverride ?? systemDark
  useEffect(() => { document.documentElement.classList.toggle("dark", dark) }, [dark])

  const [screen, setScreenState] = useState<ScreenId>(readHash)
  const setScreen = useCallback((s: ScreenId) => { location.hash = s; setScreenState(s) }, [])
  useEffect(() => { const on = () => setScreenState(readHash()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on) }, [])

  // 示意資料（記憶體內）
  const [me, setMe] = useState(S.SAMPLE_ME)
  const [config, setConfig] = useState<Config>(() => ({
    ...S.SAMPLE_CONFIG,
    ...(params.has("clinic") ? S.SAMPLE_CLINIC : {}),
    ...(params.has("exactbd") ? S.SAMPLE_EXACT_BIRTHDAY : {}), // 確切生日（示意）
  }))
  const [foods, setFoods] = useState<Food[]>(S.SAMPLE_FOODS)
  const [feeds, setFeeds] = useState<FeedEntry[]>(S.SAMPLE_FEEDS)
  const [litter, setLitter] = useState<LitterEntry[]>(S.SAMPLE_LITTER)
  const [weights, setWeights] = useState<WeightEntry[]>(S.SAMPLE_WEIGHTS)
  const [meds, setMeds] = useState<MedEntry[]>(S.SAMPLE_MEDS)
  const [issues, setIssues] = useState<IssueEntry[]>(S.SAMPLE_ISSUES)

  // 示範開關
  const [network, setNetwork] = useState<NetworkState>(params.has("offline") ? "offline" : params.has("unreachable") ? "unreachable" : "online")
  const [failNext, setFailNext] = useState(false)
  const [homeState, setHomeState] = useState<"ready" | "loading" | "error" | "empty">(
    HOME_PARAM === "loading" || HOME_PARAM === "error" || HOME_PARAM === "empty" ? HOME_PARAM : "ready")
  const [weightOverdue, setWeightOverdue] = useState(params.has("overdue"))
  const [obStatus, setObStatus] = useState<ObStatus>(OB_INITIAL)
  // 本機試用＝沒有後端網址：跳過密鑰、頂部固定試用橫條。needSecret 另外可單獨關（審閱用）
  const [localTrial, setLocalTrial] = useState(params.has("trial"))
  const [needSecretOpt, setNeedSecretOpt] = useState(!params.has("nosecret"))
  const needSecret = !localTrial && needSecretOpt
  // 慢連線模擬：密鑰確認要 25 秒，才看得到「長等待要說明」的 5 秒／20 秒兩段提示
  const [slowCheck, setSlowCheck] = useState(params.has("slow"))
  const [phoneEl, setPhoneEl] = useState<HTMLDivElement | null>(null)
  const photoSeq = useRef(0)

  const reset = () => {
    setFoods(S.SAMPLE_FOODS); setFeeds(S.SAMPLE_FEEDS); setLitter(S.SAMPLE_LITTER); setWeights(S.SAMPLE_WEIGHTS)
    setMeds(S.SAMPLE_MEDS); setIssues(S.SAMPLE_ISSUES); setMe(S.SAMPLE_ME); setConfig(S.SAMPLE_CONFIG); setNetwork("online"); setFailNext(false)
    setHomeState("ready"); setWeightOverdue(false); setObStatus("idle"); setLocalTrial(false); setNeedSecretOpt(true); setSlowCheck(false); toast.dismiss()
  }

  // 體重逾期示範：把體重紀錄整體往前移 4 天（12 → 16 天前）
  const weightsView = useMemo(() => weightOverdue
    ? weights.map((w) => w.id.startsWith("new-") ? w : { ...w, ts: toTaipeiISO(new Date(Date.parse(w.ts) - 4 * 86_400_000)) })
    : weights, [weights, weightOverdue])

  const all: AnyEntry[] = useMemo(() => [
    ...feeds.map((e) => ({ type: "feed" as const, ...e })), ...litter.map((e) => ({ type: "litter" as const, ...e })),
    ...weightsView.map((e) => ({ type: "weight" as const, ...e })), ...meds.map((e) => ({ type: "med" as const, ...e })),
    ...issues.map((e) => ({ type: "issue" as const, ...e })),
  ], [feeds, litter, weightsView, meds, issues])
  const queued = all.filter((e) => e.sync === "queued" && !e.deleted).length
  const failed = all.filter((e) => e.sync === "failed" && !e.deleted).length

  const queuedNote = network === "offline" ? "（離線，待上傳）" : "（連不到後端，待上傳）"
  // 「重新送出」／「再試一次」：連不到後端時示意為重新連上（排隊的紀錄由下面的 effect 自動補送）
  const retrySync = () => {
    if (network === "unreachable") { setNetwork("online"); if (queued === 0) toast.success("連上了") }
    if (failed > 0) { markAll("failed", "synced"); toast.success("送出了") }
  }

  // 離線 → 上線：自動補送
  const prevNet = useRef(network)
  useEffect(() => {
    if (prevNet.current !== "online" && network === "online" && queued > 0) {
      markAll("queued", "synced")
      toast.success(`已補送 ${queued} 筆紀錄`)
    }
    prevNet.current = network
  })

  const setters = { feed: setFeeds, litter: setLitter, weight: setWeights, med: setMeds, issue: setIssues } as const
  function markAll(from: SyncState, to: SyncState) {
    for (const set of Object.values(setters)) (set as Setter<{ sync?: SyncState }>)((xs) => xs.map((x) => (x.sync === from ? { ...x, sync: to } : x)))
  }
  const patchIn = <T extends { id: string }>(set: Setter<T>, id: string, patch: Partial<T>) =>
    set((xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  /** 新增一筆＋toast（含「復原」＝軟刪除） */
  function add<T extends { id: string; deleted: boolean }>(set: Setter<T>, body: Omit<T, "id" | "ts" | "who" | "deleted" | "sync">, msg: string) {
    const sync: SyncState = network !== "online" ? "queued" : failNext ? "failed" : "synced"
    const id = uid()
    set((xs) => [{ ...(body as object), id, ts: toTaipeiISO(now), who: me, deleted: false, sync } as unknown as T, ...xs])
    const undo = { label: "復原", onClick: () => patchIn(set, id, { deleted: true } as Partial<T>) }
    if (sync === "failed") {
      setFailNext(false)
      toast.error(`${msg}，但沒送出去`, { description: "已存在手機，不會不見。", action: { label: "重試", onClick: () => { patchIn(set, id, { sync: "synced" } as unknown as Partial<T>); toast.success("送出了") } }, duration: 8000 })
    } else toast(sync === "queued" ? `${msg}${queuedNote}` : msg, { action: undo, duration: 5000 })
    return id
  }

  const back = () => setScreen("home")
  const common = { now, network, queuedCount: queued }

  const fillEaten = (id: string, pct: FeedEntry["eaten_pct"]) => {
    const before = feeds.find((f) => f.id === id)?.eaten_pct ?? null
    patchIn(setFeeds, id, { eaten_pct: pct })
    toast(`已填：${eatenLabel(pct)}`, { action: { label: "復原", onClick: () => patchIn(setFeeds, id, { eaten_pct: before }) }, duration: 5000 })
  }
  const litterNormal = (v: { urine_count: number; stool_count: number }) =>
    add(setLitter, { all_normal: true, urine_count: v.urine_count, urine_size: null, urine_flags: [], stool_count: v.stool_count, stool_cat: null, purina_range: null, stool_amount: null, stool_flags: [], photo_ids: [], note: "" },
      `已記錄清砂：尿塊 ${v.urine_count}・便 ${v.stool_count}・正常`)

  const settingsValues: SettingsValues = useMemo(() => ({
    birthday_est: config.birthday_est, birthday_estimated: config.birthday_estimated, clinic_name: config.clinic_name, clinic_phone: config.clinic_phone,
    clinic_24h: config.clinic_24h, med_interval_days: config.med_interval_days,
  }), [config])

  const home = (
    <HomeScreen
      cat={S.SAMPLE_CAT} me={me} {...common} failedCount={failed} config={config}
      status={homeState === "empty" ? "ready" : homeState}
      feeds={homeState === "empty" ? [] : feeds} litter={homeState === "empty" ? [] : litter}
      weights={homeState === "empty" ? [] : weightsView} meds={homeState === "empty" ? [] : meds}
      recent={homeState === "empty" ? [] : timelineItems(all.filter((e) => !e.deleted), now)}
      onOpen={setScreen} onFillEaten={fillEaten} onLitterNormal={litterNormal}
      onRetry={() => { setHomeState("loading"); setTimeout(() => setHomeState("ready"), 900) }}
      onRetrySync={retrySync} />
  )

  const screens: Record<ScreenId, React.ReactNode> = {
    home,
    feed: (
      <FeedScreen me={me} {...common} foods={foods} feeds={feeds} onBack={back}
        onLog={(f) => add(setFeeds, { food_id: f.food_id, food_name: f.name, qty: f.default_qty, unit: f.unit, grams_est: f.grams_per_unit ? f.grams_per_unit * f.default_qty : null, eaten_pct: null, reaction: null, note: "" },
          `已記錄：${f.name} ${f.default_qty} ${f.unit}`)}
        onFillEaten={fillEaten}
        onSaveDetail={(id, d) => { patchIn(setFeeds, id, d); toast("已儲存選填內容") }}
        onAddFood={(nf) => { setFoods((xs) => [...xs, { food_id: uid(), brand: "", default_qty: 1, fav: false, active: true, ...nf }]); toast(`已加入：${nf.name}`) }} />
    ),
    litter: (
      <LitterScreen {...common} litter={litter} clinic={clinicFromConfig(config)} onBack={back} onNormal={litterNormal}
        onSubmitDetail={(d) => add(setLitter, d, "已記錄清砂（有異常）")} />
    ),
    weight: (
      <WeightScreen {...common} config={config} weights={weightsView} onBack={back}
        onSubmit={(v) => add(setWeights, v, `已記錄體重 ${v.kg.toFixed(2)} kg`)} />
    ),
    med: (
      <MedScreen {...common} config={config} meds={meds} onBack={back}
        onGiveAgain={(m) => {
          const next = autoNextDue(m.kind, dateKey(now), config)
          add(setMeds, { kind: m.kind, product: m.product, dose: m.dose, next_due: next, note: "" }, `已記錄：${m.product}${next ? `，下次 ${next.replaceAll("-", "/")}` : ""}`)
        }}
        onSubmit={(v) => {
          const id = add(setMeds, { kind: v.kind, product: v.product, dose: v.dose, next_due: v.next_due, note: v.note }, `已記錄：${v.kind}`)
          if (v.given_date !== dateKey(now)) patchIn(setMeds, id, { ts: `${v.given_date}T${fmtTime(now)}:00+08:00` })
        }} />
    ),
    issue: (
      <IssueScreen {...common} issues={issues} onBack={back}
        pickPhoto={async () => ({ id: uid(), previewUrl: null, label: `示意 ${(photoSeq.current = (photoSeq.current % 3) + 1)}` })}
        onSubmit={(v) => add(setIssues, { category: v.category, sub: v.sub, severity: v.severity, photo_ids: v.photos.map((x) => x.id), photo_urls: [], note: v.note, resolved: false }, `已送出回報：${v.category}`)}
        onResolve={(id) => { patchIn(setIssues, id, { resolved: true }); toast("已標記解決", { action: { label: "復原", onClick: () => patchIn(setIssues, id, { resolved: false }) }, duration: 5000 }) }}
        onReopen={(id) => { patchIn(setIssues, id, { resolved: false }); toast("已改回未解決") }} />
    ),
    timeline: (
      <TimelineScreen {...common} failedCount={failed} entries={all} onHome={back}
        onUndo={(e) => { patchIn(setters[e.type] as Setter<{ id: string; deleted: boolean }>, e.id, { deleted: true }); toast("已撤銷（劃掉，可復原）", { action: { label: "復原", onClick: () => patchIn(setters[e.type] as Setter<{ id: string; deleted: boolean }>, e.id, { deleted: false }) }, duration: 5000 }) }}
        onRestore={(e) => { patchIn(setters[e.type] as Setter<{ id: string; deleted: boolean }>, e.id, { deleted: false }); toast("已復原") }}
        onEdit={(id, patch: EntryPatch) => {
          const e = all.find((x) => x.id === id); if (!e) return
          const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined))
          patchIn(setters[e.type] as Setter<{ id: string }>, id, clean); toast("已儲存修改")
        }}
        onRetrySync={retrySync} />
    ),
    settings: (
      <SettingsScreen now={now} catName={S.SAMPLE_CAT.name} values={settingsValues} me={me} users={S.SAMPLE_USERS}
        intervalsAreSample={JSON.stringify(config.med_interval_days) === JSON.stringify(S.SAMPLE_CONFIG.med_interval_days)}
        onBack={back}
        onSave={(v) => { setConfig((c) => ({ ...c, ...v })); toast.success(`已儲存設定${network !== "online" ? queuedNote : ""}`) }}
        onSwitchUser={() => { setScreen("onboarding"); toast("已清除這支手機的身分，請重新設定") }} />
    ),
    onboarding: (
      <OnboardingScreen catName={S.SAMPLE_CAT.name} users={S.SAMPLE_USERS} status={obStatus} showInstallHint needSecret={needSecret}
        onSubmit={({ who, secret }) => {
          const done = () => { setObStatus("idle"); setMe(who); setScreen("home"); toast(`嗨，${who}！設定完成`) }
          if (!needSecret) return done()
          if (network === "offline") return setObStatus("offline")
          setObStatus("checking")
          setTimeout(() => {
            if (network === "unreachable") return setObStatus("unreachable")
            if (secret.trim().toLowerCase() === "wrong") return setObStatus("bad-secret")
            done()
          }, slowCheck ? 25_000 : 700)
        }}
        footnote={
          <Alert variant="warning">
            <AlertTitle>示意畫面</AlertTitle>
            <AlertDescription>{needSecret
              ? "原型裡輸入任何文字都能進入；輸入「wrong」可看密鑰錯誤的樣子。"
              : "本機試用：還沒設定 Google 試算表網址，所以不用輸入密鑰，選好身分就能開始。"}</AlertDescription>
          </Alert>
        } />
    ),
  }

  const framed = !isPhone || SHOT
  const app = (
    <PortalContainerContext.Provider value={framed ? phoneEl : null}>
      <div className="flex h-full flex-col">
        {localTrial && <LocalTrialBanner />}
        {/* 試用橫條已經吃掉瀏海安全區，下面的畫面標題就不用再留（同 app/src/App.tsx） */}
        <div className="min-h-0 flex-1" style={localTrial ? ({ "--safe-top": "0px" } as React.CSSProperties) : undefined}>
          {screens[screen]}
        </div>
      </div>
      <Toaster theme={dark ? "dark" : "light"} position="bottom-center" visibleToasts={1}
        offset={{ bottom: "calc(var(--safe-bottom) + 76px)" }} mobileOffset={{ bottom: "calc(var(--safe-bottom) + 76px)", left: "12px", right: "12px" }}
        toastOptions={{
          classNames: {
            toast: "!bg-foreground !text-background !border-0 !rounded-xl !text-base !gap-3 !py-3 !pr-2 !pl-4 !shadow-md",
            title: "!text-base !font-medium",
            description: "!text-background !text-base",
            actionButton: "!h-11 !min-w-16 !rounded-lg !border !border-background !bg-transparent !px-4 !text-base !font-bold !text-background",
            error: "!bg-destructive !text-destructive-foreground",
            success: "!bg-success !text-success-foreground",
          },
        }} />
    </PortalContainerContext.Provider>
  )

  if (!framed) return <div className="h-dvh">{app}</div>

  const phone = (
    <div ref={setPhoneEl}
      className={SHOT ? `phone-frame relative w-[390px] overflow-hidden bg-background ${FULL ? "full min-h-[844px]" : "h-[844px]"}` : "phone-frame relative h-[844px] w-[390px] flex-none overflow-hidden rounded-[48px] bg-background shadow-[0_0_0_10px_#16120f,0_0_0_11px_#3a332d,0_20px_60px_rgb(0_0_0/0.25)]"}
      style={{ transform: "translateZ(0)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[60] flex h-[47px] items-center justify-between px-8 pt-1.5 font-bold">
        <span className="font-num">{fmtTime(now)}</span>
        <span className="flex items-center gap-1"><SignalHigh className="size-4" /><Wifi className="size-4" /><BatteryFull className="size-5" /></span>
      </div>
      <div aria-hidden className="pointer-events-none absolute top-[11px] left-1/2 z-[61] h-[34px] w-[124px] -translate-x-1/2 rounded-full bg-black" />
      <div className="h-full">{app}</div>
      <div aria-hidden className="pointer-events-none absolute bottom-2 left-1/2 z-[61] h-[5px] w-[134px] -translate-x-1/2 rounded-full bg-foreground/85" />
    </div>
  )
  if (SHOT) return phone

  return (
    <div className="flex min-h-dvh items-start justify-center gap-10 bg-muted p-6">
      <aside aria-label="審閱工具（不是 App 的一部分）" className="sticky top-6 w-[280px] flex-none rounded-xl border bg-card p-4 shadow-sm">
        <p className="text-lg font-bold">西西里共享紀錄</p>
        <p className="text-muted-foreground">可點原型 v0.1・2026-09-26・資料皆為示意</p>
        <h2 className="mt-4 mb-1 font-bold">畫面</h2>
        <nav className="grid gap-1">
          {SCREENS.map((s) => (
            <button key={s.id} type="button" onClick={() => setScreen(s.id)} aria-current={screen === s.id ? "page" : undefined}
              className={screen === s.id ? "min-h-11 rounded-lg bg-accent px-3 text-left font-bold text-accent-foreground" : "min-h-11 rounded-lg px-3 text-left"}>
              {s.label}
            </button>
          ))}
        </nav>
        <h2 className="mt-4 mb-1 font-bold">示範開關</h2>
        {([
          ["深色模式", dark, (v: boolean) => setDarkOverride(v)],
          ["手機離線", network === "offline", (v: boolean) => setNetwork(v ? "offline" : "online")],
          ["連不到後端（網路正常）", network === "unreachable", (v: boolean) => setNetwork(v ? "unreachable" : "online")],
          ["本機試用（沒有後端網址）", localTrial, setLocalTrial],
          ["首次開啟要密鑰（needSecret）", needSecret, (v: boolean) => { setNeedSecretOpt(v); if (v) setLocalTrial(false) }],
          ["慢連線模擬（確認密鑰要 25 秒）", slowCheck, setSlowCheck],
          ["下一筆送出失敗", failNext, setFailNext],
          ["體重已逾期（16 天）", weightOverdue, setWeightOverdue],
          ["確切生日（示意 2025-10-18）", !config.birthday_estimated,
            (v: boolean) => setConfig((c) => ({ ...c, ...(v ? S.SAMPLE_EXACT_BIRTHDAY : { birthday_est: S.SAMPLE_CONFIG.birthday_est, birthday_estimated: true }) }))],
          ["診所電話已設定（示意）", !!config.clinic_phone, (v: boolean) => setConfig((c) => ({ ...c, ...(v ? S.SAMPLE_CLINIC : { clinic_name: "", clinic_phone: "", clinic_24h: false }) }))],
        ] as const).map(([label, val, set]) => (
          <label key={label} className="flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" className="size-5 accent-[var(--primary)]" checked={val} onChange={(e) => set(e.target.checked)} />
            {label}
          </label>
        ))}
        <label className="mt-2 grid gap-1">
          <span className="font-bold">首頁狀態</span>
          <select className="h-11 rounded-lg border border-input bg-card px-2" value={homeState} onChange={(e) => setHomeState(e.target.value as typeof homeState)}>
            <option value="ready">一般（有資料）</option>
            <option value="loading">載入中</option>
            <option value="empty">空白（第一次使用）</option>
            <option value="error">讀取失敗</option>
          </select>
        </label>
        <label className="mt-2 grid gap-1">
          <span className="font-bold">首次開啟狀態</span>
          <select className="h-11 rounded-lg border border-input bg-card px-2" value={obStatus}
            onChange={(e) => { setObStatus(e.target.value as ObStatus); setScreen("onboarding") }}>
            <option value="idle">一般</option>
            <option value="checking">確認中</option>
            <option value="bad-secret">密鑰錯誤</option>
            <option value="unreachable">連不到後端</option>
            <option value="offline">手機離線</option>
          </select>
        </label>
        <Button variant="outline" className="mt-4 w-full" onClick={reset}>重設示意資料</Button>
      </aside>
      {phone}
    </div>
  )
}
