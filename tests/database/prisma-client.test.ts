import { Prisma } from "@prisma/client"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma/client"

describe("Prisma client", () => {
  beforeAll(async () => {
    expect(prisma).toBeDefined()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it("ket noi duoc Neon PostgreSQL", async () => {
    const result = await prisma.$queryRaw<[{ val: number }]>`SELECT 1 as val`
    expect(result[0].val).toBe(1)
  })

  it("database da co cac bang cho courses va admin RBAC", async () => {
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'courses',
          'course_members',
          'admin_permissions',
          'admin_roles',
          'admin_role_permissions',
          'user_admin_roles'
        )
    `

    const tableNames = tables.map((table) => table.tablename).sort()

    expect(tableNames).toEqual([
      "admin_permissions",
      "admin_role_permissions",
      "admin_roles",
      "course_members",
      "courses",
      "user_admin_roles",
    ])
  })

  it("co day du delegate cho schema hien tai", () => {
    const models = [
      "userProfile",
      "club",
      "group",
      "clubMember",
      "groupMember",
      "course",
      "courseMember",
      "post",
      "comment",
      "like",
      "conversation",
      "conversationParticipant",
      "message",
      "notification",
      "friendship",
      "emailVerification",
      "passwordReset",
      "adminPermission",
      "adminRole",
      "adminRolePermission",
      "userAdminRole",
    ]

    for (const model of models) {
      expect((prisma as unknown as Record<string, unknown>)[model]).toBeDefined()
    }
  })

  it("co relation metadata moi cho UserProfile", () => {
    const userProfileModel = Prisma.dmmf.datamodel.models.find((model) => model.name === "UserProfile")

    expect(userProfileModel).toBeDefined()

    const relationFields =
      userProfileModel?.fields
        .filter((field) => field.kind === "object")
        .map((field) => field.name)
        .sort() ?? []

    expect(relationFields).toEqual(
      expect.arrayContaining(["courseMemberships", "ownedCourses", "userAdminRoles"]),
    )
  })

  it("export dung TypeScript types cho UserProfile model", async () => {
    const user = await prisma.userProfile.findFirst({
      select: { userId: true, email: true, displayName: true, role: true },
    })

    expect(user).toBeDefined()
  })

  it("giu cung instance qua nhieu import", async () => {
    const mod = await import("@/lib/prisma/client")
    expect(prisma).toBe(mod.prisma)
  })
})
