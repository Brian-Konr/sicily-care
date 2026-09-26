import * as React from "react"

/**
 * 讓 Sheet／Dialog 的 Portal 掛到指定容器（原型用：掛進 390×844 手機外框）。
 * 正式 App 不需要 Provider，預設 null＝掛到 document.body。
 */
export const PortalContainerContext = React.createContext<HTMLElement | null>(null)
