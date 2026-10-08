/** 純函式：把一筆紀錄轉成列表文字（時間軸、首頁最近紀錄共用）。 */
import type { AnyEntry, EntryType } from "@/types"
import { careLabel } from "@/lib/care"
import { eatenLabel } from "@/lib/rules"

export const TYPE_META: Record<EntryType, { emoji: string; label: string }> = {
  feed: { emoji: "🥫", label: "副食／零食" },
  litter: { emoji: "🚽", label: "清砂" },
  weight: { emoji: "⚖️", label: "體重" },
  med: { emoji: "💊", label: "驅蟲／疫苗／用藥" },
  issue: { emoji: "📷", label: "異常回報" },
  care: { emoji: "🧽", label: "居家維護" },
}

export type Tone = "ok" | "watch" | "urgent" | "info" | "pending" | "muted"

export interface Described {
  emoji: string
  title: string
  detail?: string
  badge?: { tone: Tone; label: string }
}

export function describe(e: AnyEntry): Described {
  const emoji = TYPE_META[e.type].emoji
  switch (e.type) {
    case "feed":
      return {
        emoji, title: `${e.food_name} ${e.qty} ${e.unit}`,
        detail: e.reaction ? `反應：${e.reaction}` : undefined,
        badge: e.eaten_pct === null ? { tone: "pending", label: "吃了多少？待填" } : { tone: "muted", label: eatenLabel(e.eaten_pct) },
      }
    case "litter": {
      const abnormal = !e.all_normal
      const bits = [`尿塊 ${e.urine_count}`, `便 ${e.stool_count}`]
      if (e.stool_cat && e.stool_cat !== "正常成形") bits.push(e.stool_cat)
      if (e.urine_flags.length) bits.push(e.urine_flags.join("、"))
      return { emoji, title: bits.join("・"), badge: abnormal ? { tone: "watch", label: "注意" } : { tone: "ok", label: "正常" } }
    }
    case "weight":
      return { emoji, title: `${e.kg.toFixed(2)} kg`, detail: e.method }
    case "med":
      return { emoji, title: `${e.kind}：${e.product}`, detail: e.next_due ? `下次 ${e.next_due.replaceAll("-", "/")}` : undefined }
    case "issue":
      return {
        emoji, title: `${e.category}${e.sub ? `・${e.sub}` : ""}`,
        detail: e.note || undefined,
        badge: e.resolved ? { tone: "ok", label: "已解決" }
          : { tone: e.severity === "緊急" ? "urgent" : e.severity === "要注意" ? "watch" : "info", label: e.severity },
      }
    case "care":
      return { emoji, title: careLabel(e.kind), detail: e.note || undefined }
  }
}
