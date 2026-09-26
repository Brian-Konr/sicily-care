// @ts-nocheck
import { test } from 'vitest'
import assert from 'node:assert/strict'
import { networkState } from '@/data/network'

test('背景讀取偶發失敗一次：不顯示連不到', () => {
  assert.equal(networkState({ browserOnline: true, backendOk: false, pending: 0, failStreak: 1 }), 'online')
})
test('連續失敗 2 次才顯示連不到', () => {
  assert.equal(networkState({ browserOnline: true, backendOk: false, pending: 0, failStreak: 2 }), 'unreachable')
})
test('有待送紀錄時失敗一次就提示（使用者要知道紀錄還在手機裡）', () => {
  assert.equal(networkState({ browserOnline: true, backendOk: false, pending: 1, failStreak: 0 }), 'unreachable')
})
test('手機沒網路一律 offline；後端正常一律 online', () => {
  assert.equal(networkState({ browserOnline: false, backendOk: true, pending: 0, failStreak: 0 }), 'offline')
  assert.equal(networkState({ browserOnline: true, backendOk: true, pending: 3, failStreak: 5 }), 'online')
})
