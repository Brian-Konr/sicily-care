export function swipeShouldTrack(dx: number, dy: number, open = false): boolean {
  if (Math.abs(dx) <= Math.abs(dy)) return false
  if (open) return Math.abs(dx) > 10
  return dx <= -10
}

export function swipeSettle(dx: number, rowWidth: number): "confirm" | "open" | "close" {
  const left = Math.max(0, -dx)
  if (rowWidth > 0 && left > rowWidth * 0.6) return "confirm"
  if (left >= 44) return "open"
  return "close"
}
