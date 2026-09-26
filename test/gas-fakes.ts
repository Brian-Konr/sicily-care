// 在 node:vm 裡載入 gas/*.gs，並提供最小的 Apps Script 假物件（只為本機測試）
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import vm from 'node:vm'

type Cell = unknown
// 用 vm 裡的 Date，這樣 Code.gs 的 instanceof Date 才成立（真的 Apps Script 是同一個 realm）
let VmDate: DateConstructor = Date
class FakeSheet {
  data: Cell[][] = []
  frozen = 0
  constructor(public name: string) {}
  getLastRow() { return this.data.length }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0) }
  getDataRange() { return { getValues: () => this.data.map((r) => { const w = this.getLastColumn(); return Array.from({ length: w }, (_, i) => r[i] ?? '') }) } }
  getRange(row: number, col: number, nr = 1, nc = 1) {
    const sh = this
    return {
      getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => sh.data[row - 1 + i]?.[col - 1 + j] ?? '')),
      setValues: (vals: Cell[][]) => vals.forEach((r, i) => r.forEach((v, j) => sh.set(row + i, col + j, v))),
      setValue: (v: Cell) => sh.set(row, col, v),
    }
  }
  set(row: number, col: number, v: Cell) {
    while (this.data.length < row) this.data.push([])
    const r = this.data[row - 1]
    while (r.length < col) r.push('')
    r[col - 1] = sheetCoerce(v)
  }
  appendRow(row: Cell[]) { this.data.push(row.map(sheetCoerce)) }
  setFrozenRows(n: number) { this.frozen = n }
}
// 模擬 Sheets 自動轉型：'TRUE'/'FALSE' 變布林、數字字串變數字、ISO 時間變 Date
function sheetCoerce(v: Cell): Cell {
  if (v === 'TRUE') return true
  if (v === 'FALSE') return false
  if (typeof v === 'string' && v !== '' && !isNaN(Number(v))) return Number(v)
  if (typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(v)) return new VmDate(v)
  return v
}

export function loadGas(opts: { lockBusy?: boolean } = {}) {
  const sheets = new Map<string, FakeSheet>()
  sheets.set('工作表1', new FakeSheet('工作表1'))
  const props = new Map<string, string>()
  const files: { id: string; name: string; mime: string; bytes: number[]; folder: string }[] = []
  const folders: string[] = []
  const logs: string[] = []
  const shares: string[] = []
  let uuid = 0
  const ss = {
    getSheetByName: (n: string) => sheets.get(n) ?? null,
    insertSheet: (n: string) => { const s = new FakeSheet(n); sheets.set(n, s); return s },
    getSheets: () => [...sheets.values()],
    deleteSheet: (s: FakeSheet) => sheets.delete(s.name),
    addEditor: (e: string) => shares.push('sheet-editor:' + e),
  }
  const ctx: Record<string, unknown> = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, flush: () => {} },
    LockService: { getScriptLock: () => ({ tryLock: () => !opts.lockBusy, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k: string) => props.get(k) ?? null, setProperty: (k: string, v: string) => props.set(k, v) }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (s: string) => ({ body: s, setMimeType() { return this } }) },
    DriveApp: {
      createFolder: (name: string) => { folders.push(name); return { getId: () => 'folder-' + folders.length } },
      getFolderById: (id: string) => ({
        addViewer: (e: string) => shares.push(id + '-viewer:' + e),
        createFile: (blob: { bytes: number[]; mime: string; name: string }) => {
          const f = { id: 'file-' + (files.length + 1), folder: id, ...blob }
          files.push(f)
          return { getId: () => f.id, getUrl: () => 'https://drive.google.com/file/d/' + f.id + '/view' }
        },
      }),
    },
    Utilities: {
      base64Decode: (s: string) => [...Buffer.from(s, 'base64')],
      newBlob: (bytes: number[], mime: string, name: string) => ({ bytes, mime, name }),
      getUuid: () => '00000000-0000-4000-8000-' + String(++uuid).padStart(12, '0'),
      formatDate: (d: Date) => {
        const t = new Date(d.getTime() + 8 * 3600e3).toISOString().slice(0, 19)
        return t + '+08:00'
      },
    },
    Logger: { log: (s: string) => logs.push(s) },
  }
  vm.createContext(ctx)
  VmDate = vm.runInContext('Date', ctx)
  for (const f of ['Schema.gs', 'Code.gs', 'Setup.gs']) {
    vm.runInContext(readFileSync(resolve(import.meta.dirname, '../gas', f), 'utf8'), ctx, { filename: f })
  }
  const g = ctx as any
  const post = (body: unknown) => JSON.parse(g.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }).body)
  const get = (parameter: Record<string, string>) => JSON.parse(g.doGet({ parameter }).body)
  return { g, sheets, props, files, folders, logs, shares, post, get }
}
