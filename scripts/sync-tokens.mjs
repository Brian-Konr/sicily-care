// 把工作室共用的 /workspace/studio/design-tokens.css 複製進 src/styles/，讓 repo 自帶一份（GitHub Pages 建置用）。
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../../../design-tokens.css')
const dst = resolve(here, '../src/styles/design-tokens.css')
if (!existsSync(src)) {
  console.warn('[sync-tokens] 找不到共用 design-tokens.css，沿用 src/styles/ 裡現有的那份')
  process.exit(0)
}
copyFileSync(src, dst)
console.log('[sync-tokens] 已同步 design-tokens.css')
