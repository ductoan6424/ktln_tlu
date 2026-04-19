import { describe, expect, it } from "vitest"

import { getAdminBreadcrumbItems } from "@/lib/admin/admin-route-meta"

describe("admin route meta", () => {
  it("builds breadcrumbs for the subjects list route", () => {
    expect(getAdminBreadcrumbItems("/admin/subjects")).toEqual([
      { label: "Admin", href: "/admin/dashboard" },
      { label: "Quan ly mon hoc" },
    ])
  })

  it("builds breadcrumbs for the group edit route", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/edit")).toEqual([
      { label: "Admin", href: "/admin/dashboard" },
      { label: "Quan ly group", href: "/admin/groups" },
      { label: "Chi tiet group", href: "/admin/groups/group-01" },
      { label: "Chinh sua" },
    ])
  })

  it("keeps nested record routes distinct from detail routes", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/members")).toEqual([
      { label: "Admin", href: "/admin/dashboard" },
      { label: "Quan ly group", href: "/admin/groups" },
      { label: "Chi tiet group", href: "/admin/groups/group-01" },
      { label: "Members" },
    ])
  })

  it("keeps nested create routes under a record", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/members/new")).toEqual([
      { label: "Admin", href: "/admin/dashboard" },
      { label: "Quan ly group", href: "/admin/groups" },
      { label: "Chi tiet group", href: "/admin/groups/group-01" },
      { label: "Members", href: "/admin/groups/group-01/members" },
      { label: "Tao moi" },
    ])
  })

  it("keeps nested edit routes under a record", () => {
    expect(getAdminBreadcrumbItems("/admin/groups/group-01/members/member-02/edit")).toEqual([
      { label: "Admin", href: "/admin/dashboard" },
      { label: "Quan ly group", href: "/admin/groups" },
      { label: "Chi tiet group", href: "/admin/groups/group-01" },
      { label: "Members", href: "/admin/groups/group-01/members" },
      { label: "Member 02", href: "/admin/groups/group-01/members/member-02" },
      { label: "Chinh sua" },
    ])
  })
})
