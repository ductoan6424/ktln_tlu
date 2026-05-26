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

  it("allows saving a workflow notice only from frozen recipient membership", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      id: "ann-workflow",
      deletedAt: null,
      status: "PUBLISHED",
      publishedRevisionId: "rev-1",
      audience: "ALL",
      expiresAt: null,
      targets: [{ type: "FACULTY", value: "fac-khac" }],
      recipients: [{ userId: "u1" }],
    })
    prisma.savedAnnouncement.findUnique.mockResolvedValue(null)

    const result = await toggleSaveAnnouncement("ann-workflow")

    expect(result).toEqual({ success: true, data: { saved: true } })
    expect(prisma.savedAnnouncement.create).toHaveBeenCalledWith({
      data: { userId: "u1", announcementId: "ann-workflow" },
    })
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

  it("keeps a delivered withdrawn workflow notice visible in saved items", async () => {
    const now = new Date("2026-05-23T08:00:00.000Z")
    prisma.savedAnnouncement.findMany.mockResolvedValue([
      {
        announcementId: "ann-withdrawn",
        savedAt: now,
        announcement: {
          title: "Noi dung nhap da thay doi",
          content: "Khong duoc dung noi dung mutable",
          status: "WITHDRAWN",
          publishedRevisionId: "rev-1",
          publishedAt: now,
          pinToTop: false,
          audience: "ALL",
          targets: [{ type: "FACULTY", value: "fac-khac" }],
          issuingUnit: { name: "Phong Dao tao" },
          withdrawalReason: "Lich thi duoc cap nhat",
          publishedRevision: {
            title: "Thong bao lich thi K38",
            content: "Noi dung da phat hanh",
            audience: "STUDENTS",
            priority: "IMPORTANT",
            targets: [{ type: "COHORT", value: "38" }],
          },
          recipients: [{ userId: "u1" }],
        },
      },
    ])

    const result = await loadSavedAnnouncements()

    expect(result.success).toBe(true)
    expect(result.data?.[0]).toMatchObject({
      announcementId: "ann-withdrawn",
      title: "Thong bao lich thi K38",
      content: "Noi dung da phat hanh",
      status: "WITHDRAWN",
      issuingUnitName: "Phong Dao tao",
      priority: "IMPORTANT",
      withdrawalReason: "Lich thi duoc cap nhat",
      scopeLabels: ["K38"],
    })
  })
})
