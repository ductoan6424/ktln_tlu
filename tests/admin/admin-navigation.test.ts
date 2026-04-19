import { describe, expect, it } from "vitest"

import {
  ADMIN_CORE_NAV_ITEMS,
  ADMIN_MANAGEMENT_NAV_ITEMS,
} from "@/lib/admin/admin-navigation"

describe("admin navigation", () => {
  it("exports management nav items in the expected order", () => {
    expect(ADMIN_MANAGEMENT_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/admin/users",
      "/admin/subjects",
      "/admin/groups",
      "/admin/events",
    ])
  })

  it("exports core nav items in the expected order", () => {
    expect(ADMIN_CORE_NAV_ITEMS.map((item) => item.href)).toEqual([
      "/admin/dashboard",
      "/admin/announcements",
      "/admin/analytics",
      "/admin/settings",
    ])
  })
})
