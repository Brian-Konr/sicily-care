import type { Ref } from "react"
import { CloudOff, RefreshCw, TriangleAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { UpdateNeededNote } from "@/components/UpdateNeededNote"
import { WaitHint } from "@/components/WaitHint"
import { fmtDate } from "@/lib/format"

export type ListEndKind =
  | { kind: "more"; from: string; onMore: () => void; buttonRef?: Ref<HTMLButtonElement> }
  | { kind: "loading" }
  | { kind: "end" }
  | { kind: "offline" }
  | { kind: "fail"; onRetry: () => void }
  | { kind: "update" }

export function ListEndState(p: ListEndKind) {
  if (p.kind === "more") {
    return (
      <div className="grid gap-2 pt-4">
        <Button ref={p.buttonRef} variant="outline" className="w-full" onClick={p.onMore}>看更早的紀錄</Button>
        <p className="text-center text-muted-foreground">目前看到 {fmtDate(p.from)}</p>
      </div>
    )
  }
  if (p.kind === "loading") {
    return (
      <div className="grid gap-2 pt-4" aria-busy="true">
        <Skeleton className="h-16 rounded-lg" aria-hidden />
        <Skeleton className="h-16 rounded-lg" aria-hidden />
        <Skeleton className="h-16 rounded-lg" aria-hidden />
        <WaitHint busy hint5="更早的紀錄要從 Google 試算表讀，第一次比較慢，最多約半分鐘。" hint20="還在讀取，請稍等。" />
      </div>
    )
  }
  if (p.kind === "end") {
    return (
      <div className="flex items-center gap-3 pt-6">
        <Separator className="flex-1" />
        <p className="text-center text-muted-foreground">沒有更早的紀錄了</p>
        <Separator className="flex-1" />
      </div>
    )
  }
  if (p.kind === "offline") {
    return (
      <Alert variant="info" className="mt-4">
        <CloudOff aria-hidden />
        <AlertTitle>需要連線才能看更早的紀錄</AlertTitle>
        <AlertDescription>已經讀過的紀錄還是看得到；連上網路後再往下捲。</AlertDescription>
      </Alert>
    )
  }
  if (p.kind === "fail") {
    return (
      <Alert variant="warning" className="mt-4">
        <TriangleAlert aria-hidden />
        <AlertTitle>讀不到更早的紀錄</AlertTitle>
        <AlertDescription>
          <p>可能是網路不穩，或 Google 暫時沒回應。</p>
          <Button variant="outline" size="sm" className="mt-1" onClick={p.onRetry}><RefreshCw aria-hidden />再試一次</Button>
        </AlertDescription>
      </Alert>
    )
  }
  return <div className="pt-4"><UpdateNeededNote action="看 7 天以前的紀錄" /></div>
}
