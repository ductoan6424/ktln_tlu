import { beforeEach, describe, expect, it, vi } from "vitest"

const createClient = vi.hoisted(() => vi.fn())
const prisma = vi.hoisted(() => ({
  userProfile: { findUnique: vi.fn() },
  schoolIdentity: { findUnique: vi.fn() },
  userContactEmail: { findUnique: vi.fn() },
  userSettings: { findUnique: vi.fn() },
  courseMember: { findMany: vi.fn() },
  course: { findMany: vi.fn() },
  clubMember: { findMany: vi.fn() },
  groupMember: { findMany: vi.fn() },
}))

vi.mock("@/lib/supabase/server", () => ({ createClient }))
vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { DEFAULT_USER_SETTINGS } from "@/lib/settings/user-settings"
import { loadCurrentUserContext } from "@/lib/auth/current-user-context"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("loadCurrentUserContext", () => {
  it("returns anonymous defaults without querying user-specific tables", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    })

    const context = await loadCurrentUserContext()

    expect(context.userId).toBeNull()
    expect(context.profile).toBeNull()
    expect(context.accountGateStatus).toBe("OK")
    expect(context.settings).toEqual(DEFAULT_USER_SETTINGS)
    expect(context.memberships).toEqual({
      courseIds: [],
      clubIds: [],
      groupIds: [],
    })
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled()
  })

  it("loads profile, gate data, settings, and memberships in one context", async () => {
    createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "user@example.com" } },
          error: null,
        }),
      },
    })
    prisma.userProfile.findUnique.mockResolvedValue({
      userId: "user-1",
      email: "user@example.com",
      displayName: "Nguyen Van A",
      avatarUrl: "https://cdn.example/avatar.png",
      major: "CNTT",
      role: "STUDENT",
      facultyId: "fac-1",
      year: 2024,
      deletedAt: null,
      schoolIdentity: { status: "ACTIVE" },
      contactEmail: {
        verifiedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      settings: {
        ...DEFAULT_USER_SETTINGS,
        compactMode: true,
      },
      courseMemberships: [{ courseId: "course-1" }],
      ownedCourses: [],
      clubMemberships: [{ clubId: "club-1" }],
      groupMemberships: [{ groupId: "group-1" }],
    })

    const context = await loadCurrentUserContext()

    expect(context.userId).toBe("user-1")
    expect(context.accountGateStatus).toBe("OK")
    expect(context.settings.compactMode).toBe(true)
    expect(context.memberships).toEqual({
      courseIds: ["course-1"],
      clubIds: ["club-1"],
      groupIds: ["group-1"],
    })
    expect(context.announcementViewerContext).toMatchObject({
      userId: "user-1",
      role: "STUDENT",
      facultyId: "fac-1",
      year: 2024,
      courseIds: ["course-1"],
      clubIds: ["club-1"],
      groupIds: ["group-1"],
    })
    expect(prisma.schoolIdentity.findUnique).not.toHaveBeenCalled()
    expect(prisma.userContactEmail.findUnique).not.toHaveBeenCalled()
    expect(prisma.userSettings.findUnique).not.toHaveBeenCalled()
    expect(prisma.courseMember.findMany).not.toHaveBeenCalled()
    expect(prisma.course.findMany).not.toHaveBeenCalled()
    expect(prisma.clubMember.findMany).not.toHaveBeenCalled()
    expect(prisma.groupMember.findMany).not.toHaveBeenCalled()
  })
})
