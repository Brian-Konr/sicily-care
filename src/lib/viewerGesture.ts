export function viewerRelease(args: {
  scale: number
  dx: number
  dy: number
  vx: number
  vy: number
  width: number
}): "next" | "prev" | "close" | "snap" | "none" {
  const { scale, dx, dy, vx, vy, width } = args
  if (scale !== 1) return "none"
  if (Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > width * 0.25 || Math.abs(vx) > 0.5)) {
    return dx < 0 ? "next" : "prev"
  }
  if (dy > Math.abs(dx) && (dy > 120 || vy > 0.5)) return "close"
  if (dx !== 0 || dy !== 0) return "snap"
  return "none"
}

export function clampPan(
  tx: number, ty: number, scale: number, viewW: number, viewH: number, imgW: number, imgH: number,
): { tx: number; ty: number } {
  const s = Math.min(4, Math.max(1, scale))
  if (s === 1) return { tx: 0, ty: 0 }
  const overflowX = Math.max(0, (imgW * s - viewW) / 2)
  const overflowY = Math.max(0, (imgH * s - viewH) / 2)
  return {
    tx: Math.min(overflowX, Math.max(-overflowX, tx)),
    ty: Math.min(overflowY, Math.max(-overflowY, ty)),
  }
}

export function clampScale(scale: number): number {
  return Math.min(4, Math.max(1, scale))
}
