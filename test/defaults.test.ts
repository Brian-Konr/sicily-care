import { test, expect } from 'vitest'
import { loadGas } from './gas-fakes'
import { DEFAULT_CONFIG, DEFAULT_FOODS, INITIAL_WEIGHT } from '@/data/defaults'

// 後端（gas/Schema.gs）和前端（src/data/defaults.ts）各有一份初始資料，兩邊要一樣
test('Apps Script 與前端的預設 Config、Foods、第一筆體重一致', () => {
  const { g } = loadGas()
  const gasCfg = Object.fromEntries((g.DEFAULT_CONFIG as [string, string][]).map(([k, v]) => [k, v]))
  const appCfg = Object.fromEntries(Object.entries(DEFAULT_CONFIG).map(([k, v]) => [k, v === true ? 'TRUE' : v === false ? 'FALSE' : String(v)]))
  expect(gasCfg).toEqual(appCfg)
  const norm = (xs: object[]) => JSON.parse(JSON.stringify(xs.map((f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === null ? '' : v])))))
  expect(norm(g.DEFAULT_FOODS as object[])).toEqual(norm(DEFAULT_FOODS))
  expect({ ...(g.INITIAL_WEIGHT as object), ts: '' }).toEqual({ ...INITIAL_WEIGHT, ts: '' })
  expect(Date.parse((g.INITIAL_WEIGHT as { ts: string }).ts)).toBe(Date.parse(INITIAL_WEIGHT.ts))
})

test('setup 在空的 Foods／Weight 寫入初始資料，重跑不重複', () => {
  const env = loadGas()
  env.g.setupSicilyCare()
  env.g.setupSicilyCare()
  expect(env.sheets.get('Foods')!.data).toHaveLength(1 + DEFAULT_FOODS.length)
  expect(env.sheets.get('Weight')!.data).toHaveLength(2)
})

test('設了 PARTNER_EMAIL 才分享，而且只分享給那一個帳號', () => {
  const env = loadGas()
  env.g.setupSicilyCare()
  expect(env.shares).toEqual([])
  env.props.set('PARTNER_EMAIL', ' partner@example.com ')
  env.g.setupSicilyCare()
  expect(env.shares).toEqual(['sheet-editor:partner@example.com', 'folder-1-viewer:partner@example.com'])
})
