import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  club: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getAdminClubDetail,
  getClubsAdminModule,
} from "@/lib/admin/clubs/clubs-admin-data"

const clubRows = [
  {
    id: "club-1",
    shortId: "clb123",
    name: "CLB Tin học",
    slug: "clb-tin-hoc",
    description: "Sinh hoạt lập trình",
    category: "Công nghệ",
    visibility: "PUBLIC",
    communityVisibility: "PRIVATE",
    requirePostApproval: true,
    chatEnabled: true,
    chatMode: "ADMINS_ONLY",
    memberInviteEnabled: false,
    foundedAt: null,
    createdAt: new Date("2026-05-01T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    deletedAt: null,
    members: [
      {
        userId: "admin-1",
        clubId: "club-1",
        role: "ADMIN",
        joinedAt: new Date("2026-05-03T00:00:00.000Z"),
        user: {
          userId: "admin-1",
          displayName: "Quản trị CLB",
          email: "admin@example.edu",
          avatarUrl: null,
          studentId: null,
          role: "LECTURER",
        },
      },
    ],
    _count: {
      members: 42,
      posts: 11,
    },
  },
]

beforeEach(() => {
  vi.clearAllMocks()
  prisma.club.findMany.mockResolvedValue(clubRows)
  prisma.club.findUnique.mockResolvedValue(clubRows[0])
})

describe("clubs admin data", () => {
  it("builds the clubs admin module from real clubs", async () => {
    const adminModule = await getClubsAdminModule({ query: "tin", tab: "private" })

    expect(prisma.club.findMany).toHaveBeenCalledWith(
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
        id: "club-1",
        title: "CLB Tin học",
        cells: expect.objectContaining({
          title: "CLB Tin học",
          category: "Công nghệ",
          privacy: "Riêng tư",
          members: "42",
          owner: "Quản trị CLB",
        }),
      }),
    ])
    expect(adminModule.stats[0]).toEqual({ label: "Tổng CLB", value: "1" })
  })

  it("loads a club detail with member roles and detail sections", async () => {
    const detail = await getAdminClubDetail("club-1")

    expect(prisma.club.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "club-1" },
      }),
    )
    expect(detail?.club.name).toBe("CLB Tin học")
    expect(detail?.members).toEqual([
      expect.objectContaining({
        userId: "admin-1",
        role: "ADMIN",
        displayName: "Quản trị CLB",
      }),
    ])
    expect(detail?.detailSections.some((section) => section.title === "Cài đặt câu lạc bộ")).toBe(true)
  })
})
