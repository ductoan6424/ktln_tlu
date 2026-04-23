import { describe, it, expect, vi, beforeEach } from "vitest"

const hasAdminPermissionMock = vi.hoisted(() => vi.fn())
const isClubAdminMock = vi.hoisted(() => vi.fn())
const isGroupAdminMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/auth/admin-permissions", () => ({
  hasAdminPermission: hasAdminPermissionMock,
}))
vi.mock("@/lib/auth/club-admin", () => ({
  isClubAdmin: isClubAdminMock,
}))
vi.mock("@/lib/auth/group-admin", () => ({
  isGroupAdmin: isGroupAdminMock,
}))

import {
  canDeletePost,
  canHidePost,
  resolveDeleteRole,
} from "@/lib/auth/post-permissions"

const basePost = { postId: "p1", authorId: "author", clubId: null, groupId: null }

describe("canDeletePost", () => {
  beforeEach(() => {
    hasAdminPermissionMock.mockResolvedValue(false)
    isClubAdminMock.mockResolvedValue(false)
    isGroupAdminMock.mockResolvedValue(false)
  })

  it("author → true", async () => {
    expect(await canDeletePost("author", basePost)).toBe(true)
  })
  it("admin có permission → true", async () => {
    hasAdminPermissionMock.mockResolvedValue(true)
    expect(await canDeletePost("u2", basePost)).toBe(true)
  })
  it("club admin trong club → true", async () => {
    isClubAdminMock.mockResolvedValue(true)
    expect(await canDeletePost("u2", { ...basePost, clubId: "c1" })).toBe(true)
  })
  it("club admin khác club → false", async () => {
    expect(await canDeletePost("u2", { ...basePost, clubId: "c1" })).toBe(false)
  })
  it("user thường → false", async () => {
    expect(await canDeletePost("u2", basePost)).toBe(false)
  })
})

describe("canHidePost", () => {
  it("author không được ẩn bài mình", () => {
    expect(canHidePost("author", basePost)).toBe(false)
  })
  it("non-author được ẩn", () => {
    expect(canHidePost("u2", basePost)).toBe(true)
  })
})

describe("resolveDeleteRole", () => {
  beforeEach(() => {
    hasAdminPermissionMock.mockResolvedValue(false)
    isClubAdminMock.mockResolvedValue(false)
    isGroupAdminMock.mockResolvedValue(false)
  })
  it("author → AUTHOR", async () => {
    expect(await resolveDeleteRole("author", basePost)).toBe("AUTHOR")
  })
  it("admin permission → ADMIN", async () => {
    hasAdminPermissionMock.mockResolvedValue(true)
    expect(await resolveDeleteRole("u2", basePost)).toBe("ADMIN")
  })
  it("club admin → CLUB_ADMIN", async () => {
    isClubAdminMock.mockResolvedValue(true)
    expect(await resolveDeleteRole("u2", { ...basePost, clubId: "c1" })).toBe("CLUB_ADMIN")
  })
  it("group admin → GROUP_ADMIN", async () => {
    isGroupAdminMock.mockResolvedValue(true)
    expect(await resolveDeleteRole("u2", { ...basePost, groupId: "g1" })).toBe("GROUP_ADMIN")
  })
  it("không đủ quyền → null", async () => {
    expect(await resolveDeleteRole("u2", basePost)).toBeNull()
  })
})
