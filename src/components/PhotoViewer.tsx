import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { Button } from "@/components/ui/button"
import { Dialog, DialogPortal, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { WaitHint } from "@/components/WaitHint"
import { PHOTO_WAIT, type PhotoThumbStatus } from "@/components/PhotoThumb"
import { clampPan, clampScale, viewerRelease } from "@/lib/viewerGesture"
import { cn } from "@/lib/utils"

export interface ViewerPhoto {
  status: PhotoThumbStatus
  src?: string
  alt: string
}

export function PhotoViewer({
  open, title, photos, index, onIndex, onClose, onRetry, onImgError, openerRef,
}: {
  open: boolean
  title: string
  photos: ViewerPhoto[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  onRetry: (i: number) => void
  onImgError?: (index: number) => void
  openerRef?: React.RefObject<HTMLElement | null>
}) {
  const cur = photos[index]
  const many = photos.length > 1
  const [scale, setScale] = useState(1)
  const [pan, setPan] = useState({ tx: 0, ty: 0 })
  const [drag, setDrag] = useState({ dx: 0, dy: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch0 = useRef<number | null>(null)
  const lastTap = useRef(0)
  const start = useRef({ x: 0, y: 0, t: 0, panx: 0, pany: 0 })
  const moved = useRef(false)
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches
  const region = useRef<HTMLDivElement>(null)

  useEffect(() => { setScale(1); setPan({ tx: 0, ty: 0 }); setDrag({ dx: 0, dy: 0 }) }, [index, open])

  useEffect(() => {
    if (!open) return
    return () => { openerRef?.current?.focus() }
  }, [open, openerRef])

  const snap = reduce ? "" : "transition-transform duration-200"

  const applyPan = (tx: number, ty: number, s: number) => {
    const el = region.current
    const img = el?.querySelector("img")
    const viewW = el?.clientWidth ?? 1
    const viewH = el?.clientHeight ?? 1
    const imgW = img?.clientWidth ?? viewW
    const imgH = img?.clientHeight ?? viewH
    setPan(clampPan(tx, ty, s, viewW, viewH, imgW, imgH))
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    start.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, panx: pan.tx, pany: pan.ty }
    moved.current = false
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch0.current = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2 && pinch0.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const next = clampScale(scale * (dist / pinch0.current))
      pinch0.current = dist
      setScale(next)
      applyPan(pan.tx, pan.ty, next)
      return
    }
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (Math.hypot(dx, dy) > 4) moved.current = true
    if (scale > 1) {
      applyPan(start.current.panx + dx, start.current.pany + dy, scale)
      return
    }
    setDrag({ dx, dy })
  }
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    pinch0.current = null
    if (pointers.current.size > 0) return
    const dx = drag.dx
    const dy = drag.dy
    const dt = Math.max(1, e.timeStamp - start.current.t)
    const vx = dx / dt
    const vy = dy / dt
    const width = region.current?.clientWidth ?? 1
    if (scale === 1) {
      const act = viewerRelease({ scale, dx, dy, vx, vy, width })
      if (act === "next" && index < photos.length - 1) onIndex(index + 1)
      else if (act === "prev" && index > 0) onIndex(index - 1)
      else if (act === "close") onClose()
      setDrag({ dx: 0, dy: 0 })
    }
    if (!moved.current) {
      const now = e.timeStamp
      if (now - lastTap.current < 300) {
        const next = scale === 1 ? 2.5 : 1
        setScale(next)
        applyPan(0, 0, next)
        lastTap.current = 0
      } else lastTap.current = now
    }
  }

  const imgStyle: React.CSSProperties = {
    touchAction: "none",
    userSelect: "none",
    transformOrigin: "center center",
    transform: `translate(${pan.tx + (scale === 1 ? drag.dx : 0)}px, ${pan.ty + (scale === 1 ? drag.dy : 0)}px) scale(${scale})`,
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex h-dvh w-full max-w-none translate-none flex-col gap-0 rounded-none border-0 bg-background p-0 sm:max-w-none dark",
          )}
        >
          <DialogTitle className="sr-only">{title}的照片</DialogTitle>
          <div className="flex h-14 items-center px-2 pt-[var(--safe-top)]">
            <Button variant="secondary" size="sm" onClick={onClose}><X aria-hidden />關閉</Button>
            {many && <span className="ml-auto px-2 font-num text-foreground" aria-live="polite">{index + 1}／{photos.length}</span>}
          </div>
          <div ref={region} className="relative min-h-0 flex-1 touch-none select-none"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            {(cur?.status === "ready" || cur?.status === "local") && cur.src ? (
              <img src={cur.src} alt={cur.alt} className={cn("size-full object-contain", !reduce && snap)} style={imgStyle} draggable={false} onError={() => onImgError?.(index)} />
            ) : (cur?.status === "ready" || cur?.status === "local") ? null : (
              <div className="grid h-full place-items-center px-6 text-center text-muted-foreground">
                {cur?.status === "loading" && (
                  <div className="grid w-full max-w-xs gap-3">
                    <Skeleton className="mx-auto aspect-square w-40 rounded-lg" aria-hidden />
                    <WaitHint busy hint5={PHOTO_WAIT.hint5} hint20={PHOTO_WAIT.hint20} />
                  </div>
                )}
                {cur?.status === "error" && (
                  <div className="grid justify-items-center gap-3">
                    <p>這張照片沒載入。</p>
                    <Button variant="outline" onClick={() => onRetry(index)}>再試一次</Button>
                  </div>
                )}
                {cur?.status === "offline" && <p>照片要連上網路才能看。</p>}
                {cur?.status === "forbidden" && <p>看不到這張照片，可能已經移走或刪除。</p>}
              </div>
            )}
          </div>
          <div className="flex h-14 items-center justify-between px-2 pb-[var(--safe-bottom)]">
            {many ? (
              <Button variant="secondary" size="icon" aria-label="上一張" disabled={index === 0} onClick={() => onIndex(index - 1)}>
                <ChevronLeft aria-hidden />
              </Button>
            ) : <span />}
            <p className="text-muted-foreground">點兩下放大・往下滑關閉</p>
            {many ? (
              <Button variant="secondary" size="icon" aria-label="下一張" disabled={index === photos.length - 1} onClick={() => onIndex(index + 1)}>
                <ChevronRight aria-hidden />
              </Button>
            ) : <span />}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
