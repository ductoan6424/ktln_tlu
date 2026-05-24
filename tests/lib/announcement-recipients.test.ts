import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  announcement: { findUnique: vi.fn() },
  userProfile: { findMany: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { resolveAnnouncementRecipients } from "@/lib/announcements/recipients"

beforeEach(() => {
  prisma.announcement.findUnique.mockReset()
  prisma.userProfile.findMany.mockReset()
})

describe("resolveAnnouncementRecipients", () => {
  it("falls back to legacy STUDENTS audience when there are no targets", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-1",
      audience: "STUDENTS",
      targets: [],
    })
    prisma.userProfile.findMany.mockResolvedValue([{ userId: "u1" }, { userId: "u2" }])

    const result = await resolveAnnouncementRecipients("ann-1")

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null, role: { in: ["STUDENT"] } },
      select: { userId: true },
      orderBy: { userId: "asc" },
    })
    expect(result.userIds).toEqual(["u1", "u2"])
  })

  it("builds an AND filter for role faculty and cohort targets", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-2",
      audience: "ALL",
      targets: [
        { type: "ROLE", value: "STUDENT" },
        { type: "FACULTY", value: "fac-cntt" },
        { type: "COHORT", value: "38" },
      ],
    })
    prisma.userProfile.findMany.mockResolvedValue([{ userId: "u-match" }])

    const result = await resolveAnnouncementRecipients("ann-2")

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        role: { in: ["STUDENT"] },
        facultyId: { in: ["fac-cntt"] },
        year: { in: [38] },
      },
      select: { userId: true },
      orderBy: { userId: "asc" },
    })
    expect(result.userIds).toEqual(["u-match"])
  })

  it("adds direct USER targets to resolved recipients without duplicates", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-3",
      audience: "ALL",
      targets: [
        { type: "ROLE", value: "STUDENT" },
        { type: "USER", value: "u-direct" },
        { type: "USER", value: "u1" },
      ],
    })
    prisma.userProfile.findMany.mockResolvedValue([{ userId: "u1" }])

    const result = await resolveAnnouncementRecipients("ann-3")

    expect(result.userIds).toEqual(["u1", "u-direct"])
  })

  it("filters through course, club, and group membership relations", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-4",
      audience: "ALL",
      targets: [
        { type: "COURSE", value: "course-1" },
        { type: "CLUB", value: "club-1" },
        { type: "GROUP", value: "group-1" },
      ],
    })
    prisma.userProfile.findMany.mockResolvedValue([{ userId: "u-member" }])

    await resolveAnnouncementRecipients("ann-4")

    expect(prisma.userProfile.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        courseMemberships: { some: { courseId: { in: ["course-1"] } } },
        clubMemberships: { some: { clubId: { in: ["club-1"] } } },
        groupMemberships: { some: { groupId: { in: ["group-1"] } } },
      },
      select: { userId: true },
      orderBy: { userId: "asc" },
    })
  })

  it("does not broaden delivery when a stored cohort target is invalid", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-invalid",
      audience: "ALL",
      targets: [{ type: "COHORT", value: "not-a-number" }],
    })
    prisma.userProfile.findMany.mockResolvedValue([{ userId: "u-should-not-receive" }])

    const result = await resolveAnnouncementRecipients("ann-invalid")

    expect(prisma.userProfile.findMany).not.toHaveBeenCalled()
    expect(result.userIds).toEqual([])
  })
})
