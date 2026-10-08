import { useRef, useState, type ReactNode } from "react"
import { Archive } from "lucide-react"
import { swipeSettle, swipeShouldTrack } from "@/lib/swipe"
import { cn } from "@/lib/utils"

const ACTION_W = 88

export function SwipeRow({
  open, onOpenChange, onConfirm, onRevealPress, disabled, children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  onRevealPress: () => void
  disabled?: boolean
  children: ReactNode
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const start = useRef({ x: 0, y: 0, open: false })
  const tracking = useRef(false)
  const gestureDx = useRef(0)
  const draggingRef = useRef(false)
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

  const origin = open ? -ACTION_W : 0
  const x = origin + dx

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    start.current = { x: e.clientX, y: e.clientY, open }
    tracking.current = false
    gestureDx.current = 0
    draggingRef.current = true
    setDx(0)
    setDragging(true)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    const mx = e.clientX - start.current.x
    const my = e.clientY - start.current.y
    if (!tracking.current) {
      if (!swipeShouldTrack(mx, my, start.current.open)) return
      tracking.current = true
      rowRef.current?.setPointerCapture(e.pointerId)
    }
    gestureDx.current = mx
    const width = rowRef.current?.offsetWidth ?? 0
    const next = origin + mx
    setDx(Math.min(0, Math.max(next, width ? -width : -ACTION_W * 2)) - origin)
  }
  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setDragging(false)
    if (!tracking.current) { setDx(0); return }
    const mx = gestureDx.current
    tracking.current = false
    // DESIGN §7.6: an already-open row closes when the finger moves right more than 10px
    if (start.current.open && mx > 10) {
      setDx(0)
      onOpenChange(false)
      return
    }
    const width = rowRef.current?.offsetWidth ?? 0
    const result = swipeSettle(origin + mx, width)
    setDx(0)
    if (result === "confirm") {
      onOpenChange(false)
      onConfirm()
    } else if (result === "open") onOpenChange(true)
    else onOpenChange(false)
  }

  return (
    <div className="relative overflow-hidden">
      <button type="button" tabIndex={open ? 0 : -1} aria-hidden={!open}
        className="absolute inset-y-0 right-0 flex w-[88px] flex-col items-center justify-center gap-1 bg-foreground font-bold text-background"
        onClick={onRevealPress}>
        <Archive className="size-5" aria-hidden />
        封存
      </button>
      <div
        ref={rowRef}
        className={cn("relative bg-card select-none", !dragging && !reduce && "transition-transform duration-200", reduce && !dragging && "transition-none")}
        style={{ transform: `translateX(${x}px)`, touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {children}
      </div>
    </div>
  )
}
