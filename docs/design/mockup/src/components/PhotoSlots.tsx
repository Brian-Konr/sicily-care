import { ImagePlus, X } from "lucide-react"
import type { PhotoDraft } from "@/types"

export interface PhotoSlotsProps {
  photos: PhotoDraft[]
  max?: number
  onAdd: () => void
  onRemove: (id: string) => void
}

/** 照片格：最多 3 張，縮圖右上角 44px 刪除鈕；previewUrl 為 null 時畫示意佔位圖 */
export function PhotoSlots({ photos, max = 3, onAdd, onRemove }: PhotoSlotsProps) {
  const full = photos.length >= max
  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-lg border">
            {p.previewUrl ? (
              <img src={p.previewUrl} alt={p.label} className="size-full object-cover" />
            ) : (
              <div role="img" aria-label={p.label}
                className="flex size-full items-end bg-[repeating-linear-gradient(45deg,var(--accent)_0_12px,var(--muted)_12px_24px)]">
                <span className="m-1.5 rounded-md bg-card px-1.5 font-bold whitespace-nowrap">{p.label}</span>
              </div>
            )}
            <button type="button" onClick={() => onRemove(p.id)} aria-label={`移除${p.label}`}
              className="absolute top-0 right-0 grid size-11 place-items-center">
              <span className="grid size-7 place-items-center rounded-full bg-foreground text-background"><X className="size-4" aria-hidden /></span>
            </button>
          </div>
        ))}
        {!full && (
          <button type="button" onClick={onAdd}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input bg-card font-bold text-primary">
            <ImagePlus className="size-7" aria-hidden />
            加照片
          </button>
        )}
      </div>
      <p className="text-muted-foreground">{full ? `已達上限 ${max} 張` : `最多 ${max} 張，已選 ${photos.length} 張`}</p>
    </div>
  )
}
