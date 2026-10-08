import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DueStatus } from "@/components/DueStatus"

export function RecurringItemRow({
  name, daysLeft, lastLine, buttonLabel, ariaLabel, disabled, onPress,
}: {
  name: string
  daysLeft: number | null
  lastLine: ReactNode
  buttonLabel: string
  ariaLabel: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <li className="flex items-center gap-3 py-3 pr-2 pl-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{name}</p>
        <div className="mt-0.5"><DueStatus daysLeft={daysLeft} /></div>
        <p className="text-muted-foreground">{lastLine}</p>
      </div>
      <Button variant="outline" size="sm" disabled={disabled} onClick={onPress}
        aria-label={disabled ? `${name}已記錄` : ariaLabel}>
        {disabled ? "✓ 已記錄" : <><Check aria-hidden />{buttonLabel}</>}
      </Button>
    </li>
  )
}
