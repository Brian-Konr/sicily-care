import { test, expect } from 'vitest'
import { swipeSettle, swipeShouldTrack } from '@/lib/swipe'
import { clampPan, viewerRelease } from '@/lib/viewerGesture'

test('swipeShouldTrack：往左且水平為主才開始；已打開時左右超過 10px 都算', () => {
  expect(swipeShouldTrack(-11, 5)).toBe(true)
  expect(swipeShouldTrack(-11, -20)).toBe(false)
  expect(swipeShouldTrack(11, 0)).toBe(false)
  expect(swipeShouldTrack(11, 0, true)).toBe(true)
  expect(swipeShouldTrack(-11, 0, true)).toBe(true)
  expect(swipeShouldTrack(5, 0, true)).toBe(false)
})

test('swipeSettle：超過 60% 確認、至少 44px 打開、其餘關閉', () => {
  expect(swipeSettle(-50, 200)).toBe('open')
  expect(swipeSettle(-130, 200)).toBe('confirm')
  expect(swipeSettle(-20, 200)).toBe('close')
  expect(swipeSettle(20, 200)).toBe('close')
})

test('viewerRelease：水平翻頁、往下關閉、有移動就 snap', () => {
  expect(viewerRelease({ scale: 2, dx: -100, dy: 0, vx: 1, vy: 0, width: 300 })).toBe('none')
  expect(viewerRelease({ scale: 1, dx: -100, dy: 10, vx: 0, vy: 0, width: 300 })).toBe('next')
  expect(viewerRelease({ scale: 1, dx: 100, dy: 10, vx: 0, vy: 0, width: 300 })).toBe('prev')
  expect(viewerRelease({ scale: 1, dx: 0, dy: 130, vx: 0, vy: 0, width: 300 })).toBe('close')
  expect(viewerRelease({ scale: 1, dx: 10, dy: 10, vx: 0, vy: 0, width: 300 })).toBe('snap')
  expect(viewerRelease({ scale: 1, dx: 0, dy: 0, vx: 0, vy: 0, width: 300 })).toBe('none')
})

test('clampPan：scale=1 歸零；放大後限制在溢出範圍', () => {
  expect(clampPan(10, 20, 1, 100, 100, 80, 80)).toEqual({ tx: 0, ty: 0 })
  const p = clampPan(1000, 1000, 2, 100, 100, 80, 80)
  expect(p.tx).toBeLessThanOrEqual((80 * 2 - 100) / 2)
  expect(p.ty).toBeLessThanOrEqual((80 * 2 - 100) / 2)
})
