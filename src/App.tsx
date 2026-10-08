/**
 * App 容器：唯一有狀態的地方。畫面元件（src/screens）只接收 props；這裡接上資料層、路由、toast。
 * 畫面與元件的設計參考 docs/design/mockup/（原型只是參考，src/ 才是正本），toast 文案照 docs/design/。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { AnyEntry, CareKind, FeedEntry, Food, NetworkState, SettingsValues } from "@/types"
import { Toaster } from "@/components/ui/sonner"
import type { EntryPatch } from "@/components/EditEntrySheet"
import type { ListEndKind } from "@/components/ListEndState"
import { HomeScreen } from "@/screens/Home"
import { FeedScreen } from "@/screens/Feed"
import { FoodsScreen } from "@/screens/Foods"
import { LitterScreen } from "@/screens/Litter"
import { WeightScreen } from "@/screens/Weight"
import { MedScreen } from "@/screens/Med"
import { IssueScreen } from "@/screens/Issue"
import { IssueDetailScreen } from "@/screens/IssueDetail"
import { TimelineScreen } from "@/screens/Timeline"
import { OnboardingScreen } from "@/screens/Onboarding"
import { LocalTrialBanner } from "@/components/NetworkBanner"
import { SettingsScreen } from "@/screens/Settings"
import { addDays, dateKey, fmtDate, fmtTime } from "@/lib/format"
import { CARE_ITEMS } from "@/lib/care"
import { countMatching, firstBefore, type TimelineFilter } from "@/lib/history"
import { autoNextDue, clinicFromConfig, eatenLabel, timelineItems } from "@/lib/rules"
import { uuid, type Api } from "@/api"
import { createGasAdapter } from "@/api/gas"
import { NetworkError, ServerError } from "@/api/errors"
import type { LogTable } from "@/api/sheet"
import { TABLE_OF_TYPE, configChanges, decodeSnapshot, encodeFields, supportsV11 } from "@/data/codec"
import { CAT } from "@/data/defaults"
import { compressImage, pickImageFile, uploadIssuePhotos } from "@/data/photo"
import { createIdbPhotoCache } from "@/data/photoCache"
import { DEFAULT_USERS, DEMO, GAS_URL, clearSettings, loadSettings, saveSettings, type Settings } from "@/data/settings"
import { useSicily } from "@/hooks/useSicily"

type Route =
  | { name: "home" | "feed" | "litter" | "weight" | "med" | "issue" | "timeline" | "settings" | "foods" }
  | { name: "issue-detail"; id: string }

const SCREENS: Route["name"][] = ["home", "feed", "litter", "weight", "med", "issue", "timeline", "settings", "foods"]

const readHash = (): Route => {
  const h = location.hash.replace(/^#/, "")
  if (h.startsWith("issue/")) {
    const id = decodeURIComponent(h.slice("issue/".length))
    if (id) return { name: "issue-detail", id }
  }
  return (SCREENS as string[]).includes(h) ? { name: h as Exclude<Route["name"], "issue-detail"> } : { name: "home" }
}

const writeHash = (r: Route) => {
  location.hash = r.name === "issue-detail" ? `issue/${encodeURIComponent(r.id)}` : r.name
}

function useNow(stepMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), stepMs); return () => clearInterval(t) }, [stepMs])
  return now
}

function useSystemDark() {
  const [dark, setDark] = useState(() => matchMedia("(prefers-color-scheme: dark)").matches)
  useEffect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)")
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener("change", on)
    return () => mq.removeEventListener("change", on)
  }, [])
  return dark
}

export default function App() {
  const dark = useSystemDark()
  useEffect(() => { document.documentElement.classList.toggle("dark", dark) }, [dark])
  const [settings, setSettings] = useState<Settings | null>(() => loadSettings())

  return (
    <div className="flex h-dvh flex-col">
      {DEMO && <LocalTrialBanner />}
      {/* 試用橫條已經吃掉瀏海安全區，下面的畫面標題就不用再留 */}
      <div className="min-h-0 flex-1" style={DEMO ? ({ "--safe-top": "0px" } as React.CSSProperties) : undefined}>
        {settings
          ? <Main settings={settings} onSignOut={() => { clearSettings(); setSettings(null); location.hash = "" }} />
          : <Onboarding onDone={(s) => { saveSettings(s); setSettings(s); location.hash = "home"; toast(`嗨，${s.who}！設定完成`) }} />}
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
    </div>
  )
}

/** 首次開啟：選身分；有後端網址時再輸入共享密鑰，先用密鑰讀一次 Sheet 確認正確才存 */
function Onboarding({ onDone }: { onDone: (s: Settings) => void }) {
  const [status, setStatus] = useState<"idle" | "checking" | "bad-secret" | "offline" | "unreachable">("idle")
  // 連線失敗時分清楚：手機本身沒網路，還是有網路但 Google 後端沒回應／網址錯
  const netFail = () => setStatus(navigator.onLine === false ? "offline" : "unreachable")
  const standalone = matchMedia("(display-mode: standalone)").matches
  return (
    <OnboardingScreen catName={CAT.name} users={DEFAULT_USERS} status={status} showInstallHint={!standalone} needSecret={!DEMO}
      onSubmit={async ({ who, secret }) => {
        if (DEMO) return onDone({ who, secret: "" })
        setStatus("checking")
        // Apps Script 冷啟動偶爾要 20–30 秒；逾時用介面卡預設的 GAS_TIMEOUT_MS（55 秒）
        try {
          const res = await createGasAdapter({ url: GAS_URL, secret: secret.trim() }).call({ action: "read", days: 1 })
          if (res.ok === false) return res.error === "unauthorized" ? setStatus("bad-secret") : netFail()
          setStatus("idle")
          onDone({ who, secret: secret.trim() })
        } catch (err) {
          // 網址回的不是預期的 JSON（例如部署設定錯）也算「連不到後端」，不是密鑰錯
          if (err instanceof ServerError && err.code === "unauthorized") setStatus("bad-secret")
          else netFail()
        }
      }} />
  )
}

function Main({ settings, onSignOut }: { settings: Settings; onSignOut: () => void }) {
  const now = useNow()
  const { api, data, snap, loadState, network, queuedCount, failedCount, refresh } = useSicily(settings, now)
  const me = settings.who
  const photoCache = useMemo(() => createIdbPhotoCache(), [])

  const [route, setRouteState] = useState<Route>(readHash)
  const setRoute = useCallback((r: Route) => { writeHash(r); setRouteState(r) }, [])
  useEffect(() => { const on = () => setRouteState(readHash()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on) }, [])
  const back = () => setRoute({ name: "home" })
  const openScreen = (name: Exclude<Route, { name: "issue-detail" }>["name"]) => setRoute({ name })

  const dirty = useRef(false)
  useEffect(() => {
    const on = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault() }
    addEventListener("beforeunload", on)
    return () => removeEventListener("beforeunload", on)
  }, [])

  const send = useCallback((p: Promise<unknown>) => { p.catch((e) => toast.error("沒送出去", { description: String((e as Error).message ?? e) })) }, [])
  const offlineNote = (net: NetworkState, msg: string) => (net !== "online" ? `${msg}（${net === "offline" ? "離線" : "連不到後端"}，待上傳）` : msg)

  function add(table: LogTable, body: object, msg: string, opts: { ts?: string; onUndo?: () => void } = {}) {
    const id = uuid()
    send(api.log(table, encodeFields(body) as never, { ...opts, id }))
    toast(offlineNote(network, msg), { action: { label: "復原", onClick: () => { opts.onUndo?.(); send(api.remove(table, id)) } }, duration: 5000 })
    return id
  }
  const edit = (table: LogTable, id: string, patch: object) => send(api.edit(table, id, encodeFields(patch) as never))

  const fillEaten = (id: string, pct: FeedEntry["eaten_pct"]) => {
    const before = data?.feeds.find((f) => f.id === id)?.eaten_pct ?? null
    edit("Feed", id, { eaten_pct: pct })
    toast(`已填：${eatenLabel(pct)}`, { action: { label: "復原", onClick: () => edit("Feed", id, { eaten_pct: before }) }, duration: 5000 })
  }
  const litterNormal = (v: { urine_count: number; stool_count: number }) =>
    add("Litter", { all_normal: true, urine_count: v.urine_count, urine_size: null, urine_flags: [], stool_count: v.stool_count, stool_cat: null, purina_range: null, stool_amount: null, stool_flags: [], photo_ids: [], note: "" },
      `已記錄清砂：尿塊 ${v.urine_count}・便 ${v.stool_count}・正常`)
  const retrySync = () => { void api.retryFailed().then((n) => { if (n) toast.success("送出了") }) }

  const photos = useRef(new Map<string, { base64: string; name: string }>())
  const pickPhoto = async () => {
    const file = await pickImageFile()
    if (!file) return null
    try {
      const p = await compressImage(file)
      const id = uuid()
      photos.current.set(id, { base64: p.base64, name: p.name })
      return { id, previewUrl: p.dataUrl, label: file.name }
    } catch {
      toast.error("這張照片讀不出來，換一張試試")
      return null
    }
  }

  const [filters, setFilters] = useState<TimelineFilter[]>([])
  const [scrollTop, setScrollTop] = useState(0)
  const mainRef = useRef<HTMLElement | null>(null)
  const moreBtnRef = useRef<HTMLButtonElement | null>(null)
  const cursorRef = useRef<string | null>(null)
  const inflightRef = useRef(false)
  const [pager, setPager] = useState({ hasMore: true as boolean, loading: false, error: null as null | "offline" | "fail", suppressAuto: false })

  useEffect(() => { setPager((p) => ({ ...p, suppressAuto: false })) }, [filters])

  const historyFrom = cursorRef.current ?? (snap ? firstBefore(snap.serverTime, snap.days, now) : firstBefore("", 7, now))

  const loadOlder = useCallback(async () => {
    if (!data || !snap || !supportsV11(data.version)) return
    if (inflightRef.current) return
    if (!navigator.onLine) { setPager((p) => ({ ...p, error: "offline" })); return }
    const before = cursorRef.current ?? firstBefore(snap.serverTime, snap.days, now)
    if (api.hasFetchedBefore(before)) return
    inflightRef.current = true
    setPager((p) => ({ ...p, loading: true, error: null }))
    const beforeCount = countMatching(data.all, filters)
    try {
      const page = await api.history({ before, days: 30 })
      cursorRef.current = page.from
      const peek = api.peek()
      const afterCount = peek ? countMatching(decodeSnapshot(peek, now).all, filters) : beforeCount
      setPager((p) => ({
        ...p, loading: false, hasMore: page.hasMore, error: null,
        suppressAuto: afterCount <= beforeCount ? true : p.suppressAuto,
      }))
    } catch (e) {
      const offline = e instanceof NetworkError && !navigator.onLine
      setPager((p) => ({ ...p, loading: false, error: offline ? "offline" : "fail" }))
    } finally {
      inflightRef.current = false
    }
  }, [api, data, snap, now, filters])

  const endKind = ((): ListEndKind => {
    const version = data?.version ?? 0
    if (!supportsV11(version)) return { kind: "update" }
    if (pager.loading) return { kind: "loading" }
    if (pager.error === "fail") return { kind: "fail", onRetry: () => { setPager((p) => ({ ...p, suppressAuto: false })); void loadOlder() } }
    if ((network === "offline" || !navigator.onLine) && pager.hasMore) return { kind: "offline" }
    if (pager.hasMore === false) return { kind: "end" }
    return {
      kind: "more", from: historyFrom,
      onMore: () => { setPager((p) => ({ ...p, suppressAuto: false })); void loadOlder() },
      buttonRef: moreBtnRef,
    }
  })()

  useEffect(() => {
    if (route.name !== "timeline") return
    if (endKind.kind !== "more" || pager.suppressAuto || inflightRef.current) return
    const root = mainRef.current
    const target = moreBtnRef.current
    if (!root || !target) return
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadOlder()
    }, { root, rootMargin: "600px" })
    io.observe(target)
    return () => io.disconnect()
  }, [route.name, endKind.kind, pager.suppressAuto, loadOlder, data?.all.length])

  useEffect(() => {
    const on = () => {
      if (route.name !== "timeline") return
      if (endKind.kind !== "offline") return
      const root = mainRef.current
      if (!root) return
      const nearEnd = root.scrollHeight - root.scrollTop - root.clientHeight < 800
      if (nearEnd) void loadOlder()
    }
    addEventListener("online", on)
    return () => removeEventListener("online", on)
  }, [route.name, endKind.kind, loadOlder])

  const all = data?.all ?? []
  const settingsValues: SettingsValues | null = useMemo(() => data && ({
    birthday_est: data.config.birthday_est, birthday_estimated: data.config.birthday_estimated, clinic_name: data.config.clinic_name, clinic_phone: data.config.clinic_phone,
    clinic_24h: data.config.clinic_24h, med_interval_days: data.config.med_interval_days,
    litter_wash_int_days: data.config.litter_wash_int_days, feeder_clean_int_days: data.config.feeder_clean_int_days, desiccant_int_days: data.config.desiccant_int_days,
  }), [data])

  const emptyConfig = { birthday_est: "", birthday_estimated: true, clinic_name: "", clinic_phone: "", clinic_24h: false, weight_interval_days: 14, deworm_int_days: 90, med_interval_days: {}, litter_clumping: true, litter_wash_int_days: 30, feeder_clean_int_days: 30, desiccant_int_days: 30 }

  if (!data) {
    if (route.name === "timeline") {
      return (
        <TimelineScreen now={now} network={network} queuedCount={queuedCount} failedCount={failedCount}
          entries={[]} loading filters={filters} onFilters={setFilters} from={historyFrom}
          end={{ kind: "loading" }} mainRef={mainRef} onMainScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          scrollTop={scrollTop} onHome={back} onUndo={() => {}} onRestore={() => {}} onEdit={() => {}} onRetrySync={retrySync} />
      )
    }
    return (
      <HomeScreen cat={CAT} me={me} now={now} status={loadState === "error" ? "error" : "loading"} network={network}
        queuedCount={queuedCount} failedCount={failedCount} config={emptyConfig}
        feeds={[]} litter={[]} weights={[]} meds={[]} cares={[]} version={0} recent={[]}
        onOpen={openScreen} onLogCare={() => {}} onOpenCareHistory={() => {}} onFillEaten={() => {}} onLitterNormal={() => {}} onRetry={() => void refresh()} onRetrySync={retrySync} />
    )
  }

  const common = { now, network, queuedCount }
  const { config } = data

  const logCare = (kind: CareKind, onUndo: () => void) => {
    if (!supportsV11(data.version)) return
    const item = CARE_ITEMS.find((x) => x.kind === kind)
    if (!item) return
    const nextKey = addDays(dateKey(now), Number(config[item.configKey]) || 30)
    add("Care", { kind, note: "" }, `已記錄：${item.label}，下次 ${fmtDate(nextKey + "T12:00:00+08:00")}`, { onUndo })
  }

  switch (route.name) {
    case "feed":
      return (
        <FeedScreen me={me} {...common} foods={data.foods} feeds={data.feeds} onBack={back}
          onLog={(f: Food) => add("Feed", { food_id: f.food_id, food_name: f.name, qty: f.default_qty, unit: f.unit, grams_est: f.grams_per_unit ? f.grams_per_unit * f.default_qty : null, eaten_pct: null, reaction: null, note: "" },
            `已記錄：${f.name} ${f.default_qty} ${f.unit}`)}
          onFillEaten={fillEaten}
          onSaveDetail={(id, d) => { edit("Feed", id, d); toast("已儲存選填內容") }}
          onAddFood={(nf) => {
            send(api.upsertFood(encodeFields({ food_id: uuid(), brand: "", default_qty: 1, fav: false, active: true, ...nf }) as never))
            toast(`已加入：${nf.name}`)
          }}
          onManageFoods={() => setRoute({ name: "foods" })} />
      )
    case "foods":
      return (
        <FoodsScreen {...common} foods={data.foods} onBack={() => setRoute({ name: "feed" })}
          onArchive={(food) => {
            send(api.upsertFood({ food_id: food.food_id, active: false }))
            toast(offlineNote(network, `已封存：${food.name}`), {
              action: { label: "復原", onClick: () => send(api.upsertFood({ food_id: food.food_id, active: true })) }, duration: 5000,
            })
          }}
          onRestore={(food) => { send(api.upsertFood({ food_id: food.food_id, active: true })); toast(`已恢復：${food.name}`) }}
          onAddFood={(nf) => {
            send(api.upsertFood(encodeFields({ food_id: uuid(), brand: "", default_qty: 1, fav: false, active: true, ...nf }) as never))
            toast(`已加入：${nf.name}`)
          }} />
      )
    case "litter":
      return (
        <LitterScreen {...common} litter={data.litter} clinic={clinicFromConfig(config)} onBack={back} onNormal={litterNormal}
          onSubmitDetail={(d) => add("Litter", d, "已記錄清砂（有異常）")} />
      )
    case "weight":
      return (
        <WeightScreen {...common} config={config} weights={data.weights} onBack={back}
          onSubmit={(v) => add("Weight", v, `已記錄體重 ${v.kg.toFixed(2)} kg`)} />
      )
    case "med":
      return (
        <MedScreen {...common} config={config} meds={data.meds} onBack={back}
          onGiveAgain={(m) => {
            const next = autoNextDue(m.kind, dateKey(now), config)
            add("Med", { kind: m.kind, product: m.product, dose: m.dose, next_due: next, note: "" }, `已記錄：${m.product}${next ? `，下次 ${next.replaceAll("-", "/")}` : ""}`)
          }}
          onSubmit={(v) => add("Med", { kind: v.kind, product: v.product, dose: v.dose, next_due: v.next_due, note: v.note }, `已記錄：${v.kind}`,
            v.given_date !== dateKey(now) ? { ts: `${v.given_date}T${fmtTime(now)}:00+08:00` } : {})} />
      )
    case "issue":
      return (
        <IssueScreen {...common} issues={data.issues} onBack={back} pickPhoto={pickPhoto}
          onSubmit={(v) => {
            const id = add("Issue", { category: v.category, sub: v.sub, severity: v.severity, photo_ids: [], photo_urls: [], note: v.note, resolved: false }, `已送出回報：${v.category}`)
            const files = v.photos.map((p) => photos.current.get(p.id)).filter((x): x is { base64: string; name: string } => !!x)
            photos.current.clear()
            if (files.length) void uploadPhotos(api, id, files)
          }}
          onResolve={(id) => { edit("Issue", id, { resolved: true }); toast("已標記解決", { action: { label: "復原", onClick: () => edit("Issue", id, { resolved: false }) }, duration: 5000 }) }}
          onReopen={(id) => { edit("Issue", id, { resolved: false }); toast("已改回未解決") }}
          onOpenDetail={(id) => setRoute({ name: "issue-detail", id })} />
      )
    case "issue-detail": {
      const issue = data.issues.find((i) => i.id === route.id)
      return (
        <IssueDetailScreen {...common} issue={issue} version={data.version} api={api} cache={photoCache}
          onBack={() => setRoute({ name: "issue" })}
          onEdit={(id, patch: EntryPatch) => { edit("Issue", id, patch); toast("已儲存修改") }}
          onUndo={() => {
            if (!issue) return
            send(api.remove("Issue", issue.id))
            toast("已撤銷（劃掉，可復原）", { action: { label: "復原", onClick: () => send(api.restore("Issue", issue.id)) }, duration: 5000 })
          }}
          onRestore={() => { if (issue) { send(api.restore("Issue", issue.id)); toast("已復原") } }}
          onResolve={() => { if (issue) { edit("Issue", issue.id, { resolved: true }); toast("已標記解決", { action: { label: "復原", onClick: () => edit("Issue", issue.id, { resolved: false }) }, duration: 5000 }) } }}
          onReopen={() => { if (issue) { edit("Issue", issue.id, { resolved: false }); toast("已改回未解決") } }} />
      )
    }
    case "timeline":
      return (
        <TimelineScreen {...common} failedCount={failedCount} entries={all} loading={false}
          filters={filters} onFilters={setFilters} from={historyFrom} end={endKind}
          mainRef={mainRef} onMainScroll={(e) => setScrollTop(e.currentTarget.scrollTop)} scrollTop={scrollTop}
          onHome={back}
          onUndo={(e: AnyEntry) => {
            send(api.remove(TABLE_OF_TYPE[e.type], e.id))
            toast("已撤銷（劃掉，可復原）", { action: { label: "復原", onClick: () => send(api.restore(TABLE_OF_TYPE[e.type], e.id)) }, duration: 5000 })
          }}
          onRestore={(e) => { send(api.restore(TABLE_OF_TYPE[e.type], e.id)); toast("已復原") }}
          onEdit={(id, patch: EntryPatch) => {
            const e = all.find((x) => x.id === id); if (!e) return
            edit(TABLE_OF_TYPE[e.type], id, patch); toast("已儲存修改")
          }}
          onRetrySync={retrySync} />
      )
    case "settings":
      return (
        <SettingsScreen now={now} catName={CAT.name} values={settingsValues!} me={me} users={data.users}
          intervalsAreSample={data.intervalsAreSample} onBack={back}
          onDirtyChange={(d) => { dirty.current = d }}
          onSave={(v) => {
            for (const [k, val] of configChanges(v, data.rawConfig)) send(api.setConfig(k, val))
            toast.success("已儲存設定")
          }}
          onSwitchUser={() => { onSignOut(); toast("已清除這支手機的身分，請重新設定") }} />
      )
    default:
      return (
        <HomeScreen cat={CAT} me={me} {...common} failedCount={failedCount} config={config} status="ready"
          feeds={data.feeds} litter={data.litter} weights={data.weights} meds={data.meds} cares={data.cares} version={data.version}
          recent={timelineItems(all.filter((e) => !e.deleted), now)}
          onOpen={openScreen} onLogCare={logCare} onOpenCareHistory={() => { setFilters(["居家維護"]); setRoute({ name: "timeline" }) }}
          onFillEaten={fillEaten} onLitterNormal={litterNormal}
          onRetry={() => void refresh()} onRetrySync={retrySync} />
      )
  }
}

async function uploadPhotos(api: Api, issueId: string, files: { base64: string; name: string }[]) {
  try {
    const r = await uploadIssuePhotos(api, issueId, files)
    if (r === "saved") toast("照片先存在手機，上線後自動補傳")
  } catch (e) {
    toast.error("照片沒傳上去", { description: String((e as Error).message ?? e) })
  }
}
