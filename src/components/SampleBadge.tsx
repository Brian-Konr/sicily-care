import { Badge } from "@/components/ui/badge"

/**
 * App 版的 SampleBadge（原型 docs/design/mockup/ 裡有另一版，App 以這份為準）。
 * - 有傳 label（例如設定頁的「示意預設」）：照常顯示，因為那是在說明資料本身。
 * - 沒傳 label（畫面標題旁的「示意資料」）：不顯示。本機試用改由 App 頂部固定橫條提示，連上 Sheet 後也沒有示意資料。
 */
export function SampleBadge({ label }: { label?: string }) {
  if (!label) return null
  const text = label
  const aria = `${label}：尚未確認的預設值`
  return (
    <Badge variant="watch" className="border border-dashed border-current" aria-label={aria}>
      {text}
    </Badge>
  )
}
