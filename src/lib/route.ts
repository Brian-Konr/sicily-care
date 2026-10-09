export const ENTRY_TABLES = ["Feed", "Litter", "Weight", "Med", "Care"] as const
export type EntryTable = (typeof ENTRY_TABLES)[number]

export type Route =
  | { name: "home" | "feed" | "litter" | "weight" | "med" | "issue" | "timeline" | "settings" | "foods" }
  | { name: "issue-detail"; id: string }
  | { name: "entry-detail"; table: EntryTable | null; id: string }

const SCREENS = ["home", "feed", "litter", "weight", "med", "issue", "timeline", "settings", "foods"] as const

function isEntryTable(s: string): s is EntryTable {
  return (ENTRY_TABLES as readonly string[]).includes(s)
}

/** Parse `location.hash` (with or without a leading `#`). Never throws. */
export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "")
  if (h.startsWith("issue/")) {
    try {
      const id = decodeURIComponent(h.slice("issue/".length))
      if (id) return { name: "issue-detail", id }
    } catch {
      // bad % sequence → fall through
    }
  }
  if (h === "entry" || h.startsWith("entry/")) {
    const segs = h.split("/")
    if (segs.length === 3 && isEntryTable(segs[1])) {
      try {
        const id = decodeURIComponent(segs[2])
        if (id) return { name: "entry-detail", table: segs[1], id }
      } catch {
        // bad % sequence
      }
    }
    return { name: "entry-detail", table: null, id: "" }
  }
  return (SCREENS as readonly string[]).includes(h)
    ? { name: h as (typeof SCREENS)[number] }
    : { name: "home" }
}

/** Hash body with no leading `#`. */
export function formatHash(route: Route): string {
  if (route.name === "issue-detail") return `issue/${encodeURIComponent(route.id)}`
  if (route.name === "entry-detail" && route.table && route.id) {
    return `entry/${route.table}/${encodeURIComponent(route.id)}`
  }
  return route.name
}
