import { describe, expect, it } from "vitest"

import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import { ADMIN_MODULES, getAdminModule } from "@/lib/admin/admin-modules"

const REQUIRED_RECORD_IDS = {
  users: "user-001",
  subjects: "subject-001",
  groups: "group-001",
  events: "event-001",
} as const

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

  it("backs every configured column with row data", () => {
    for (const key of ADMIN_MODULES.map((module) => module.key)) {
      const module = getAdminModule(key)
      const record = module.getRecord(REQUIRED_RECORD_IDS[key])

      expect(record).toBeDefined()
      expect(record).toEqual(
        expect.objectContaining({
          cells: expect.any(Object),
        }),
      )

      for (const column of module.columns) {
        expect(record?.cells[column.key]).toEqual(expect.any(String))
      }
    }
  })

  it("resolves detail sections by record id", () => {
    const users = getAdminModule("users")
    const first = users.getDetailSections("user-001")
    const second = users.getDetailSections("user-002")

    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(first).not.toEqual(second)
    expect(users.getDetailSections("missing-id")).toBeUndefined()
  })
})
