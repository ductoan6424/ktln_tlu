import { describe, expect, it } from "vitest"

import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import { ADMIN_MODULES, getAdminModule } from "@/lib/admin/admin-modules"

const REQUIRED_RECORD_IDS = {
  users: "user-001",
  subjects: "subject-001",
  groups: "group-001",
  events: "event-001",
} as const

function expectRowToCoverColumns<Cells extends { title: string }>(
  module: {
    columns: readonly { key: keyof Cells & string }[]
    getRecord: (id: string) => { cells: Cells } | undefined
  },
  recordId: string,
) {
  const record = module.getRecord(recordId)

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
    expectRowToCoverColumns(getAdminModule("users"), REQUIRED_RECORD_IDS.users)
    expectRowToCoverColumns(getAdminModule("subjects"), REQUIRED_RECORD_IDS.subjects)
    expectRowToCoverColumns(getAdminModule("groups"), REQUIRED_RECORD_IDS.groups)
    expectRowToCoverColumns(getAdminModule("events"), REQUIRED_RECORD_IDS.events)
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
