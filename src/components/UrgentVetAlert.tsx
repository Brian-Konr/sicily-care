import type { ReactNode } from "react"
import { Phone, Siren } from "lucide-react"
import type { ClinicInfo } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export interface UrgentVetAlertProps {
  title?: string
  children?: ReactNode
  /** 有電話才顯示「打給 ○○」撥號鈕；undefined＝不顯示 */
  clinic?: ClinicInfo
  /** 沒有診所電話時的一行提示（純文字，不離開目前畫面） */
  noClinicHint?: ReactNode
}

/** 紅色緊急提示「請盡快聯絡獸醫」：實心紅底、圖示＋粗體標題，role=alert 會被朗讀；可附撥號鈕 */
export function UrgentVetAlert({ title = "請盡快聯絡獸醫", children, clinic, noClinicHint }: UrgentVetAlertProps) {
  return (
    <Alert variant="urgent" className="px-4 py-4">
      <Siren aria-hidden />
      <AlertTitle className="text-xl leading-7">{title}</AlertTitle>
      <AlertDescription className="gap-3 text-base">
        {children && <p>{children}</p>}
        {clinic ? (
          <div className="grid w-full gap-2">
            <Button asChild size="lg" className="w-full whitespace-normal bg-destructive-foreground text-destructive">
              <a href={`tel:${clinic.phone.replace(/[^0-9+]/g, "")}`}>
                <Phone aria-hidden />打給 {clinic.name}
              </a>
            </Button>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-num font-bold">{clinic.phone}</span>
              {clinic.is24h && (
                <span className="inline-flex items-center rounded-full border-2 border-current px-2 font-bold leading-6">24 小時</span>
              )}
            </p>
          </div>
        ) : (
          noClinicHint && <p className="opacity-100">{noClinicHint}</p>
        )}
      </AlertDescription>
    </Alert>
  )
}
