import { describe, expect, it } from "vitest"

import { getCommunityPermissions } from "@/lib/communities/policy"
import type { CommunityContext } from "@/lib/communities/types"

const baseGroup: CommunityContext = {
  type: "GROUP",
  id: "group-1",
  shortId: "abc123",
  name: "Nhóm Python",
  visibility: "PUBLIC",
  requirePostApproval: false,
  chatEnabled: true,
  chatMode: "OPEN",
  memberInviteEnabled: true,
  lecturerId: null,
}

describe("getCommunityPermissions", () => {
  it("allows public group join immediately for non-member", () => {
    const result = getCommunityPermissions({
      viewerId: "user-1",
      baseRole: "STUDENT",
      target: baseGroup,
      membershipRole: null,
    })

    expect(result.joinMode).toBe("JOIN_NOW")
    expect(result.canViewPosts).toBe(false)
  })

  it("requires request for private club", () => {
    const result = getCommunityPermissions({
      viewerId: "user-1",
      baseRole: "STUDENT",
      target: { ...baseGroup, type: "CLUB", visibility: "PRIVATE" },
      membershipRole: null,
    })

    expect(result.joinMode).toBe("REQUEST")
  })

  it("requires request for course even with public basic info", () => {
    const result = getCommunityPermissions({
      viewerId: "student-1",
      baseRole: "STUDENT",
      target: {
        ...baseGroup,
        type: "COURSE",
        visibility: null,
        lecturerId: "lecturer-1",
      },
      membershipRole: null,
    })

    expect(result.joinMode).toBe("REQUEST")
    expect(result.canLeave).toBe(false)
  })

  it("treats course lecturer as manager", () => {
    const result = getCommunityPermissions({
      viewerId: "lecturer-1",
      baseRole: "LECTURER",
      target: {
        ...baseGroup,
        type: "COURSE",
        visibility: null,
        lecturerId: "lecturer-1",
      },
      membershipRole: null,
    })

    expect(result.canManage).toBe(true)
    expect(result.canApprovePost).toBe(true)
  })

  it("blocks member chat send in admins-only mode", () => {
    const result = getCommunityPermissions({
      viewerId: "member-1",
      baseRole: "STUDENT",
      target: { ...baseGroup, chatMode: "ADMINS_ONLY" },
      membershipRole: "MEMBER",
    })

    expect(result.canSendChatMessage).toBe(false)
  })
})
