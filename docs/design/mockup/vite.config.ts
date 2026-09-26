import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// 設計 tokens 在上一層 docs/design/design-tokens.css（原型資料夾外），需允許 dev server 讀取
const designRoot = path.resolve(import.meta.dirname, '..')

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: { fs: { allow: [designRoot] } },
})
