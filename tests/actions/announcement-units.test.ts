import { beforeEach, describe, expect, it, vi } from "vitest"

import { ForbiddenError } from "@/lib/errors"

const requireSystemAdmin = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: {
    findUnique: vi.fn(),
  },
  organizationUnit: {
    findMany: vi.fn(),
  },
  announcementUnitMember: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  $transaction: vi.fn(),
}))

const tx = {
  $executeRaw: vi.fn(),
  userProfile: {
    findUnique: vi.fn(),
  },
  organizationUnit: {
    findMany: vi.fn(),
  },
  announcementUnitMember: {
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  },
}

vi.mock("next/cache", () => ({ revalidatePath }))

vi.mock("@/lib/auth/authorization", () => ({
  requireSystemAdmin,
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { updateAnnouncementUnitAssignments } from "@/actions/announcement-units"
import {
  listActiveAnnouncementUnitAssignmentsForUser,
  listActiveOrganizationUnits,
  requireUnitMembership,
} from "@/lib/announcements/units"

const activeUnits = [
  {
    id: "unit-faculty-it",
    code: "FACULTY_IT",
    name: "Khoa Công nghệ thông tin",
    type: "FACULTY",
    facultyId: "faculty-it",
    clubId: null,
    groupId: null,
  },
  {
    id: "unit-student-affairs",
    code: "STUDENT_AFFAIRS",
    name: "Phòng Công tác sinh viên",
    type: "DEPARTMENT",
    facultyId: null,
    clubId: null,
    groupId: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  requireSystemAdmin.mockResolvedValue({ profile: { userId: "admin-1" } })
  prisma.userProfile.findUnique.mockResolvedValue({
    userId: "user-1",
    deletedAt: null,
  })
  prisma.organizationUnit.findMany.mockResolvedValue(activeUnits)
  prisma.$transaction.mockImplementation(
    async (callback: (client: typeof tx) => Promise<void>) => callback(tx),
  )
  tx.$executeRaw.mockResolvedValue(1)
  tx.userProfile.findUnique.mockResolvedValue({
    userId: "user-1",
    deletedAt: null,
  })
  tx.organizationUnit.findMany.mockResolvedValue(activeUnits)
  tx.announcementUnitMember.deleteMany.mockResolvedValue({ count: 0 })
  tx.announcementUnitMember.createMany.mockResolvedValue({ count: 1 })
})

describe("announcement unit queries and authorization", () => {
  it("lists active organization units in stable type and name order", async () => {
    const result = await listActiveOrganizationUnits()

    expect(result).toEqual(activeUnits)
    expect(prisma.organizationUnit.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        facultyId: true,
        clubId: true,
        groupId: true,
      },
    })
  })

  it("lists only active assignments belonging to active units for an editor user", async () => {
    prisma.announcementUnitMember.findMany.mockResolvedValue([
      { unitId: "unit-faculty-it", role: "AUTHOR" },
    ])

    const result = await listActiveAnnouncementUnitAssignmentsForUser("user-1")

    expect(result).toEqual([{ unitId: "unit-faculty-it", role: "AUTHOR" }])
    expect(prisma.announcementUnitMember.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        isActive: true,
        unit: { isActive: true },
      },
      select: { unitId: true, role: true },
    })
  })

  it("accepts active matching membership and rejects a missing role membership", async () => {
    prisma.announcementUnitMember.findFirst.mockResolvedValueOnce({
      unitId: "unit-faculty-it",
      role: "APPROVER",
    })

    await expect(
      requireUnitMembership("user-1", "unit-faculty-it", "APPROVER"),
    ).resolves.toEqual({ unitId: "unit-faculty-it", role: "APPROVER" })
    expect(prisma.announcementUnitMember.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        unitId: "unit-faculty-it",
        role: "APPROVER",
        isActive: true,
        unit: { isActive: true },
      },
      select: { unitId: true, role: true },
    })

    prisma.announcementUnitMember.findFirst.mockResolvedValueOnce(null)

    await expect(
      requireUnitMembership("user-1", "unit-faculty-it", "AUTHOR"),
    ).rejects.toThrow("Ban khong co tham quyen voi don vi ban hanh nay")
  })
})

describe("updateAnnouncementUnitAssignments", () => {
  it("locks before transaction-scoped validation and replacing current assignments", async () => {
    const result = await updateAnnouncementUnitAssignments({
      userId: "user-1",
      assignments: [
        { unitId: "unit-faculty-it", role: "AUTHOR" },
        { unitId: "unit-student-affairs", role: "APPROVER" },
      ],
    })

    expect(result).toEqual({ success: true, data: { userId: "user-1" } })
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
    expect(tx.$executeRaw.mock.calls[0]?.[0]?.join("")).toBe(
      "SELECT pg_advisory_xact_lock(hashtext())",
    )
    expect(tx.$executeRaw.mock.calls[0]?.[1]).toBe(
      "announcement-unit-assignments:user-1",
    )
    expect(tx.userProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      select: { userId: true, deletedAt: true },
    })
    expect(tx.organizationUnit.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["unit-faculty-it", "unit-student-affairs"] },
        isActive: true,
      },
      select: { id: true },
    })
    expect(tx.announcementUnitMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
    expect(tx.announcementUnitMember.createMany).toHaveBeenCalledWith({
      data: [
        {
          unitId: "unit-faculty-it",
          userId: "user-1",
          role: "AUTHOR",
          isActive: true,
        },
        {
          unitId: "unit-student-affairs",
          userId: "user-1",
          role: "APPROVER",
          isActive: true,
        },
      ],
    })
    const lockOrder = tx.$executeRaw.mock.invocationCallOrder[0]!
    const deleteOrder = tx.announcementUnitMember.deleteMany.mock.invocationCallOrder[0]!
    expect(lockOrder).toBeLessThan(tx.userProfile.findUnique.mock.invocationCallOrder[0]!)
    expect(lockOrder).toBeLessThan(tx.organizationUnit.findMany.mock.invocationCallOrder[0]!)
    expect(lockOrder).toBeLessThan(deleteOrder)
    expect(tx.userProfile.findUnique.mock.invocationCallOrder[0]!).toBeLessThan(deleteOrder)
    expect(tx.organizationUnit.findMany.mock.invocationCallOrder[0]!).toBeLessThan(deleteOrder)
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled()
    expect(prisma.organizationUnit.findMany).not.toHaveBeenCalled()
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users/user-1/edit")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/announcements")
  })

  it("deletes all assignments without creating replacements for an empty list", async () => {
    const result = await updateAnnouncementUnitAssignments({
      userId: "user-1",
      assignments: [],
    })

    expect(result).toEqual({ success: true, data: { userId: "user-1" } })
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
    expect(tx.userProfile.findUnique).toHaveBeenCalled()
    expect(tx.organizationUnit.findMany).not.toHaveBeenCalled()
    expect(tx.announcementUnitMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
    expect(tx.announcementUnitMember.createMany).not.toHaveBeenCalled()
  })

  it("normalizes checkbox assignment values submitted as FormData", async () => {
    tx.organizationUnit.findMany.mockResolvedValueOnce([activeUnits[0]])
    const formData = new FormData()
    formData.set("userId", "user-1")
    formData.append(
      "assignments",
      JSON.stringify({ unitId: "unit-faculty-it", role: "APPROVER" }),
    )

    const result = await updateAnnouncementUnitAssignments(formData)

    expect(result).toEqual({ success: true, data: { userId: "user-1" } })
    expect(tx.announcementUnitMember.createMany).toHaveBeenCalledWith({
      data: [
        {
          unitId: "unit-faculty-it",
          userId: "user-1",
          role: "APPROVER",
          isActive: true,
        },
      ],
    })
  })

  it("returns the authorization guard error for a non-system-admin actor", async () => {
    requireSystemAdmin.mockRejectedValue(
      new ForbiddenError("Bạn không có quyền quản trị hệ thống"),
    )

    const result = await updateAnnouncementUnitAssignments({
      userId: "user-1",
      assignments: [],
    })

    expect(result).toEqual({
      success: false,
      error: "Bạn không có quyền quản trị hệ thống",
      code: "FORBIDDEN",
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it.each([
    ["a missing", null],
    ["a deleted", { userId: "user-1", deletedAt: new Date("2026-05-01") }],
  ])("returns NOT_FOUND for %s target user", async (_, targetUser) => {
    tx.userProfile.findUnique.mockResolvedValueOnce(targetUser)

    const result = await updateAnnouncementUnitAssignments({
      userId: "user-1",
      assignments: [],
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("NOT_FOUND")
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
    expect(tx.userProfile.findUnique).toHaveBeenCalled()
    expect(tx.announcementUnitMember.deleteMany).not.toHaveBeenCalled()
  })

  it.each(["missing", "inactive"])(
    "returns VALIDATION_ERROR when an assignment references a %s unit",
    async () => {
      tx.organizationUnit.findMany.mockResolvedValueOnce([])

      const result = await updateAnnouncementUnitAssignments({
        userId: "user-1",
        assignments: [{ unitId: "unit-faculty-it", role: "AUTHOR" }],
      })

      expect(result.success).toBe(false)
      expect(result.code).toBe("VALIDATION_ERROR")
      expect(tx.$executeRaw).toHaveBeenCalledTimes(1)
      expect(tx.organizationUnit.findMany).toHaveBeenCalled()
      expect(tx.announcementUnitMember.deleteMany).not.toHaveBeenCalled()
    },
  )

  it("rejects duplicate unit and role assignment pairs", async () => {
    const result = await updateAnnouncementUnitAssignments({
      userId: "user-1",
      assignments: [
        { unitId: "unit-faculty-it", role: "AUTHOR" },
        { unitId: "unit-faculty-it", role: "AUTHOR" },
      ],
    })

    expect(result.success).toBe(false)
    expect(result.code).toBe("VALIDATION_ERROR")
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it("returns UPDATE_FAILED when replacement persistence fails", async () => {
    prisma.$transaction.mockRejectedValueOnce(new Error("database unavailable"))

    const result = await updateAnnouncementUnitAssignments({
      userId: "user-1",
      assignments: [],
    })

    expect(result).toEqual({
      success: false,
      error: "database unavailable",
      code: "UPDATE_FAILED",
    })
  })
})
