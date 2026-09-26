// @ts-nocheck
import { test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { mergedGas } from '../scripts/build-gas.mjs'

test('gas/SicilyCare-AppsScript.gs 跟 Schema／Setup／Code 三個來源一致（改了 .gs 請跑 npm run build:gas）', () => {
  expect(readFileSync(new URL('../gas/SicilyCare-AppsScript.gs', import.meta.url), 'utf8')).toBe(mergedGas())
})
