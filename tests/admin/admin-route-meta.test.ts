import { describe, expect, it } from "vitest"

import { getAdminBreadcrumbItems } from "@/lib/admin/admin-route-meta"

describe("admin route meta", () => {
  it("builds breadcrumbs for the subjects list route", () => {
    expect(getAdminBreadcrumbItems("/admin/subjects")).toEqual([
      { label: "Quản trị", href: "/admin/dashboard" },
      { label: "Quản lý môn học" },
    ])
  })

  it("builds breadcrumbs for the group edit route", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/edit")).toEqual([
      { label: "Quản trị", href: "/admin/dashboard" },
      { label: "Quản lý nhóm", href: "/admin/groups" },
      { label: "Chi tiết nhóm", href: "/admin/groups/group-01" },
      { label: "Chỉnh sửa" },
    ])
  })

  it("keeps nested record routes distinct from detail routes", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/members")).toEqual([
      { label: "Quản trị", href: "/admin/dashboard" },
      { label: "Quản lý nhóm", href: "/admin/groups" },
      { label: "Chi tiết nhóm", href: "/admin/groups/group-01" },
      { label: "Thành viên" },
    ])
  })

  it("keeps nested create routes under a record", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/members/new")).toEqual([
      { label: "Quản trị", href: "/admin/dashboard" },
      { label: "Quản lý nhóm", href: "/admin/groups" },
      { label: "Chi tiết nhóm", href: "/admin/groups/group-01" },
      { label: "Thành viên", href: "/admin/groups/group-01/members" },
      { label: "Tạo mới" },
    ])
  })

  it("keeps nested edit routes under a record", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/members/member-02/edit")).toEqual([
      { label: "Quản trị", href: "/admin/dashboard" },
      { label: "Quản lý nhóm", href: "/admin/groups" },
      { label: "Chi tiết nhóm", href: "/admin/groups/group-01" },
      { label: "Thành viên", href: "/admin/groups/group-01/members" },
      { label: "Thành viên 02", href: "/admin/groups/group-01/members/member-02" },
      { label: "Chỉnh sửa" },
    ])
  })
})
