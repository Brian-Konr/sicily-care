import { expect, test } from "vitest"
import type { AnyEntry, CareEntry, FeedEntry, LitterEntry, MedEntry, WeightEntry } from "@/types"
import { describe, detailRows } from "@/lib/describe"
import { fmtDate, fmtNextDue } from "@/lib/format"

const NOW = new Date("2026-10-09T12:00:00+08:00")
const base = { id: "e1", ts: "2026-10-09T12:00:00+08:00", who: "Brian", deleted: false as const }

function feed(p: Partial<FeedEntry> = {}): AnyEntry {
  return {
    type: "feed", ...base, food_id: "f1", food_name: "副食罐", qty: 1, unit: "罐",
    grams_est: 20, eaten_pct: 100, reaction: "喜歡", note: "hi", ...p,
  }
}
function litter(p: Partial<LitterEntry> = {}): AnyEntry {
  return {
    type: "litter", ...base, all_normal: true, urine_count: 2, urine_size: null, urine_flags: [],
    stool_count: 1, stool_cat: null, purina_range: null, stool_amount: null, stool_flags: [],
    photo_ids: [], note: "", ...p,
  }
}
function weight(p: Partial<WeightEntry> = {}): AnyEntry {
  return { type: "weight", ...base, kg: 4.12, method: "寵物秤", note: "", ...p }
}
function med(p: Partial<MedEntry> = {}): AnyEntry {
  return { type: "med", ...base, kind: "三合一疫苗", product: "", dose: "", next_due: null, note: "", ...p }
}
function care(p: Partial<CareEntry> = {}): AnyEntry {
  return { type: "care", ...base, kind: "litter_wash", note: "", ...p }
}

function labels(e: AnyEntry) {
  return detailRows(e, NOW).map((r) => r.label)
}
function row(e: AnyEntry, label: string) {
  return detailRows(e, NOW).find((r) => r.label === label)
}

test("Feed all fields", () => {
  const e = feed()
  expect(labels(e)).toEqual(["品項", "份量", "吃了多少", "反應", "時間", "記錄人", "備註"])
  expect(row(e, "份量")?.text).toBe("1 罐・約 20 g")
  expect(row(e, "吃了多少")?.text).toBe("全吃完")
})

test("Feed omits empty reaction/eaten/grams; empty note is muted", () => {
  const e = feed({ reaction: null, grams_est: null, eaten_pct: null, note: "", unit: "罐" })
  expect(labels(e)).toEqual(["品項", "份量", "時間", "記錄人", "備註"])
  expect(row(e, "份量")?.text).toBe("1 罐")
  expect(row(e, "備註")).toMatchObject({ text: "沒有備註", muted: true })
  expect(describe(e).badge?.label).toBe("吃了多少？待填")
})

test("Litter all_normal, counts only", () => {
  const e = litter()
  expect(labels(e)).toEqual(["狀況", "尿塊", "便便", "時間", "記錄人", "備註"])
  expect(row(e, "狀況")?.text).toBe("一切正常")
  expect(row(e, "尿塊")?.text).toBe("2 塊")
  expect(row(e, "便便")?.text).toBe("1 條")
})

test("Litter abnormal with flags and purina", () => {
  const e = litter({
    all_normal: false, urine_size: "正常",
    urine_flags: ["粉紅或帶血", "蹲很久/用力"],
    purina_range: "2–3", stool_amount: "少", stool_flags: ["帶血"],
  })
  expect(labels(e)).not.toContain("狀況")
  expect(row(e, "尿塊")?.text).toBe("2 塊・正常")
  expect(row(e, "尿異常")?.text).toBe("粉紅或帶血、蹲很久/用力")
  expect(row(e, "便便")?.text).toBe("1 條・2–3")
  expect(row(e, "便量")?.text).toBe("少")
  expect(row(e, "便異常")?.text).toBe("帶血")
})

test("Litter 今天沒便 uses stool_cat when purina is null", () => {
  const e = litter({ stool_cat: "今天沒便", purina_range: null })
  expect(row(e, "便便")?.text).toMatch(/・今天沒便$/)
  expect(row(e, "便便")?.text).not.toContain("null")
})

test("Weight numeric kg and method", () => {
  const e = weight()
  expect(row(e, "體重")).toMatchObject({ text: "4.12 kg", numeric: true })
  expect(row(e, "方式")?.text).toBe("寵物秤")
})

test("Med blank product: no dangling colon, no 品名/劑量/下次", () => {
  const e = med()
  expect(labels(e)).toEqual(["類型", "時間", "記錄人", "備註"])
  expect(describe(e).title).toBe("三合一疫苗")
  expect(describe(e).title).not.toContain("：")
})

test("Med with product, dose, next_due", () => {
  const e = med({ product: "博滅", dose: "1 針", next_due: "2026-11-09" })
  expect(row(e, "品名")?.text).toBe("博滅")
  expect(row(e, "下次")).toMatchObject({ text: "2026/11/09（一）", daysLeft: 31 })
  expect(describe(e).title).toBe("三合一疫苗：博滅")
})

test("Care litter_wash label", () => {
  expect(row(care(), "項目")?.text).toBe("貓砂盆整盆清洗")
})

test("note with newlines is pre and unchanged", () => {
  const e = feed({ note: "第一行\n第二行" })
  expect(row(e, "備註")).toMatchObject({ text: "第一行\n第二行", pre: true })
})

test("ts in 2025 shows year and a space before the clock", () => {
  const e = feed({ ts: "2025-12-30T18:05:00+08:00" })
  expect(row(e, "時間")?.text).toBe("2025/12/30 18:05")
  expect(row(e, "時間")?.text).toContain("2025/")
  expect(row(e, "時間")?.text).toMatch(/ 18:05$/)
})

test("same year older than 7 days has no year and no space after ）", () => {
  const e = feed({ ts: "2026-10-01T08:00:00+08:00" })
  const text = row(e, "時間")?.text ?? ""
  expect(text.startsWith("2026")).toBe(false)
  expect(text).not.toMatch(/^今天|^昨天/)
  expect(text).toBe(`${fmtDate("2026-10-01T08:00:00+08:00")}08:00`)
})

test("fmtNextDue", () => {
  expect(fmtNextDue("2026-11-09")).toBe("2026/11/09（一）")
  expect(fmtNextDue("")).toBe(null)
})
