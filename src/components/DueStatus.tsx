import { StatusBadge } from "@/components/StatusBadge"
import { OverdueDot } from "@/components/SummaryCard"
import { dueKind, dueText } from "@/lib/care"

export function DueStatus({ daysLeft }: { daysLeft: number | null }) {
  const kind = dueKind(daysLeft)
  const text = dueText(daysLeft)
  if (kind === "overdue") return <OverdueDot>{text}</OverdueDot>
  if (kind === "today" || kind === "soon") return <StatusBadge tone="watch" label={text} />
  return <span className="text-muted-foreground">{text}</span>
}
