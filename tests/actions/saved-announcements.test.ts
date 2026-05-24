import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  announcement: { findUnique: vi.fn() },
  savedAnnouncement: {
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  userProfile: { findUnique: vi.fn() },
  courseMember: { findMany: vi.fn() },
  clubMember: { findMany: vi.fn() },
  groupMember: { findMany: vi.fn() },
  faculty: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

import {
  loadSavedAnnouncements,
  toggleSaveAnnouncement,
} from "@/actions/saved-announcements"

function mockSession(userId = "u1") {
  createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  })
}

function mockViewerProfile() {
  prisma.userProfile.findUnique.mockResolvedValue({
    userId: "u1",
    role: "STUDENT",
    facultyId: "fac-cntt",
    year: 38,
  })
    prisma.courseMember.findMany.mockResolvedValue([])
    prisma.clubMember.findMany.mockResolvedValue([])
    prisma.groupMember.findMany.mockResolvedValue([])
  prisma.faculty.findMany.mockResolvedValue([{ id: "fac-cntt", code: "CNTT" }])
  prisma.course.findMany.mockResolvedValue([])
}

describe("saved announcements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession()
    mockViewerProfile()
  })

  it("does not allow saving an announcement outside the viewer target scope", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-hidden",
      deletedAt: null,
      status: "PUBLISHED",
      audience: "ALL",
      expiresAt: null,
      targets: [{ type: "FACULTY", value: "fac-kt" }],
    })

    const result = await toggleSaveAnnouncement("ann-hidden")

    expect(result.success).toBe(false)
    expect(result.code).toBe("NOT_FOUND")
    expect(prisma.savedAnnouncement.create).not.toHaveBeenCalled()
  })

  it("hides saved announcements that no longer match the viewer target scope", async () => {
    const now = new Date("2026-05-23T08:00:00.000Z")
    vi.setSystemTime(now)
    prisma.savedAnnouncement.findMany.mockResolvedValue([
      {
        announcementId: "ann-visible",
        savedAt: now,
        announcement: {
          title: "Thông báo CNTT",
          content: "Nội dung",
          publishedAt: now,
          pinToTop: false,
          audience: "ALL",
          targets: [{ type: "FACULTY", value: "fac-cntt" }],
        },
      },
      {
        announcementId: "ann-hidden",
        savedAt: now,
        announcement: {
          title: "Thông báo khoa khác",
          content: "Nội dung",
          publishedAt: now,
          pinToTop: false,
          audience: "ALL",
          targets: [{ type: "FACULTY", value: "fac-kt" }],
        },
      },
    ])

    const result = await loadSavedAnnouncements()

    expect(result.success).toBe(true)
    expect(result.data?.map((item) => item.announcementId)).toEqual(["ann-visible"])
    expect(result.data?.[0]?.scopeLabels).toEqual(["Khoa CNTT"])
    vi.useRealTimers()
  })
})
