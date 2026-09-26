/**
 * App 容器：唯一有狀態的地方。畫面元件（src/screens）只接收 props；這裡接上資料層、路由、toast。
 * 畫面與元件來自 Winter 的原型（scripts/sync-mockup.sh 同步），toast 文案照 design/mockup/README.md。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { AnyEntry, FeedEntry, Food, NetworkState, ScreenId, SettingsValues } from "@/types"
import { Toaster } from "@/components/ui/sonner"
import type { EntryPatch } from "@/components/EditEntrySheet"
import { HomeScreen } from "@/screens/Home"
import { FeedScreen } from "@/screens/Feed"
import { LitterScreen } from "@/screens/Litter"
import { WeightScreen } from "@/screens/Weight"
import { MedScreen } from "@/screens/Med"
import { IssueScreen } from "@/screens/Issue"
import { TimelineScreen } from "@/screens/Timeline"
import { OnboardingScreen } from "@/screens/Onboarding"
import { LocalTrialBanner } from "@/components/NetworkBanner"
import { SettingsScreen } from "@/screens/Settings"
import { dateKey, fmtTime } from "@/lib/format"
import { autoNextDue, clinicFromConfig, eatenLabel, timelineItems } from "@/lib/rules"
import { uuid, type Api } from "@/api"
import { createGasAdapter } from "@/api/gas"
import { ServerError } from "@/api/errors"
import type { LogTable } from "@/api/sheet"
import { TABLE_OF_TYPE, configChanges, encodeFields } from "@/data/codec"
import { CAT } from "@/data/defaults"
import { compressImage, pickImageFile, uploadIssuePhotos } from "@/data/photo"
import { DEFAULT_USERS, DEMO, GAS_URL, clearSettings, loadSettings, saveSettings, type Settings } from "@/data/settings"
import { useSicily } from "@/hooks/useSicily"

const ROUTES: ScreenId[] = ["home", "feed", "litter", "weight", "med", "issue", "timeline", "settings"]
const readHash = (): ScreenId => {
  const h = location.hash.replace("#", "") as ScreenId
  return ROUTES.includes(h) ? h : "home"
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
  const { api, data, loadState, network, queuedCount, failedCount, refresh } = useSicily(settings, now)
  const me = settings.who

  const [screen, setScreenState] = useState<ScreenId>(readHash)
  const setScreen = useCallback((s: ScreenId) => { location.hash = s; setScreenState(s) }, [])
  useEffect(() => { const on = () => setScreenState(readHash()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on) }, [])
  const back = () => setScreen("home")

  // 設定頁有未儲存的修改時，關頁前提醒
  const dirty = useRef(false)
  useEffect(() => {
    const on = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault() }
    addEventListener("beforeunload", on)
    return () => removeEventListener("beforeunload", on)
  }, [])

  /** 送出寫入；背景失敗（非離線）時提示，紀錄會留在「沒送出」清單可重試 */
  const send = useCallback((p: Promise<unknown>) => { p.catch((e) => toast.error("沒送出去", { description: String((e as Error).message ?? e) })) }, [])
  const offlineNote = (net: NetworkState, msg: string) => (net !== "online" ? `${msg}（${net === "offline" ? "離線" : "連不到後端"}，待上傳）` : msg)

  /** 新增一筆＋toast（「復原」＝軟刪除） */
  function add(table: LogTable, body: object, msg: string, opts: { ts?: string } = {}) {
    const id = uuid()
    send(api.log(table, encodeFields(body) as never, { ...opts, id }))
    toast(offlineNote(network, msg), { action: { label: "復原", onClick: () => send(api.remove(table, id)) }, duration: 5000 })
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

  // 照片：選好先壓縮，送出回報時再上傳
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

  const all = data?.all ?? []
  const settingsValues: SettingsValues | null = useMemo(() => data && ({
    birthday_est: data.config.birthday_est, clinic_name: data.config.clinic_name, clinic_phone: data.config.clinic_phone,
    clinic_24h: data.config.clinic_24h, med_interval_days: data.config.med_interval_days,
  }), [data])

  if (!data) {
    return (
      <HomeScreen cat={CAT} me={me} now={now} status={loadState === "error" ? "error" : "loading"} network={network}
        queuedCount={queuedCount} failedCount={failedCount} config={{ birthday_est: "", clinic_name: "", clinic_phone: "", clinic_24h: false, weight_interval_days: 14, deworm_int_days: 90, med_interval_days: {}, litter_clumping: true }}
        feeds={[]} litter={[]} weights={[]} meds={[]} recent={[]}
        onOpen={setScreen} onFillEaten={() => {}} onLitterNormal={() => {}} onRetry={() => void refresh()} onRetrySync={retrySync} />
    )
  }

  const common = { now, network, queuedCount }
  const { config } = data

  switch (screen) {
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
          onReopen={(id) => { edit("Issue", id, { resolved: false }); toast("已改回未解決") }} />
      )
    case "timeline":
      return (
        <TimelineScreen {...common} failedCount={failedCount} entries={all} onHome={back}
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
          feeds={data.feeds} litter={data.litter} weights={data.weights} meds={data.meds}
          recent={timelineItems(all.filter((e) => !e.deleted), now)}
          onOpen={setScreen} onFillEaten={fillEaten} onLitterNormal={litterNormal}
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
