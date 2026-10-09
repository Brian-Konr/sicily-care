import { expect, test } from "vitest"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { Api } from "@/api"
import { TimelineItem } from "@/components/TimelineItem"
import type { PhotoCache } from "@/data/photoCache"
import { EntryDetailScreen } from "@/screens/EntryDetail"
import type { AnyEntry, LitterEntry } from "@/types"

if (typeof globalThis.localStorage === "undefined") {
  const m = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, String(v)) },
    removeItem: (k) => { m.delete(k) },
    clear: () => m.clear(),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  } as Storage
}

const feed: AnyEntry = {
  type: "feed", id: "f1", ts: "2026-10-09T08:12:00+08:00", who: "Brian", deleted: false,
  food_id: "x", food_name: "副食罐", qty: 1, unit: "罐", grams_est: null, eaten_pct: 100, reaction: null, note: "",
}

const noop = () => {}

test("open button is the top half; edit/undo are siblings", () => {
  const html = renderToStaticMarkup(createElement(TimelineItem, { entry: feed, actions: true, onOpen: noop }))
  const first = html.slice(0, html.indexOf("</button>"))
  expect(first).toContain("副食罐 1 罐")
  expect(first).toContain("aria-describedby")
  expect(first).toContain("size-5")
  expect(first).not.toContain("編輯")
  expect(first).not.toContain("撤銷")
  expect(first).not.toContain("打開詳細")
  expect(html).toContain("編輯")
  expect(html).toContain("撤銷")
  expect(html).toContain("打開詳細")
  const btn = first.match(/<button\b[^>]*>/)?.[0] ?? ""
  expect(btn).toContain("active:bg-accent")
  expect(btn).not.toContain("scale")
})

test("deleted row with actions shows 復原 after the open button", () => {
  const html = renderToStaticMarkup(createElement(TimelineItem, {
    entry: { ...feed, deleted: true }, actions: true, onOpen: noop,
  }))
  expect(html).toContain("復原")
  expect(html).not.toContain("編輯")
  expect(html.indexOf("復原")).toBeGreaterThan(html.indexOf("</button>"))
})

test("actions={false} is a single open button", () => {
  const html = renderToStaticMarkup(createElement(TimelineItem, { entry: feed, actions: false, onOpen: noop }))
  expect(html.split("<button").length - 1).toBe(1)
})

const now = new Date("2026-10-09T12:00:00+08:00")
const api = {} as Api
const cache = {} as PhotoCache
const litter = (photo_ids: string[]): AnyEntry => ({
  type: "litter", id: "l1", ts: "2026-10-09T08:00:00+08:00", who: "Brian", deleted: false,
  all_normal: true, urine_count: 2, urine_size: null, urine_flags: [],
  stool_count: 1, stool_cat: null, purina_range: null, stool_amount: null, stool_flags: [],
  photo_ids, note: "",
} satisfies LitterEntry & { type: "litter" })

function detail(props: { entry?: AnyEntry; pending?: boolean; version?: number }) {
  return renderToStaticMarkup(createElement(EntryDetailScreen, {
    now, network: "online", queuedCount: 0, entry: props.entry, pending: props.pending ?? false,
    version: props.version ?? 0, api, cache, title: "清砂", backLabel: "紀錄",
    onBack: noop, onBackToTimeline: noop, onEdit: noop, onUndo: noop, onRestore: noop,
  }))
}

test("EntryDetail version gate and empty/not-found/pending copy", () => {
  const v0 = detail({ entry: litter(["file-1"]), version: 0 })
  expect(v0).toContain("需要更新 Apps Script 才能在 App 裡看照片。")
  const empty = detail({ entry: litter([]), version: 0 })
  expect(empty).not.toContain("需要更新 Apps Script 才能在 App 裡看照片。")
  const missing = detail({ entry: undefined, pending: false })
  expect(missing).toContain("找不到這筆紀錄，可能還沒載入或已經移除。")
  expect(missing).toContain("回紀錄頁")
  const pending = detail({ pending: true })
  expect(pending).toContain("正在讀取最新紀錄⋯")
  expect(pending).not.toContain("找不到這筆紀錄")
})
