import { expect, test } from "vitest"
import { ENTRY_TABLES, formatHash, parseHash, type Route } from "@/lib/route"

test("round-trip each screen name", () => {
  for (const name of ["home", "feed", "litter", "weight", "med", "issue", "timeline", "settings", "foods"] as const) {
    const r: Route = { name }
    expect(parseHash("#" + formatHash(r))).toEqual(r)
    expect(parseHash(formatHash(r))).toEqual(r)
  }
})

test("round-trip issue ids including a space", () => {
  expect(parseHash("#" + formatHash({ name: "issue-detail", id: "abc" }))).toEqual({ name: "issue-detail", id: "abc" })
  expect(parseHash("#issue/abc")).toEqual({ name: "issue-detail", id: "abc" })
  expect(parseHash("#issue/a%20b")).toEqual({ name: "issue-detail", id: "a b" })
  expect(parseHash("#" + formatHash({ name: "issue-detail", id: "a b" }))).toEqual({ name: "issue-detail", id: "a b" })
})

test("round-trip entry ids for each table", () => {
  for (const table of ENTRY_TABLES) {
    const r: Route = { name: "entry-detail", table, id: "id-1" }
    expect(parseHash("#" + formatHash(r))).toEqual(r)
    expect(parseHash(`#entry/${table}/id-1`)).toEqual(r)
  }
})

test("invalid entry hashes are entry-detail not-found, never home", () => {
  const missing = { name: "entry-detail", table: null, id: "" }
  expect(parseHash("#entry/Issue/x")).toEqual(missing)
  expect(parseHash("#entry/feed/x")).toEqual(missing)
  expect(parseHash("#entry/Feed")).toEqual(missing)
  expect(parseHash("#entry/Feed/x/y")).toEqual(missing)
  expect(parseHash("#entry")).toEqual(missing)
  expect(parseHash("#entry/")).toEqual(missing)
})

test("#nope → home; #issue/ → home", () => {
  expect(parseHash("#nope")).toEqual({ name: "home" })
  expect(parseHash("#issue/")).toEqual({ name: "home" })
})

test("a bad % in entry/... does not throw and is not-found", () => {
  expect(() => parseHash("#entry/Feed/%")).not.toThrow()
  expect(parseHash("#entry/Feed/%")).toEqual({ name: "entry-detail", table: null, id: "" })
})
