import { beforeEach, describe, expect, it, vi } from "vitest"

const getAuthorizationContext = vi.hoisted(() => vi.fn())
const getCommunityBySlugId = vi.hoisted(() => vi.fn())
const getViewerMembershipRole = vi.hoisted(() => vi.fn())
const revalidatePath = vi.hoisted(() => vi.fn())
const distributePostToFeeds = vi.hoisted(() => vi.fn())
const uploadCommunityAttachment = vi.hoisted(() => vi.fn())
const tx = vi.hoisted(() => ({
  post: { create: vi.fn() },
  postAttachment: { createMany: vi.fn() },
}))
const prisma = vi.hoisted(() => ({
  $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) =>
    callback(tx),
  ),
}))

vi.mock("@/lib/auth/authorization", () => ({ getAuthorizationContext }))
vi.mock("@/lib/communities/queries", () => ({
  getCommunityBySlugId,
  getViewerMembershipRole,
}))
vi.mock("@/lib/feed/fanout", () => ({
  distributePostToFeeds,
  getCelebrityAuthorIds: vi.fn(),
  getPersonalizedFeedPostIds: vi.fn(),
}))
vi.mock("@/lib/prisma/client", () => ({ prisma }))
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
vi.mock("@/lib/auth/post-permissions", () => ({
  canHidePost: vi.fn(() => true),
  resolveDeleteRole: vi.fn(),
}))
vi.mock("@/lib/feed/config", () => ({ getFeedFanoutConfig: vi.fn() }))
vi.mock("@/lib/polls/queries", () => ({
  getPollForPost: vi.fn(),
  getPollsForPosts: vi.fn(),
}))
vi.mock("@/lib/cloudinary/upload", () => ({
  UploadValidationError: class UploadValidationError extends Error {},
  uploadPostImage: vi.fn(),
  uploadCommunityAttachment,
}))
vi.mock("next/cache", () => ({ revalidatePath }))

import { createCommunityPost } from "@/actions/posts"

beforeEach(() => {
  vi.clearAllMocks()
  getAuthorizationContext.mockResolvedValue({
    baseRole: "STUDENT",
    profile: { userId: "user-1" },
  })
  getViewerMembershipRole.mockResolvedValue("MEMBER")
  tx.post.create.mockResolvedValue({
    id: "post-1",
    content: "Hello class",
    imageUrl: null,
    createdAt: new Date("2026-05-08T00:00:00.000Z"),
    authorId: "user-1",
  })
})

describe("createCommunityPost", () => {
  it("creates a pending post when the target requires approval", async () => {
    getCommunityBySlugId.mockResolvedValue({
      type: "GROUP",
      id: "group-1",
      shortId: "abc123",
      name: "Python Group",
      visibility: "PUBLIC",
      requirePostApproval: true,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: true,
      lecturerId: null,
    })

    const result = await createCommunityPost({
      type: "GROUP",
      slugId: "python-group-abc123",
      content: "Hello class",
    })

    expect(result.success).toBe(true)
    expect(tx.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorId: "user-1",
        groupId: "group-1",
        communityStatus: "PENDING_APPROVAL",
      }),
    })
    expect(distributePostToFeeds).not.toHaveBeenCalled()
  })

  it("uploads attachments for a published course post", async () => {
    getAuthorizationContext.mockResolvedValue({
      baseRole: "LECTURER",
      profile: { userId: "lecturer-1" },
    })
    getViewerMembershipRole.mockResolvedValue(null)
    getCommunityBySlugId.mockResolvedValue({
      type: "COURSE",
      id: "course-1",
      shortId: "course123",
      name: "Algorithms",
      visibility: null,
      requirePostApproval: false,
      chatEnabled: true,
      chatMode: "OPEN",
      memberInviteEnabled: false,
      lecturerId: "lecturer-1",
    })
    tx.post.create.mockResolvedValue({
      id: "post-1",
      content: "Slides for week 1",
      imageUrl: null,
      createdAt: new Date("2026-05-08T00:00:00.000Z"),
      authorId: "lecturer-1",
    })
    uploadCommunityAttachment.mockResolvedValue({
      url: "https://cdn.example.com/slides.pdf",
      type: "FILE",
      name: "slides.pdf",
      mimeType: "application/pdf",
      sizeBytes: 100,
    })

    const formData = new FormData()
    formData.set("type", "COURSE")
    formData.set("slugId", "algorithms-course123")
    formData.set("content", "Slides for week 1")
    formData.append(
      "attachments",
      new File(["test"], "slides.pdf", { type: "application/pdf" }),
    )

    const result = await createCommunityPost(formData)

    expect(result.success).toBe(true)
    expect(uploadCommunityAttachment).toHaveBeenCalledTimes(1)
    expect(tx.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        authorId: "lecturer-1",
        courseId: "course-1",
        communityStatus: "PUBLISHED",
      }),
    })
    expect(tx.postAttachment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          postId: "post-1",
          url: "https://cdn.example.com/slides.pdf",
          type: "FILE",
        }),
      ],
    })
    expect(distributePostToFeeds).toHaveBeenCalledWith({
      postId: "post-1",
      authorId: "lecturer-1",
      createdAt: new Date("2026-05-08T00:00:00.000Z"),
    })
    expect(revalidatePath).toHaveBeenCalledWith("/courses/algorithms-course123")
  })
})
