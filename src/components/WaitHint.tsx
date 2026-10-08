import { useEffect, useState } from "react"

/** 長等待要說明（DESIGN.md）：busy 期間每秒累計，結束歸零 */
export function useWaitSeconds(busy: boolean) {
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!busy) { setSec(0); return }
    const t0 = Date.now()
    const id = setInterval(() => setSec(Math.floor((Date.now() - t0) / 1000)), 1000)
    return () => clearInterval(id)
  }, [busy])
  return sec
}

export function WaitHint({ busy, hint5, hint20 }: { busy: boolean; hint5: string; hint20: string }) {
  const sec = useWaitSeconds(busy)
  const text = !busy || sec < 5 ? "" : sec >= 20 ? hint20 : hint5
  return <p aria-live="polite" className="text-center text-muted-foreground empty:hidden">{text}</p>
}
