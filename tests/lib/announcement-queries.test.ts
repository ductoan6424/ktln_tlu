import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  announcement: { findUnique: vi.fn() },
  faculty: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { getVisibleAnnouncementForViewer } from "@/lib/announcements/queries"

const baseAnnouncement = {
  id: "ann-1",
  title: "Thông báo CNTT",
  content: "Nội dung",
  audience: "ALL",
  targets: [{ type: "FACULTY", value: "fac-cntt" }],
  pinToTop: false,
  publishedAt: new Date("2026-05-23T08:00:00.000Z"),
  createdAt: new Date("2026-05-23T08:00:00.000Z"),
  status: "PUBLISHED",
  deletedAt: null,
  expiresAt: null,
  savedBy: [],
}

describe("announcement queries", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prisma.faculty.findMany.mockResolvedValue([{ id: "fac-cntt", code: "CNTT" }])
    prisma.course.findMany.mockResolvedValue([])
  })

  it("returns a deep-linked announcement only when it matches the viewer target context", async () => {
    prisma.announcement.findUnique.mockResolvedValue(baseAnnouncement)

    const visible = await getVisibleAnnouncementForViewer(
      "ann-1",
      "STUDENT",
      "u1",
      {
        facultyId: "fac-cntt",
        year: 38,
        courseIds: [],
        clubIds: [],
        groupIds: [],
      },
    )

    expect(visible?.id).toBe("ann-1")
    expect(visible?.scopeLabels).toEqual(["Khoa CNTT"])

    const hidden = await getVisibleAnnouncementForViewer(
      "ann-1",
      "STUDENT",
      "u1",
      {
        facultyId: "fac-kt",
        year: 38,
        courseIds: [],
        clubIds: [],
        groupIds: [],
      },
    )

    expect(hidden).toBeNull()
  })
})
