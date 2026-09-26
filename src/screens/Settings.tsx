import { useEffect, useMemo, useState } from "react"
import { UserRound } from "lucide-react"
import type { MedKind, SettingsValues } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { FormRow, FormSection } from "@/components/FormSection"
import { SampleBadge } from "@/components/SampleBadge"
import { BottomActionBar, ScreenLayout } from "@/components/ScreenLayout"
import { Stepper } from "@/components/Stepper"
import { UnsavedChangesSheet } from "@/components/UnsavedChangesSheet"
import { catAgeLabel } from "@/lib/age"
import { dateKey } from "@/lib/format"

export interface SettingsScreenProps {
  now: Date
  catName: string
  /** 目前已儲存的設定 */
  values: SettingsValues
  me: string
  users: [string, string]
  /** 間隔的預設值是否仍為示意（顯示「示意」標記） */
  intervalsAreSample?: boolean
  onBack: () => void
  onSave: (v: SettingsValues) => void
  /** 確認後才呼叫：清除這支手機的身分與共享密鑰，回到首次開啟 */
  onSwitchUser: () => void
  /** 有未儲存變更時通知外層（正式 App 可用來擋路由切換／beforeunload） */
  onDirtyChange?: (dirty: boolean) => void
}

const INTERVALS: { kind: MedKind; label: string; step: number; max: number }[] = [
  { kind: "體內驅蟲", label: "體內驅蟲", step: 15, max: 365 },
  { kind: "體外驅蟲", label: "體外驅蟲", step: 5, max: 180 },
  { kind: "內外同驅", label: "內外同驅", step: 5, max: 180 },
  { kind: "三合一疫苗", label: "三合一疫苗", step: 30, max: 1095 },
  { kind: "狂犬病疫苗", label: "狂犬病疫苗", step: 30, max: 1095 },
]
const PHONE_OK = /^[0-9+\-() ]{6,20}$/

const same = (a: SettingsValues, b: SettingsValues) => JSON.stringify(a) === JSON.stringify(b)

export function SettingsScreen(p: SettingsScreenProps) {
  const [draft, setDraft] = useState<SettingsValues>(p.values)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [switchOpen, setSwitchOpen] = useState(false)
  // 外層儲存後（內容改變）才重設草稿；用字串比對，避免父層每次 render 傳新物件就洗掉草稿
  const valuesKey = JSON.stringify(p.values)
  useEffect(() => setDraft(JSON.parse(valuesKey) as SettingsValues), [valuesKey])

  const dirty = useMemo(() => !same(draft, JSON.parse(valuesKey) as SettingsValues), [draft, valuesKey])
  const { onDirtyChange } = p
  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange])

  const today = dateKey(p.now)
  const phoneErr = draft.clinic_phone.trim() && !PHONE_OK.test(draft.clinic_phone.trim()) ? "電話格式好像不對，只能有數字、空格、+、-、括號。" : undefined
  const bdErr = !draft.birthday_est ? "請選一個大概的日期。" : draft.birthday_est > today ? "生日不能在未來。" : undefined
  const valid = !phoneErr && !bdErr
  const age = bdErr ? "" : catAgeLabel(draft.birthday_est, p.now)
  const set = <K extends keyof SettingsValues>(k: K, v: SettingsValues[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const setInterval = (k: MedKind, v: number) => setDraft((d) => ({ ...d, med_interval_days: { ...d.med_interval_days, [k]: v } }))
  const save = () => valid && p.onSave({ ...draft, clinic_name: draft.clinic_name.trim(), clinic_phone: draft.clinic_phone.trim() })
  const other = p.users.find((u) => u !== p.me) ?? p.users[1]

  return (
    <ScreenLayout title="設定" onBack={() => (dirty ? setLeaveOpen(true) : p.onBack())} backLabel="首頁"
      bottom={
        <BottomActionBar>
          <Button size="lg" className="w-full" disabled={!dirty || !valid} onClick={save}>
            {dirty ? "儲存" : "已儲存"}
          </Button>
        </BottomActionBar>
      }>
      <div className="space-y-6 pt-1 pb-2">
        <FormSection id="cat" title={p.catName}>
          <FormRow label={<>生日<span className="text-muted-foreground">（約）</span></>} htmlFor="bd" stack error={bdErr}
            hint={<>不確定也沒關係，填大概的日子。首頁會顯示「{age || "—"}」。</>}>
            <Input id="bd" type="date" value={draft.birthday_est} max={today} onChange={(e) => set("birthday_est", e.target.value)} aria-invalid={!!bdErr} />
          </FormRow>
        </FormSection>

        <FormSection id="clinic" title="獸醫診所" badge={<span className="text-muted-foreground">選填</span>}
          description="填了電話，清砂出現「請盡快聯絡獸醫」時會多一顆「打給診所」按鈕。">
          <FormRow label="名稱" htmlFor="clinic-name" stack>
            <Input id="clinic-name" value={draft.clinic_name} autoComplete="organization" placeholder="例如：○○動物醫院"
              onChange={(e) => set("clinic_name", e.target.value)} />
          </FormRow>
          <FormRow label="電話" htmlFor="clinic-phone" stack error={phoneErr}>
            <Input id="clinic-phone" type="tel" inputMode="tel" autoComplete="tel" value={draft.clinic_phone} placeholder="例如：02-1234-5678"
              onChange={(e) => set("clinic_phone", e.target.value)} aria-invalid={!!phoneErr} />
          </FormRow>
          <FormRow label="24 小時營業" htmlFor="clinic-24h"
            hint={draft.clinic_24h ? "撥號鈕旁會標「24 小時」。" : undefined}>
            <Switch id="clinic-24h" checked={draft.clinic_24h} onCheckedChange={(v) => set("clinic_24h", v)} />
          </FormRow>
        </FormSection>

        <FormSection id="intervals" title="驅蟲／疫苗間隔" badge={p.intervalsAreSample ? <SampleBadge label="示意預設" /> : undefined}
          description="單位是天。記錄「已給」時會用這裡的天數自動算下次日期；請依獸醫建議調整。">
          {INTERVALS.map((it) => (
            <FormRow key={it.kind} label={it.label}>
              <Stepper label={`${it.label}間隔`} showLabel={false} editable unit="天" min={1} max={it.max} step={it.step}
                value={draft.med_interval_days[it.kind] ?? 30} onChange={(v) => setInterval(it.kind, v)} />
            </FormRow>
          ))}
        </FormSection>

        <FormSection id="who" title="身分" description="切換會清除這支手機的身分和共享密鑰，需要重新輸入密鑰。紀錄不會被刪除。">
          <FormRow label={<span className="inline-flex items-center gap-2"><UserRound className="size-5 text-muted-foreground" aria-hidden />目前是 {p.me}</span>}>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setSwitchOpen(true)}>切換成 {other}</Button>
          </FormRow>
        </FormSection>
      </div>

      <UnsavedChangesSheet open={leaveOpen} canSave={valid}
        onStay={() => setLeaveOpen(false)}
        onDiscard={() => { setLeaveOpen(false); setDraft(p.values); p.onBack() }}
        onSaveAndLeave={() => { setLeaveOpen(false); save(); p.onBack() }} />

      <ConfirmDialog open={switchOpen} title="要切換身分嗎？"
        description={`這支手機會清除目前的身分（${p.me}）和共享密鑰，需要重新輸入密鑰。紀錄不會被刪除。${dirty ? "還沒儲存的設定也會一起捨棄。" : ""}`}
        confirmLabel="清除並切換" onCancel={() => setSwitchOpen(false)}
        onConfirm={() => { setSwitchOpen(false); p.onSwitchUser() }} />
    </ScreenLayout>
  )
}
