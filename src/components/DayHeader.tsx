import { fmtDayHeader } from "@/lib/format"

export function DayHeader({ iso, now }: { iso: string; now: Date }) {
  return (
    <h2 className="sticky top-0 z-[5] -mx-4 bg-background px-4 py-2 font-bold text-muted-foreground">
      {fmtDayHeader(iso, now)}
    </h2>
  )
}
