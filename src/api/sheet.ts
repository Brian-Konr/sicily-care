// Google Sheet 原始列的型別（依 logging-spec.md §2）：Apps Script 讀寫的就是這個形狀。
// 選項欄位直接存繁中文字（例如「喜歡」「蹲很久/用力」），在 Sheet 裡人看得懂，Chaewon 讀取也不用對照表。
// 畫面用的型別在 src/types.ts（Winter 原型），兩者之間由 src/data/codec.ts 轉換：
//   多選欄位＝逗號分隔字串、空白＝null、布林可能是 TRUE/FALSE 字串、日期可能被 Sheet 轉成完整時間。

export type Cell = string | number | boolean
export type SheetBool = boolean | 'TRUE' | 'FALSE'

export interface LogBase {
  id: string
  /** ISO 8601，固定 +08:00 */
  ts: string
  who: string
  deleted: SheetBool
  /** 只存在前端：還在待送佇列、尚未寫進 Sheet */
  __pending?: boolean
  [col: string]: Cell | undefined
}

export type RawRow = LogBase
export type RawFood = Record<string, Cell>
/** Config 分頁：key/value，數字與布林已由後端轉型 */
export type RawConfig = Record<string, Cell>

export interface LogTables {
  Feed: RawRow[]
  Litter: RawRow[]
  Weight: RawRow[]
  Med: RawRow[]
  Issue: RawRow[]
}
export type LogTable = keyof LogTables
export type LogRecord = RawRow
export type RecordOf<_T extends LogTable = LogTable> = RawRow
/** 新增時前端要填的欄位（id/ts/who/deleted 由資料層自動帶） */
export type NewRecord<_T extends LogTable = LogTable> = Record<string, Cell>
export type Food = RawFood

export interface SnapshotTables extends LogTables {
  Foods: RawFood[]
}

/** 讀取回來的一份資料快照（原始形狀） */
export interface Snapshot {
  ok: true
  days: number
  serverTime: string
  tables: SnapshotTables
  config: RawConfig
}
