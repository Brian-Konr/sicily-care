import { CloudOff, RefreshCw, RotateCw, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { NetworkState } from "@/types"

export interface NetworkBannerProps {
  network: NetworkState
  /** 排隊中（離線／連不到後端）或送出失敗的筆數 */
  queuedCount: number
  failedCount?: number
  /** 「重新送出」（有沒送出的紀錄時）／「再試一次」（連不到後端時）。沒傳就不顯示按鈕 */
  onRetry?: () => void
}

/**
 * 畫面內的連線橫幅（DESIGN.md §8「連線狀態要分清楚原因」）。依優先順序：
 * 1. 連不到後端（warning＋再試一次）：手機有網路，但 Google 試算表沒回應
 * 2. 手機離線（info）
 * 3. 沒送出（destructive＋重新送出）：線上、但有紀錄送出失敗
 * 4. 正在補送（info）：剛恢復連線、還有排隊的紀錄
 * 線上且沒有待送時不顯示。第 4 種「本機試用」是頂部固定橫條，見下方 `LocalTrialBanner`。
 */
export function NetworkBanner({ network, queuedCount, failedCount = 0, onRetry }: NetworkBannerProps) {
  const pending = queuedCount + failedCount
  if (network === "unreachable")
    return (
      <Alert variant="warning">
        <TriangleAlert aria-hidden />
        <AlertTitle>連不到 Google 試算表</AlertTitle>
        <AlertDescription>
          <p>網路正常，但後端沒有回應。{pending > 0 ? `有 ${pending} 筆先存在手機，連上後會自動補送。` : "照常記錄就好，連上後會自動補送。"}</p>
          {onRetry && <Button size="sm" variant="outline" className="mt-1" onClick={onRetry}><RotateCw aria-hidden />再試一次</Button>}
        </AlertDescription>
      </Alert>
    )
  if (network === "offline")
    return (
      <Alert variant="info">
        <CloudOff aria-hidden />
        <AlertTitle>手機目前沒有網路</AlertTitle>
        <AlertDescription>
          {pending > 0 ? `有 ${pending} 筆先存在手機，連上 Wi‑Fi 或行動網路後會自動補送。` : "照常記錄就好，連上 Wi‑Fi 或行動網路後會自動補送。"}
        </AlertDescription>
      </Alert>
    )
  if (failedCount > 0)
    return (
      <Alert variant="destructive" className="border-destructive">
        <RefreshCw aria-hidden />
        <AlertTitle>有 {failedCount} 筆沒送出去</AlertTitle>
        <AlertDescription>
          <p>紀錄還在手機上，不會不見。</p>
          {onRetry && <Button size="sm" variant="outline" className="mt-1" onClick={onRetry}>重新送出</Button>}
        </AlertDescription>
      </Alert>
    )
  if (queuedCount > 0)
    return (
      <Alert variant="info">
        <CloudOff aria-hidden />
        <AlertTitle>正在補送</AlertTitle>
        <AlertDescription>有 {queuedCount} 筆正在送到 Google 試算表。</AlertDescription>
      </Alert>
    )
  return null
}

/**
 * 本機試用橫條（沒有設定後端網址時）：muted、固定在最上方、吃掉瀏海安全區。
 * 用法：放在 App 殼最上面，下面的內容把 `--safe-top` 設成 0（見原型 App.tsx）。只有本機試用會出現。
 */
export function LocalTrialBanner() {
  return (
    <div role="status" className="flex-none bg-muted px-4 pt-[calc(var(--safe-top)+0.25rem)] pb-1 text-center text-sm font-bold text-muted-foreground">
      本機試用・資料只存在這支手機
    </div>
  )
}
