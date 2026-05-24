import { describe, expect, it, vi } from "vitest"

import { validateAnnouncementTargetReferences } from "@/lib/announcements/target-validation"

function makeDb(overrides: Partial<Record<"faculty" | "course" | "club" | "group" | "userProfile", unknown>> = {}) {
  return {
    faculty: {
      findMany: vi.fn().mockResolvedValue([{ id: "fac-cntt" }]),
      ...((overrides.faculty as object) ?? {}),
    },
    course: {
      findMany: vi.fn().mockResolvedValue([{ id: "course-1" }]),
      ...((overrides.course as object) ?? {}),
    },
    club: {
      findMany: vi.fn().mockResolvedValue([{ id: "club-1" }]),
      ...((overrides.club as object) ?? {}),
    },
    group: {
      findMany: vi.fn().mockResolvedValue([{ id: "group-1" }]),
      ...((overrides.group as object) ?? {}),
    },
    userProfile: {
      findMany: vi.fn().mockResolvedValue([{ userId: "user-1" }]),
      ...((overrides.userProfile as object) ?? {}),
    },
  }
}

describe("validateAnnouncementTargetReferences", () => {
  it("accepts existing faculty course club group and user targets", async () => {
    const db = makeDb()

    await expect(
      validateAnnouncementTargetReferences(
        [
          { type: "FACULTY", value: "fac-cntt" },
          { type: "COURSE", value: "course-1" },
          { type: "CLUB", value: "club-1" },
          { type: "GROUP", value: "group-1" },
          { type: "USER", value: "user-1" },
        ],
        db,
      ),
    ).resolves.toBeNull()
  })

  it("returns a validation message when a referenced faculty is missing", async () => {
    const db = makeDb({
      faculty: { findMany: vi.fn().mockResolvedValue([]) },
    })

    await expect(
      validateAnnouncementTargetReferences(
        [{ type: "FACULTY", value: "fac-missing" }],
        db,
      ),
    ).resolves.toBe("Khoa nhận thông báo không tồn tại.")
  })
})
