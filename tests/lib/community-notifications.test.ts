import { beforeEach, describe, expect, it, vi } from "vitest"

const createNotification = vi.hoisted(() => vi.fn())

vi.mock("@/lib/notifications/service", () => ({
  createNotification,
}))

import * as communityDispatchers from "@/lib/notifications/dispatchers"

beforeEach(() => {
  vi.clearAllMocks()
})

describe("community notifications", () => {
  it("notifies invited user", async () => {
    await communityDispatchers.notifyCommunityInvite({
      recipientId: "user-2",
      actor: { userId: "admin-1", displayName: "Admin", avatarUrl: null },
      targetType: "CLUB",
      targetId: "club-1",
      targetName: "CLB Tin học",
      link: "/clubs/clb-tin-hoc-abc123",
    })

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "CLUB",
        recipientId: "user-2",
        groupKey: expect.stringContaining("club-1"),
        linkOverride: "/clubs/clb-tin-hoc-abc123",
      }),
      undefined,
    )
  })

  it("notifies a member when a community post is published", async () => {
    const notifyCommunityPostPublished = (
      communityDispatchers as typeof communityDispatchers & {
        notifyCommunityPostPublished: (payload: {
          recipientId: string
          actor: { userId: string; displayName: string; avatarUrl: string | null }
          targetType: "GROUP"
          targetId: string
          targetName: string
          link: string
          postId: string
          excerpt: string
        }) => Promise<void>
      }
    ).notifyCommunityPostPublished

    await notifyCommunityPostPublished({
      recipientId: "member-1",
      actor: { userId: "author-1", displayName: "Author", avatarUrl: null },
      targetType: "GROUP",
      targetId: "group-1",
      targetName: "Python Group",
      link: "/groups/python-group-abc123",
      postId: "post-1",
      excerpt: "New lesson note",
    })

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POST",
        recipientId: "member-1",
        groupKey: expect.stringContaining("POST_PUBLISHED"),
        postExcerpt: expect.stringContaining("Python Group"),
        linkOverride: "/groups/python-group-abc123",
        extraMetadata: expect.objectContaining({
          event: "POST_PUBLISHED",
          postId: "post-1",
        }),
      }),
      undefined,
    )
  })

  it("notifies a manager when a community post needs review", async () => {
    const notifyCommunityPostPendingReview = (
      communityDispatchers as typeof communityDispatchers & {
        notifyCommunityPostPendingReview: (payload: {
          recipientId: string
          actor: { userId: string; displayName: string; avatarUrl: string | null }
          targetType: "CLUB"
          targetId: string
          targetName: string
          link: string
          postId: string
          excerpt: string
        }) => Promise<void>
      }
    ).notifyCommunityPostPendingReview

    await notifyCommunityPostPendingReview({
      recipientId: "admin-1",
      actor: { userId: "author-1", displayName: "Author", avatarUrl: null },
      targetType: "CLUB",
      targetId: "club-1",
      targetName: "Robotics Club",
      link: "/clubs/robotics-club-abc123/manage?tab=pending-posts",
      postId: "post-1",
      excerpt: "Please review",
    })

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "POST",
        recipientId: "admin-1",
        groupKey: expect.stringContaining("POST_PENDING_REVIEW"),
        postExcerpt: expect.stringContaining("chờ duyệt"),
        linkOverride: "/clubs/robotics-club-abc123/manage?tab=pending-posts",
        extraMetadata: expect.objectContaining({
          event: "POST_PENDING_REVIEW",
          postId: "post-1",
        }),
      }),
      undefined,
    )
  })
})
