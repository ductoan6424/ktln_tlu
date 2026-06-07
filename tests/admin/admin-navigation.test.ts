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
      "/admin/moderation",
      "/admin/announcements",
      "/admin/analytics",
      "/admin/settings",
    ])
  })

  it("exports translated labels for core and management nav items", () => {
    expect(ADMIN_MANAGEMENT_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Người dùng",
      "Lớp học",
      "Nhóm",
      "Sự kiện",
    ])

    expect(ADMIN_CORE_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Bảng điều khiển",
      "Kiểm duyệt",
      "Thông báo",
      "Phân tích",
      "Cài đặt hệ thống",
    ])
  })
})
