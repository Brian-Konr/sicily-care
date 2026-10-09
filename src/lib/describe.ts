/** 純函式：把一筆紀錄轉成列表文字（時間軸、首頁最近紀錄、詳細頁共用）。 */
import type { AnyEntry, EntryType } from "@/types"
import { careLabel } from "@/lib/care"
import { dateKey, dayDiff, fmtEntryWhen, fmtNextDue } from "@/lib/format"
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
    case "med": {
      const bits = [e.kind.trim(), e.product.trim()].filter(Boolean)
      return { emoji, title: bits.join("：") || TYPE_META.med.label, detail: e.next_due ? `下次 ${e.next_due.replaceAll("-", "/")}` : undefined }
    }
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

export interface DetailRow {
  label: string
  text: string
  numeric?: boolean
  muted?: boolean
  pre?: boolean
  daysLeft?: number
}

function commonRows(e: AnyEntry, now: Date): DetailRow[] {
  const rows: DetailRow[] = [{ label: "時間", text: fmtEntryWhen(e.ts, now) }]
  if (e.who.trim()) rows.push({ label: "記錄人", text: e.who })
  if (e.note.trim()) rows.push({ label: "備註", text: e.note, pre: true })
  else rows.push({ label: "備註", text: "沒有備註", muted: true })
  return rows
}

export function detailRows(e: AnyEntry, now: Date): DetailRow[] {
  const rows: DetailRow[] = []
  switch (e.type) {
    case "feed": {
      if (e.food_name.trim()) rows.push({ label: "品項", text: e.food_name })
      const qtyPart = e.unit.trim() ? `${e.qty} ${e.unit}`.trim() : ""
      const gramsPart = e.grams_est == null ? "" : `約 ${e.grams_est} g`
      const qtyText = [qtyPart, gramsPart].filter(Boolean).join("・")
      if (qtyText) rows.push({ label: "份量", text: qtyText })
      if (e.eaten_pct !== null) rows.push({ label: "吃了多少", text: eatenLabel(e.eaten_pct) })
      if (e.reaction) rows.push({ label: "反應", text: e.reaction })
      break
    }
    case "litter": {
      if (e.all_normal) rows.push({ label: "狀況", text: "一切正常" })
      rows.push({
        label: "尿塊",
        text: e.urine_size ? `${e.urine_count} 塊・${e.urine_size}` : `${e.urine_count} 塊`,
      })
      if (e.urine_flags.length) rows.push({ label: "尿異常", text: e.urine_flags.join("、") })
      let stool = `${e.stool_count} 條`
      if (e.purina_range) stool += `・${e.purina_range}`
      else if (e.stool_cat) stool += `・${e.stool_cat}`
      rows.push({ label: "便便", text: stool })
      if (e.stool_amount) rows.push({ label: "便量", text: e.stool_amount })
      if (e.stool_flags.length) rows.push({ label: "便異常", text: e.stool_flags.join("、") })
      break
    }
    case "weight": {
      rows.push({ label: "體重", text: `${e.kg.toFixed(2)} kg`, numeric: true })
      if (e.method.trim()) rows.push({ label: "方式", text: e.method })
      break
    }
    case "med": {
      if (e.kind.trim()) rows.push({ label: "類型", text: e.kind })
      if (e.product.trim()) rows.push({ label: "品名", text: e.product })
      if (e.dose.trim()) rows.push({ label: "劑量", text: e.dose })
      const next = e.next_due ? fmtNextDue(e.next_due) : null
      if (next && e.next_due) {
        rows.push({ label: "下次", text: next, daysLeft: dayDiff(dateKey(now), e.next_due) })
      }
      break
    }
    case "care": {
      if (e.kind === "litter_wash" || e.kind === "feeder_clean" || e.kind === "feeder_desiccant") {
        rows.push({ label: "項目", text: careLabel(e.kind) })
      }
      break
    }
    case "issue":
      break
  }
  return [...rows, ...commonRows(e, now)]
}
