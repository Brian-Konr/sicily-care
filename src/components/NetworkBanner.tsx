import { CloudOff, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { NetworkState } from "@/types"

export interface NetworkBannerProps {
  network: NetworkState
  /** 排隊中（離線）或送出失敗的筆數 */
  queuedCount: number
  failedCount?: number
  onRetry?: () => void
}

/** 離線／待補送提示。線上且沒有待送時不顯示。 */
export function NetworkBanner({ network, queuedCount, failedCount = 0, onRetry }: NetworkBannerProps) {
  if (network === "online" && queuedCount === 0 && failedCount === 0) return null
  if (failedCount > 0 && network === "online")
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
  return (
    <Alert variant="info">
      <CloudOff aria-hidden />
      <AlertTitle>{network === "offline" ? "目前離線" : "正在補送"}</AlertTitle>
      <AlertDescription>
        {queuedCount > 0 ? `有 ${queuedCount} 筆先存在手機，連上網路後會自動補送。` : "照常記錄就好，連上網路後會自動補送。"}
      </AlertDescription>
    </Alert>
  )
}
