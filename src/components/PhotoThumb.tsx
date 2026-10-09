import type { Ref } from "react"
import { CloudOff, ImageOff } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/StatusBadge"
import { cn } from "@/lib/utils"

export type PhotoThumbStatus = "loading" | "ready" | "error" | "offline" | "forbidden" | "local"

export function PhotoThumb({
  status, src, alt, label, onClick, disabled, buttonRef, onImgError,
}: {
  status: PhotoThumbStatus
  src?: string
  alt: string
  label: string
  onClick?: () => void
  disabled?: boolean
  buttonRef?: Ref<HTMLButtonElement>
  onImgError?: () => void
}) {
  const pressable = status === "ready" || status === "error" || status === "local"
  return (
    <button type="button" ref={buttonRef} disabled={disabled || !pressable} onClick={onClick}
      className="aspect-square overflow-hidden rounded-lg border"
      aria-label={label}>
      {status === "loading" && <Skeleton className="aspect-square size-full" aria-hidden />}
      {(status === "ready" || status === "local") && src && (
        <span className="relative block size-full">
          <img src={src} alt={alt} className="size-full object-cover" onError={onImgError} />
          {status === "local" && (
            <span className="absolute bottom-1 left-1"><StatusBadge tone="info" label="待上傳" /></span>
          )}
        </span>
      )}
      {status === "error" && (
        <span role="img" aria-label={label} className="grid size-full place-items-center bg-muted text-muted-foreground">
          <span className="grid justify-items-center gap-1">
            <ImageOff className="size-6" aria-hidden />
            再試一次
          </span>
        </span>
      )}
      {status === "offline" && (
        <span role="img" aria-label={label} className="grid size-full place-items-center bg-info-soft text-info-soft-foreground">
          <span className="grid justify-items-center gap-1">
            <CloudOff className="size-6" aria-hidden />
            需要連線
          </span>
        </span>
      )}
      {status === "forbidden" && (
        <span role="img" aria-label={label} className="grid size-full place-items-center bg-muted text-muted-foreground">
          <span className="grid justify-items-center gap-1">
            <ImageOff className="size-6" aria-hidden />
            看不到
          </span>
        </span>
      )}
    </button>
  )
}

export function photoCaption(statuses: PhotoThumbStatus[]): string | "wait" | null {
  if (statuses.includes("offline")) return "照片要連上網路才能看，連上後會自動載入。"
  if (statuses.includes("error")) return "照片沒載入，點一下再試一次。"
  if (statuses.includes("forbidden")) return "這張照片可能已經移走或刪除。"
  if (statuses.includes("loading")) return "wait"
  if (statuses.includes("local")) return "有照片還在手機裡，上線後會自動上傳。"
  return null
}

export function photoAria(title: string, i: number, n: number, status: PhotoThumbStatus): string {
  const base = `${title}的照片，第 ${i + 1} 張，共 ${n} 張`
  if (status === "error") return `${base}，沒載入`
  if (status === "offline") return `${base}，需要連線`
  if (status === "forbidden") return `${base}，看不到`
  return base
}

export const PHOTO_WAIT = {
  hint5: "照片要從 Google 取回，第一次比較慢，最多約半分鐘。",
  hint20: "還在讀取照片，請稍等，不用離開這頁。",
}

export function PhotoPlaceholder({ status, className }: { status: PhotoThumbStatus; className?: string }) {
  return <div className={cn("aspect-square", className)} data-status={status} />
}
