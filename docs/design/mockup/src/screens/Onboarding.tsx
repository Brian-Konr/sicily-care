import { useEffect, useState, type ReactNode } from "react"
import { Eye, EyeOff, LoaderCircle, RotateCw, SquarePlus, Share, TriangleAlert, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BottomActionBar, ScreenLayout } from "@/components/ScreenLayout"
import { cn } from "@/lib/utils"

export interface OnboardingScreenProps {
  catName: string
  users: [string, string]
  /** idle／checking（驗證中）／bad-secret（密鑰錯）／offline（手機沒網路）／unreachable（有網路但連不到 Google 後端） */
  status: "idle" | "checking" | "bad-secret" | "offline" | "unreachable"
  /** 還沒設定後端網址（本機試用）時傳 false：只選身分，不問密鑰 */
  needSecret?: boolean
  /** iOS Safari 且尚未加到主畫面時顯示「加入主畫面」提示 */
  showInstallHint: boolean
  onSubmit: (v: { who: string; secret: string }) => void
  /** 頁尾附註（原型用來放示意說明；正式 App 可不傳） */
  footnote?: ReactNode
}

/**
 * 首次開啟（DESIGN.md §8 連線狀態／本機試用）：
 * - needSecret=false（本機試用，沒有後端網址）時跳過密鑰步驟，只選身分；頂部試用橫條由 App 殼負責（`LocalTrialBanner`）
 * - 三種失敗分開講：密鑰錯誤（destructive 文字）／手機離線（info）／連不到 Google 後端（warning＋「再試一次」）
 */
export function OnboardingScreen(p: OnboardingScreenProps) {
  const needSecret = p.needSecret ?? true
  const [who, setWho] = useState<string | null>(null)
  const [secret, setSecret] = useState("")
  const [show, setShow] = useState(false)
  const busy = p.status === "checking"
  const can = !!who && (!needSecret || secret.trim().length > 0) && !busy
  const submit = () => who && p.onSubmit({ who, secret: needSecret ? secret : "" })
  const waited = useWaitSeconds(busy)
  const waitNote = waited >= 20 ? "還在連線，請不要關掉 App" : waited >= 5 ? "第一次連線 Google 比較慢，最多約半分鐘" : ""

  return (
    <ScreenLayout title="第一次使用"
      bottom={<BottomActionBar>
        <Button size="lg" className="w-full" disabled={!can} onClick={submit}>
          {busy ? <><LoaderCircle className="animate-spin" aria-hidden />確認中⋯</> : "開始使用"}
        </Button>
        <p aria-live="polite" className="mt-2 text-center text-sm text-muted-foreground empty:hidden">{waitNote}</p>
      </BottomActionBar>}>
      <div className="space-y-6 pt-2">
        <div>
          <p className="text-2xl font-bold">嗨！一起照顧{p.catName} 🐾</p>
          <p className="text-muted-foreground">只要設定一次，之後打開就能直接記錄。</p>
        </div>

        <section aria-labelledby="ob-who" className="grid gap-3">
          <h2 id="ob-who" className="text-lg font-bold">{needSecret && <span className="text-muted-foreground">1／2　</span>}你是誰？</h2>
          <div role="radiogroup" aria-labelledby="ob-who" className="grid gap-3">
            {p.users.map((u) => (
              <button key={u} type="button" role="radio" aria-checked={who === u} onClick={() => setWho(u)}
                className={cn("flex min-h-18 items-center gap-4 rounded-xl border border-input bg-card px-4 text-left text-xl font-bold",
                  who === u && "border-[3px] border-primary bg-accent text-accent-foreground")}>
                <span aria-hidden className="grid size-11 place-items-center rounded-full bg-primary text-lg text-primary-foreground">{u.slice(0, 1)}</span>
                我是 {u}
                {who === u && <span className="ml-auto text-base">✓ 已選</span>}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground">記錄時會自動寫上你的名字，之後可以在設定頁切換。</p>
        </section>

        {needSecret && <section aria-labelledby="ob-secret" className="grid gap-2">
          <h2 id="ob-secret" className="text-lg font-bold"><span className="text-muted-foreground">2／2　</span>輸入共享密鑰</h2>
          <Label htmlFor="secret" className="sr-only">共享密鑰</Label>
          <div className="relative">
            <Input id="secret" type={show ? "text" : "password"} autoComplete="off" autoCapitalize="off" spellCheck={false}
              value={secret} onChange={(e) => setSecret(e.target.value)} aria-invalid={p.status === "bad-secret"}
              aria-describedby="secret-hint" className="pr-12" placeholder="兩人用同一組" />
            <Button type="button" variant="ghost" size="icon" className="absolute top-0.5 right-0.5" onClick={() => setShow((s) => !s)}
              aria-label={show ? "隱藏密鑰" : "顯示密鑰"} aria-pressed={show}>
              {show ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
            </Button>
          </div>
          {p.status === "bad-secret" && <p role="alert" className="font-bold text-destructive">密鑰不對，請跟另一位確認後再輸入一次。</p>}
          {p.status === "offline" && (
            <Alert variant="info"><WifiOff aria-hidden />
              <AlertDescription className="text-base">手機目前沒有網路，連上 Wi‑Fi 或行動網路後再試一次。</AlertDescription>
            </Alert>
          )}
          {p.status === "unreachable" && (
            <Alert variant="warning"><TriangleAlert aria-hidden />
              <AlertDescription className="grid gap-2 text-base">
                <p>網路正常，但連不到 Google 試算表。可能是網址設定有誤，或 Google 暫時沒回應。</p>
                <Button type="button" variant="outline" className="justify-self-start" onClick={submit} disabled={!can}>
                  <RotateCw aria-hidden />再試一次
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <p id="secret-hint" className="text-muted-foreground">密鑰只存在這支手機，不會出現在網址裡。</p>
        </section>}

        {p.showInstallHint && (
          <Card className="gap-2 px-4 py-4">
            <p className="font-bold">📲 加到主畫面，用起來像 App</p>
            <ol className="grid gap-1">
              <li>1. 用 Safari 開這個網址</li>
              <li className="flex flex-wrap items-center gap-1">2. 點「分享」<Share className="size-5 text-info" aria-label="分享圖示" />（找不到就先點「⋯」）</li>
              <li className="flex flex-wrap items-center gap-1">3. 選「加入主畫面」<SquarePlus className="size-5" aria-label="加入主畫面圖示" /></li>
            </ol>
          </Card>
        )}

        {p.footnote}
      </div>
    </ScreenLayout>
  )
}

/** 長等待要說明（DESIGN.md）：busy 期間每秒累計，結束歸零 */
function useWaitSeconds(busy: boolean) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!busy) { setSec(0); return }
    const t0 = Date.now()
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(id)
  }, [busy])
  return sec
}
