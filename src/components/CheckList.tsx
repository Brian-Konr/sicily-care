import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface CheckListProps<T extends string> {
  label: string
  options: readonly T[]
  value: T[]
  onChange: (v: T[]) => void
  /** 需要特別標示的選項（例如會觸發緊急提示的「蹲很久/用力」） */
  emphasize?: T[]
}

/** 複選清單：每列整列可點（≥44px），用 shadcn Checkbox */
export function CheckList<T extends string>({ label, options, value, onChange, emphasize = [] }: CheckListProps<T>) {
  const toggle = (o: T, on: boolean) => onChange(on ? [...value, o] : value.filter((x) => x !== o))
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 font-bold">{label}<span className="font-normal text-muted-foreground">（可複選）</span></legend>
      {options.map((o) => {
        const id = `${label}-${o}`
        const on = value.includes(o)
        return (
          <label key={o} htmlFor={id} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2", on && "bg-accent text-accent-foreground")}>
            <Checkbox id={id} checked={on} onCheckedChange={(c) => toggle(o, c === true)} />
            <span className={cn(emphasize.includes(o) && "font-bold")}>{o}</span>
          </label>
        )
      })}
    </fieldset>
  )
}
