import { Badge } from "@/components/ui/badge"

/** 「示意資料」徽章：所有含假資料的畫面都要看得到 */
export function SampleBadge({ label = "示意資料" }: { label?: string }) {
  return (
    <Badge variant="watch" className="border border-dashed border-current" aria-label={`${label}：畫面上的資料都是假的`}>
      {label}
    </Badge>
  )
}
