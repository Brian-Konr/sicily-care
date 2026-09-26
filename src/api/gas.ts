// Apps Script Web App 介面卡。網址與密鑰由使用者第一次開啟時輸入，存在 localStorage；原始碼裡不放。
import { NetworkError } from './errors'
import type { Adapter, Op, Response } from './types'

export function createGasAdapter(opts: { url: string; secret: string; fetchImpl?: typeof fetch; timeoutMs?: number }): Adapter {
  const { url, secret, fetchImpl = globalThis.fetch.bind(globalThis), timeoutMs = 20000 } = opts
  if (!url || !secret) throw new Error('需要 Apps Script 網址和共享密鑰')
  return {
    kind: 'gas',
    async call(op: Op): Promise<Response> {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      let res: globalThis.Response
      try {
        res = await fetchImpl(url, {
          method: 'POST',
          // text/plain 是「簡單請求」，不會觸發 Apps Script 不支援的 OPTIONS preflight
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ ...op, secret }),
          redirect: 'follow', // Apps Script 會 302 到 googleusercontent.com
          signal: ctrl.signal,
        })
      } catch {
        throw new NetworkError()
      } finally {
        clearTimeout(timer)
      }
      if (!res.ok) throw new NetworkError(`伺服器暫時沒有回應（HTTP ${res.status}），稍後會自動重試`)
      try {
        return (await res.json()) as Response
      } catch {
        // 部署權限設錯時 Google 會回登入頁 HTML
        return { ok: false, error: 'bad_response', message: '回應不是 JSON：請確認 Apps Script 部署設成「任何人」可存取' }
      }
    },
  }
}
