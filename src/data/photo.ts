// 照片：選檔 → 壓成長邊 1600px 的 JPEG（Apps Script 單次請求有大小上限）→ base64。
// 上傳失敗（離線）時先存在這支手機的「照片待傳」清單，上線後補傳並寫回 Issue 的 photo_ids／photo_urls。
import type { Api } from '@/api'
import { NetworkError } from '@/api/errors'

export interface PickedPhoto { base64: string; dataUrl: string; name: string }

export function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

export async function compressImage(file: File, maxSide = 1600, quality = 0.8): Promise<PickedPhoto> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(',') + 1), name: file.name.replace(/\.[^.]+$/, '') + '.jpg' }
}

interface PendingPhotos { issueId: string; photos: { base64: string; name: string }[]; ids: string[]; urls: string[] }
const KEY = 'sicily.photoOutbox'
const load = (s: Storage): PendingPhotos[] => { try { return JSON.parse(s.getItem(KEY) || '[]') } catch { return [] } }
const save = (s: Storage, v: PendingPhotos[]) => s.setItem(KEY, JSON.stringify(v))

/** 上傳一筆回報的照片；回傳 'done'（全部上傳）或 'saved'（離線，已存手機待補傳） */
export async function uploadIssuePhotos(api: Api, issueId: string, photos: { base64: string; name: string }[], storage: Storage = localStorage): Promise<'done' | 'saved'> {
  const job: PendingPhotos = { issueId, photos, ids: [], urls: [] }
  return (await runJob(api, job, storage)) ? 'done' : 'saved'
}

/** 補傳之前沒傳成功的照片；回傳補傳完成的回報數 */
export async function flushPhotoOutbox(api: Api, storage: Storage = localStorage): Promise<number> {
  let done = 0
  for (const job of load(storage)) {
    save(storage, load(storage).filter((j) => j.issueId !== job.issueId))
    if (await runJob(api, job, storage)) done += 1
    else break
  }
  return done
}
export const pendingPhotoCount = (storage: Storage = localStorage) => load(storage).reduce((n, j) => n + j.photos.length, 0)

async function runJob(api: Api, job: PendingPhotos, storage: Storage): Promise<boolean> {
  while (job.photos.length) {
    try {
      const { fileId, url } = await api.uploadPhoto({ base64: job.photos[0].base64, filename: job.photos[0].name })
      job.ids.push(fileId); job.urls.push(url); job.photos.shift()
    } catch (err) {
      if (!(err instanceof NetworkError)) throw err
      save(storage, [...load(storage), job]) // 空間不夠會丟錯，由呼叫端提示
      if (job.ids.length) await api.edit('Issue', job.issueId, { photo_ids: job.ids.join(','), photo_urls: job.urls.join(',') } as never)
      return false
    }
  }
  await api.edit('Issue', job.issueId, { photo_ids: job.ids.join(','), photo_urls: job.urls.join(',') } as never)
  return true
}
