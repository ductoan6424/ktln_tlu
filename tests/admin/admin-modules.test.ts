import { describe, expect, it } from "vitest"

import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import { ADMIN_MODULES, getAdminModule } from "@/lib/admin/admin-modules"

describe("admin module registry", () => {
  it("builds admin module paths from a base path", () => {
    expect(createAdminModulePaths("/admin/users")).toEqual({
      list: "/admin/users",
      create: "/admin/users/new",
      settings: "/admin/users/settings",
      detail: "/admin/users/[id]",
      edit: "/admin/users/[id]/edit",
    })
  })

  it("exports the admin modules in the expected order", () => {
    expect(ADMIN_MODULES.map((module) => module.key)).toEqual([
      "users",
      "subjects",
      "groups",
      "events",
    ])
  })

  it("resolves user records from the registry", () => {
    expect(getAdminModule("users").getRecord("user-001")).toMatchObject({
      title: "Nguyen Duc Toan",
    })
  })

  it("returns undefined for missing user records", () => {
    expect(getAdminModule("users").getRecord("missing-id")).toBeUndefined()
  })
})
