import { test, expect } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

test('前端原始碼沒有寫死的密鑰或 Apps Script 網址', () => {
  const offenders = walk(join(root, 'src'))
    .filter((f) => /\.(ts|tsx|css|json)$/.test(f))
    .filter((f) => {
      const s = readFileSync(f, 'utf8')
      return /script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/.test(s) || /\b[0-9a-f]{48,}\b/.test(s) || /AIza[0-9A-Za-z_-]{30,}/.test(s)
    })
  expect(offenders).toEqual([])
})

// Apps Script 網址不是秘密（每個請求都要帶只存在手機裡的共享密鑰），部署時由 VITE_GAS_URL 帶進 build；
// 但 build 產物裡不能有其他 Apps Script 網址，也不能有看起來像密鑰的字串。
test('build 產物（若有）沒有密鑰，Apps Script 網址只能是 VITE_GAS_URL', () => {
  const dist = join(root, 'dist')
  if (!existsSync(dist)) return
  // 允許的網址：建置時的 VITE_GAS_URL，或 deploy/gas-url（部署腳本預設讀這個）
  const gasFile = join(root, 'deploy/gas-url')
  const allowed = process.env.VITE_GAS_URL || (existsSync(gasFile) ? readFileSync(gasFile, 'utf8').trim() : '')
  const hit = walk(dist).filter((f) => /\.(js|html|webmanifest)$/.test(f)).filter((f) => {
    const s = readFileSync(f, 'utf8')
    const urls = s.match(/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}\/exec/g) ?? []
    return urls.some((u) => u !== allowed) || /\b(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{64}\b/.test(s)
  })
  expect(hit).toEqual([])
})

test('呼叫 Apps Script 用 text/plain（避免 CORS preflight）', () => {
  const s = readFileSync(join(root, 'src/api/gas.ts'), 'utf8')
  expect(s).toMatch(/text\/plain/)
  expect(s).not.toMatch(/application\/json/)
})
