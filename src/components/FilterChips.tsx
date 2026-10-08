import { ChoiceMulti } from "@/components/ChoiceGroup"
import { FILTER_CHIPS, nextFilters, type TimelineFilter } from "@/lib/history"

export function FilterChips({ filters, onChange }: { filters: TimelineFilter[]; onChange: (v: TimelineFilter[]) => void }) {
  const value = filters.length ? filters : (["全部"] as string[])
  return (
    <div className="-mx-4 px-4 scroll-px-4">
      <ChoiceMulti
        label="篩選類型"
        hideLabel
        options={FILTER_CHIPS}
        layout="scroll"
        value={value}
        onChange={(raw) => onChange(nextFilters(filters, raw))}
      />
    </div>
  )
}
