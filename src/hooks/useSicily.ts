// 把資料層包成 React hook：畫面拿到解碼好的資料、連線狀態與 api，不直接碰 Sheet 格式。
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createApi, type ApiStatus } from '@/api'
import { createGasAdapter } from '@/api/gas'
import { createMockAdapter } from '@/api/mock'
import type { Snapshot } from '@/api/sheet'
import type { WriteOp } from '@/api/types'
import { decodeSnapshot } from '@/data/codec'
import { flushPhotoOutbox } from '@/data/photo'
import { DEMO, GAS_URL, type Settings } from '@/data/settings'
import { networkState, RECHECK_AFTER_FAIL_MS } from '@/data/network'

const failedId = (op: WriteOp) => (op.action === 'append' ? op.record.id : 'id' in op ? op.id : undefined)

export function useSicily(settings: Settings, now: Date) {
  const api = useMemo(() => {
    const adapter = DEMO
      ? createMockAdapter({ storage: localStorage, latencyMs: 150 })
      : createGasAdapter({ url: GAS_URL, secret: settings.secret })
    return createApi({ adapter, storage: localStorage, who: settings.who })
  }, [settings])

  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [status, setStatus] = useState<ApiStatus>(() => api.status())
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine)
  /** 連續幾次讀取連不到後端（成功就歸零） */
  const [failStreak, setFailStreak] = useState(0)

  const refresh = useCallback(async () => {
    try {
      setSnap(await api.load(7)); setLoadError(null)
      void flushPhotoOutbox(api).catch(() => 0)
    } catch (e) { setLoadError(e as Error) }
    const ok = api.status().online
    setFailStreak((n) => (ok ? 0 : n + 1))
  }, [api])

  // 每次佇列變動（新增、送出、失敗）都用本機快照更新畫面，不必等重新讀取
  useEffect(() => api.onStatus((s) => { setStatus(s); const p = api.peek(); if (p) setSnap(p) }), [api])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    const onOnline = () => { setBrowserOnline(true); void refresh() }
    const onOffline = () => setBrowserOnline(false)
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    // 另一個人的新紀錄：畫面開著時每 2 分鐘讀一次
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 120_000)
    addEventListener('online', onOnline); addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      removeEventListener('online', onOnline); removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])

  // 連不到後端又有待送紀錄時，每 20 秒自動再試（不用等 2 分鐘的定時讀取）；重送靠 id 冪等，不會重複寫
  const unreachable = browserOnline && !status.online
  const hasPending = status.pending > 0
  useEffect(() => {
    if (!unreachable || !hasPending) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 20_000)
    return () => clearInterval(t)
  }, [unreachable, hasPending, refresh])

  // 背景讀取第一次失敗（多半是冷啟動）：15 秒後再確認一次，成功就不打擾，再失敗才顯示橫幅
  useEffect(() => {
    if (failStreak !== 1 || !browserOnline) return
    const t = setTimeout(() => { void refresh() }, RECHECK_AFTER_FAIL_MS)
    return () => clearTimeout(t)
  }, [failStreak, browserOnline, refresh])

  const failedIds = useMemo(() => new Set(status.failed.map((f) => failedId(f.op)).filter((x): x is string => !!x)), [status.failed])
  const data = useMemo(() => (snap ? decodeSnapshot(snap, now, failedIds) : null), [snap, now, failedIds])

  return {
    api,
    data,
    /** 首頁用：第一次讀取中＝loading；讀不到又沒有快取＝error */
    loadState: data ? ('ready' as const) : loadError ? ('error' as const) : ('loading' as const),
    loadError,
    /** 手機沒網路＝offline；有待送紀錄或連續 2 次連不到後端＝unreachable；偶發一次失敗不打擾（見 data/network.ts） */
    network: networkState({ browserOnline, backendOk: status.online, pending: status.pending, failStreak }),
    queuedCount: status.pending,
    failedCount: status.failed.length,
    refresh,
  }
}
