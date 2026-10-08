import { Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function UpdateNeededNote({ action }: { action: string }) {
  return (
    <Alert variant="info">
      <Info aria-hidden />
      <AlertTitle>需要更新 Apps Script 才能{action}。</AlertTitle>
      <AlertDescription>其他紀錄照常可以用。</AlertDescription>
    </Alert>
  )
}
