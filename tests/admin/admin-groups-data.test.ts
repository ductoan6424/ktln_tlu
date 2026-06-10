import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  group: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getAdminGroupDetail,
  getGroupsAdminModule,
} from "@/lib/admin/groups/groups-admin-data"

const groupRows = [
  {
    id: "group-1",
    shortId: "gr123",
    name: "Nhóm AI",
    slug: "nhom-ai",
    description: "Trao đổi học tập AI",
    visibility: "PUBLIC",
    communityVisibility: "PRIVATE",
    requirePostApproval: true,
    chatEnabled: true,
    chatMode: "ADMINS_ONLY",
    memberInviteEnabled: false,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    deletedAt: null,
    members: [
      {
        userId: "admin-1",
        groupId: "group-1",
        role: "ADMIN",
        joinedAt: new Date("2026-05-03T00:00:00.000Z"),
        user: {
          userId: "admin-1",
          displayName: "Quản trị nhóm",
          email: "admin@example.edu",
          avatarUrl: null,
          studentId: null,
          role: "LECTURER",
        },
      },
    ],
    _count: {
      members: 18,
      posts: 7,
    },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  prisma.group.findMany.mockResolvedValue(groupRows)
  prisma.group.findUnique.mockResolvedValue(groupRows[0])
})

describe("groups admin data", () => {
  it("builds the groups admin module from real groups", async () => {
    const adminModule = await getGroupsAdminModule({ query: "ai", tab: "private" })

    expect(prisma.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          communityVisibility: "PRIVATE",
          OR: expect.any(Array),
        }),
      }),
    )
    expect(adminModule.records).toEqual([
      expect.objectContaining({
        id: "group-1",
        title: "Nhóm AI",
        cells: expect.objectContaining({
          title: "Nhóm AI",
          privacy: "Riêng tư",
          members: "18",
          owner: "Quản trị nhóm",
        }),
      }),
    ])
    expect(adminModule.stats[0]).toEqual({ label: "Tổng nhóm", value: "1" })
  })

  it("loads a group detail with member roles and detail sections", async () => {
    const detail = await getAdminGroupDetail("group-1")

    expect(prisma.group.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "group-1" },
      }),
    )
    expect(detail?.group.name).toBe("Nhóm AI")
    expect(detail?.members).toEqual([
      expect.objectContaining({
        userId: "admin-1",
        role: "ADMIN",
        displayName: "Quản trị nhóm",
      }),
    ])
    expect(detail?.detailSections.some((section) => section.title === "Cài đặt nhóm")).toBe(true)
  })
})
