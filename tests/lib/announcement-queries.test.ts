import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  announcement: { findMany: vi.fn(), findUnique: vi.fn() },
  faculty: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import {
  getVisibleAnnouncementForViewer,
  listActiveAnnouncementsForViewer,
} from "@/lib/announcements/queries"

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

  it("uses frozen recipient evidence and published revision metadata for workflow notices", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      ...baseAnnouncement,
      publishedRevisionId: "rev-1",
      issuingUnit: { name: "Phong Dao tao" },
      category: "ACADEMIC",
      priority: "IMPORTANT",
      actionDeadlineAt: new Date("2026-06-01T10:00:00.000Z"),
      withdrawalReason: null,
      publishedRevision: {
        title: "Lich thi K38 da duyet",
        content: "Noi dung revision da phat hanh",
        audience: "STUDENTS",
        category: "ACADEMIC",
        priority: "IMPORTANT",
        requiresAcknowledgement: true,
        actionDeadlineAt: new Date("2026-06-01T10:00:00.000Z"),
        targets: [{ type: "COHORT", value: "38" }],
        attachments: [
          {
            id: "file-1",
            source: "UPLOAD",
            url: "https://cdn.example.com/huong-dan.pdf",
            name: "Huong dan.pdf",
            type: "FILE",
            mimeType: "application/pdf",
            sizeBytes: 2048,
          },
          {
            id: "link-1",
            source: "LINK",
            url: "https://portal.thanglong.edu.vn/dang-ky",
            name: "Cong dang ky",
            type: "LINK",
            mimeType: null,
            sizeBytes: null,
          },
        ],
      },
      recipients: [{ userId: "u1", seenAt: null, acknowledgedAt: null }],
      replacements: [],
    })

    const visible = await getVisibleAnnouncementForViewer("ann-1", "STUDENT", "u1", {
      facultyId: "fac-khac",
      year: 37,
      courseIds: [],
      clubIds: [],
      groupIds: [],
    })

    expect(visible).toMatchObject({
      title: "Lich thi K38 da duyet",
      issuingUnitName: "Phong Dao tao",
      category: "ACADEMIC",
      priority: "IMPORTANT",
      requiresAcknowledgement: true,
      acknowledgedAt: null,
      attachments: [
        { source: "UPLOAD", name: "Huong dan.pdf" },
        { source: "LINK", name: "Cong dang ky" },
      ],
    })

    prisma.announcement.findUnique.mockResolvedValueOnce({
      ...baseAnnouncement,
      publishedRevisionId: "rev-1",
      recipients: [],
    })
    const hidden = await getVisibleAnnouncementForViewer("ann-1", "STUDENT", "u2")
    expect(hidden).toBeNull()
  })

  it("shows a published workflow notice to a newly created matching student without recipient snapshot", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      ...baseAnnouncement,
      publishedRevisionId: "rev-1",
      issuingUnit: { name: "Phong Dao tao" },
      category: "ACADEMIC",
      priority: "IMPORTANT",
      actionDeadlineAt: null,
      withdrawalReason: null,
      publishedRevision: {
        title: "Thong bao K38",
        content: "Noi dung da phat hanh",
        audience: "STUDENTS",
        category: "ACADEMIC",
        priority: "IMPORTANT",
        requiresAcknowledgement: false,
        actionDeadlineAt: null,
        targets: [{ type: "COHORT", value: "38" }],
        attachments: [],
      },
      recipients: [],
      replacements: [],
    })

    const visible = await getVisibleAnnouncementForViewer("ann-1", "STUDENT", "u-new", {
      facultyId: null,
      year: 38,
      courseIds: [],
      clubIds: [],
      groupIds: [],
    })

    expect(visible).toMatchObject({
      id: "ann-1",
      title: "Thong bao K38",
      scopeLabels: ["K38"],
    })
  })

  it("keeps a workflow notice hidden from a new student outside the published revision targets", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      ...baseAnnouncement,
      publishedRevisionId: "rev-1",
      publishedRevision: {
        title: "Thong bao K38",
        content: "Noi dung da phat hanh",
        audience: "STUDENTS",
        category: "ACADEMIC",
        priority: "IMPORTANT",
        requiresAcknowledgement: false,
        actionDeadlineAt: null,
        targets: [{ type: "COHORT", value: "38" }],
        attachments: [],
      },
      recipients: [],
      replacements: [],
    })

    const hidden = await getVisibleAnnouncementForViewer("ann-1", "STUDENT", "u-new", {
      facultyId: null,
      year: 37,
      courseIds: [],
      clubIds: [],
      groupIds: [],
    })

    expect(hidden).toBeNull()
  })

  it("lists active workflow notices for new students by matching published revision targets", async () => {
    prisma.announcement.findMany.mockResolvedValue([
      {
        ...baseAnnouncement,
        publishedRevisionId: "rev-1",
        issuingUnit: { name: "Phong Dao tao" },
        category: "ACADEMIC",
        priority: "IMPORTANT",
        actionDeadlineAt: null,
        withdrawalReason: null,
        publishedRevision: {
          title: "Thong bao K38",
          content: "Noi dung da phat hanh",
          audience: "STUDENTS",
          category: "ACADEMIC",
          priority: "IMPORTANT",
          requiresAcknowledgement: false,
          actionDeadlineAt: null,
          targets: [{ type: "COHORT", value: "38" }],
          attachments: [],
        },
        recipients: [],
        replacements: [],
      },
    ])

    const results = await listActiveAnnouncementsForViewer("STUDENT", 10, "u-new", {
      facultyId: null,
      year: 38,
      courseIds: [],
      clubIds: [],
      groupIds: [],
    })

    expect(results.map((item) => item.id)).toEqual(["ann-1"])
    expect(results[0]?.scopeLabels).toEqual(["K38"])
  })

  it("hides an expired active workflow notice even before scheduled expiry processing runs", async () => {
    prisma.announcement.findUnique.mockResolvedValue({
      ...baseAnnouncement,
      publishedRevisionId: "rev-1",
      expiresAt: new Date("2026-05-20T00:00:00.000Z"),
      publishedRevision: {
        title: "Lich thi da het han",
        content: "Noi dung",
        audience: "STUDENTS",
        category: "ACADEMIC",
        priority: "NORMAL",
        requiresAcknowledgement: false,
        actionDeadlineAt: null,
        targets: [{ type: "COHORT", value: "38" }],
        attachments: [],
      },
      recipients: [{ userId: "u1", seenAt: null, acknowledgedAt: null }],
      replacements: [],
    })

    const result = await getVisibleAnnouncementForViewer("ann-1", "STUDENT", "u1")

    expect(result).toBeNull()
  })
})
