import { Badge } from "@/components/ui/badge"
import { DEMO } from "@/data/settings"

/**
 * App 版（覆寫原型的 SampleBadge，sync-mockup.sh 會保留這個檔案）。
 * - 有傳 label（例如設定頁的「示意預設」）：照常顯示，因為那是在說明資料本身。
 * - 沒傳 label（畫面標題旁的「示意資料」）：只有「本機試用」模式才顯示，連上 Sheet 後就不顯示。
 */
export function SampleBadge({ label }: { label?: string }) {
  if (!label && !DEMO) return null
  const text = label ?? "本機試用"
  const aria = label ? `${label}：尚未確認的預設值` : "本機試用：資料只存在這支手機"
  return (
    <Badge variant="watch" className="border border-dashed border-current" aria-label={aria}>
      {text}
    </Badge>
  )
}
