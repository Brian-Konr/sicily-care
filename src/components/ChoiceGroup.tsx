import type { ReactNode } from "react"
import { Check } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

interface Common<T extends string> {
  label: string
  options: readonly T[]
  /** 版面：wrap＝晶片自動換行；grid＝等寬；list＝一行一個；scroll＝單行水平捲動 */
  layout?: "wrap" | "grid" | "list" | "scroll"
  cols?: 2 | 3 | 4
  className?: string
  hideLabel?: boolean
}

const itemCls = "h-auto min-h-11 rounded-full px-4 py-2 whitespace-normal data-[state=on]:font-bold"
const scrollItemCls = "h-11 shrink-0 rounded-full px-4 whitespace-nowrap data-[state=on]:font-bold"

function Wrap({ label, hideLabel, children }: { label: string; hideLabel?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <span aria-hidden className={cn("font-bold", hideLabel && "sr-only")}>{label}</span>
      {children}
    </div>
  )
}

function groupCls(layout: Common<string>["layout"], cols: number) {
  return cn(
    "w-full justify-start gap-2",
    layout === "wrap" && "flex flex-wrap",
    layout === "grid" && `grid ${cols === 2 ? "grid-cols-2" : cols === 4 ? "grid-cols-4" : "grid-cols-3"}`,
    layout === "list" && "grid grid-cols-1",
    layout === "scroll" && "flex flex-nowrap overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  )
}

/** 單選晶片（shadcn ToggleGroup type="single"，選中＝accent 底＋粗外框＋粗體） */
export function ChoiceSingle<T extends string>({ label, options, value, onChange, layout = "wrap", cols = 3, className, hideLabel }:
  Common<T> & { value: T | null; onChange: (v: T | null) => void }) {
  return (
    <Wrap label={label} hideLabel={hideLabel}>
      <ToggleGroup type="single" variant="outline" aria-label={label} value={value ?? ""} spacing={2}
        onValueChange={(v) => onChange((v || null) as T | null)} className={cn(groupCls(layout, cols), className)}>
        {options.map((o) => (
          <ToggleGroupItem key={o} value={o} className={cn(layout === "scroll" ? scrollItemCls : itemCls, layout === "list" && "justify-start rounded-lg")}>
            {layout === "scroll" && value === o && <Check className="size-4" aria-hidden />}
            {o}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Wrap>
  )
}

/** 複選晶片（ToggleGroup type="multiple"） */
export function ChoiceMulti<T extends string>({ label, options, value, onChange, layout = "wrap", cols = 3, className, hideLabel }:
  Common<T> & { value: T[]; onChange: (v: T[]) => void }) {
  return (
    <Wrap label={label} hideLabel={hideLabel}>
      <ToggleGroup type="multiple" variant="outline" aria-label={label} value={value} spacing={2}
        onValueChange={(v) => onChange(v as T[])} className={cn(groupCls(layout, cols), className)}>
        {options.map((o) => (
          <ToggleGroupItem key={o} value={o} className={cn(layout === "scroll" ? scrollItemCls : itemCls, layout === "list" && "justify-start rounded-lg")}>
            {layout === "scroll" && value.includes(o) && <Check className="size-4" aria-hidden />}
            {o}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Wrap>
  )
}
