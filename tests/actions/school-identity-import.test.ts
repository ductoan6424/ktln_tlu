import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAdminPermission = vi.hoisted(() => vi.fn())
const readSheet = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  schoolIdentityImportBatch: {
    create: vi.fn(),
  },
}))

vi.mock("@/lib/auth/authorization", () => ({
  requireAdminPermission,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}))

vi.mock("read-excel-file/universal", () => ({
  readSheet,
}))

import { createSchoolIdentityImportPreview } from "@/actions/school-identity-import"

beforeEach(() => {
  vi.resetAllMocks()
  requireAdminPermission.mockResolvedValue({
    profile: {
      userId: "admin-1",
    },
  })
  prisma.schoolIdentityImportBatch.create.mockResolvedValue({
    id: "batch-1",
    status: "PENDING_CONFIRM",
    totalRows: 1,
    failedCount: 0,
  })
})

describe("createSchoolIdentityImportPreview", () => {
  it("reads xlsx imports on the server and creates a pending confirmation batch", async () => {
    readSheet.mockResolvedValue([
      ["role", "displayName", "department", "className", "cohort"],
      ["STUDENT", "Nguyen Van A", "Cong nghe thong tin", "CTK45A", 2024],
    ])

    const formData = new FormData()
    formData.set(
      "file",
      new File([Buffer.from("fake xlsx bytes")], "students.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
    )
    formData.set("mode", "CREATE")

    const result = await createSchoolIdentityImportPreview(formData)

    expect(result).toEqual({
      success: true,
      data: {
        batchId: "batch-1",
        status: "PENDING_CONFIRM",
        totalRows: 1,
        failedCount: 0,
      },
    })
    expect(readSheet).toHaveBeenCalledWith(expect.any(ArrayBuffer))
    expect(prisma.schoolIdentityImportBatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mode: "CREATE",
          status: "PENDING_CONFIRM",
          totalRows: 1,
          failedCount: 0,
          importedById: "admin-1",
        }),
      }),
    )
  })
})
