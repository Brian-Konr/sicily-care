// 前端與 Apps Script 後端之間的請求／回應格式。mock 與 gas 介面卡都實作同一個 Adapter。
import type { Food, LogRecord, LogTable, Snapshot } from './sheet'

export type Op =
  | { action: 'read'; days?: number }
  | { action: 'append'; table: LogTable; record: LogRecord }
  | { action: 'update'; table: LogTable; id: string; patch: Record<string, unknown> }
  | { action: 'softDelete'; table: LogTable; id: string }
  | { action: 'setConfig'; key: string; value: string | number | boolean }
  | { action: 'upsertFood'; record: Food & { food_id: string } }
  | { action: 'uploadPhoto'; data: string; mime: string; filename?: string }

export type Fail = { ok: false; error: string; message?: string }
export type Ok<T = object> = { ok: true } & T
export type Response = Fail | Ok<Record<string, unknown>> | Snapshot

export interface Adapter {
  kind: 'mock' | 'gas' | string
  /** 送一個請求。連不上時丟 NetworkError；伺服器錯誤回 { ok:false }。 */
  call(op: Op): Promise<Response>
}

export type WriteOp = Exclude<Op, { action: 'read' } | { action: 'uploadPhoto' }>
