// 這支手機的設定（身分、共享密鑰）只存在 localStorage，不進程式碼。
// Apps Script 網址不是秘密（每個請求都要帶密鑰），在 build 時由 VITE_GAS_URL 帶入；
// 沒設定網址時，App 以「本機試用」模式執行（資料只存在這支手機）。
export interface Settings { who: string; secret: string }

const KEY = 'sicily.settings'
export const GAS_URL: string = (import.meta.env?.VITE_GAS_URL as string | undefined)?.trim() ?? ''
export const DEMO = !GAS_URL
/** 首次開啟、還沒讀到 Config.users 前的顯示名稱 */
export const DEFAULT_USERS: [string, string] = ['Brian', 'Mia']

export function loadSettings(storage: Storage = localStorage): Settings | null {
  try {
    const s = JSON.parse(storage.getItem(KEY) || 'null') as Partial<Settings> | null
    return s?.who && (DEMO || s.secret) ? { who: s.who, secret: s.secret ?? '' } : null
  } catch { return null }
}
export function saveSettings(s: Settings, storage: Storage = localStorage) { storage.setItem(KEY, JSON.stringify(s)) }
export function clearSettings(storage: Storage = localStorage) { storage.removeItem(KEY) }
