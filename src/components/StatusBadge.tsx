import { CheckCircle2, Clock, Eye, OctagonAlert, TriangleAlert, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { Tone } from "@/lib/describe"

const ICON: Record<Tone, LucideIcon | null> = { ok: CheckCircle2, watch: TriangleAlert, urgent: OctagonAlert, info: Eye, pending: Clock, muted: null }

/** 狀態徽章：正常（ok）／注意（watch）／緊急（urgent），另有 info、pending、muted。一律圖示＋文字。 */
export function StatusBadge({ tone, label, icon }: { tone: Tone; label: string; icon?: LucideIcon }) {
  const Icon = icon ?? ICON[tone]
  return (
    <Badge variant={tone}>
      {Icon && <Icon aria-hidden />}
      {label}
    </Badge>
  )
}
