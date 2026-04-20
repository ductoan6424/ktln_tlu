import { describe, expect, it } from "vitest"

import { MAIN_NAV_ITEMS } from "@/app/(main)/main-nav-items"

describe("MAIN_NAV_ITEMS", () => {
  it("uses serializable icon identifiers for server-to-client navigation props", () => {
    expect(() => structuredClone(MAIN_NAV_ITEMS)).not.toThrow()

    expect(MAIN_NAV_ITEMS.map(({ icon, href }) => ({ icon, href }))).toEqual([
      { icon: "home", href: "/feed" },
      { icon: "users", href: "/clubs" },
      { icon: "calendar-days", href: "/events" },
      { icon: "users-round", href: "/groups" },
    ])
  })
})
