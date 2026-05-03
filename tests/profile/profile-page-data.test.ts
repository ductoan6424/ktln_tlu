import { beforeEach, describe, expect, it, vi } from "vitest"

const prisma = vi.hoisted(() => ({
  userProfile: {
    findFirst: vi.fn(),
  },
  friendship: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  clubMember: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  groupMember: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  post: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  poll: {
    findMany: vi.fn(),
  },
  follow: {
    findUnique: vi.fn(),
    count: vi.fn(),
  },
}))

vi.mock("@/lib/prisma/client", () => ({ prisma }))

import { getProfilePageData } from "@/app/(main)/profile/profile-page-data"

const SELF_USER_ID = "user-self"
const OTHER_USER_ID = "user-other"

const selfProfile = {
  userId: SELF_USER_ID,
  displayName: "Nguyen Van A",
  username: "vana",
  avatarUrl: "https://cdn.example/avatar-self.png",
  bio: "Sinh vien nam cuoi",
  studentId: "SV1001",
  role: "STUDENT",
  major: "Cong nghe thong tin",
  year: 4,
  createdAt: new Date("2025-01-01T00:00:00.000Z"),
}

const otherProfile = {
  userId: OTHER_USER_ID,
  displayName: "Tran Thi B",
  username: "thib",
  avatarUrl: "https://cdn.example/avatar-other.png",
  bio: "Dang hoc tai truong",
  studentId: "SV2002",
  role: "LECTURER",
  major: "Khoa hoc du lieu",
  year: 3,
  createdAt: new Date("2024-09-01T00:00:00.000Z"),
}

const clubMembership = {
  userId: SELF_USER_ID,
  clubId: "club-1",
  role: "ADMIN",
  joinedAt: new Date("2025-02-01T00:00:00.000Z"),
  club: {
    id: "club-1",
    name: "AI Club",
    slug: "ai-club",
    description: "Cong dong AI",
    coverUrl: "https://cdn.example/club-cover.png",
    logoUrl: "https://cdn.example/club-logo.png",
    category: "Academic",
    visibility: "PUBLIC",
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
  },
}

const groupMembership = {
  userId: SELF_USER_ID,
  groupId: "group-1",
  role: "MEMBER",
  joinedAt: new Date("2025-03-01T00:00:00.000Z"),
  group: {
    id: "group-1",
    name: "Data Study Group",
    slug: "data-study-group",
    description: "Nhom hoc du lieu",
    coverUrl: "https://cdn.example/group-cover.png",
    visibility: "PUBLIC",
    createdAt: new Date("2024-02-01T00:00:00.000Z"),
  },
}

const requesterFriendship = {
  requesterId: SELF_USER_ID,
  addresseeId: "friend-1",
  requester: {
    userId: SELF_USER_ID,
    displayName: "Nguyen Van A",
    avatarUrl: "https://cdn.example/avatar-self.png",
    username: "vana",
    studentId: "SV1001",
  },
  addressee: {
    userId: "friend-1",
    displayName: "Le Thi C",
    avatarUrl: "https://cdn.example/avatar-friend.png",
    username: "lethic",
    studentId: "SV3003",
  },
}

const addresseeFriendship = {
  requesterId: "friend-2",
  addresseeId: SELF_USER_ID,
  requester: {
    userId: "friend-2",
    displayName: "Pham Thi D",
    avatarUrl: "https://cdn.example/avatar-friend-2.png",
    username: "phamthid",
    studentId: "SV4004",
  },
  addressee: {
    userId: SELF_USER_ID,
    displayName: "Nguyen Van A",
    avatarUrl: "https://cdn.example/avatar-self.png",
    username: "vana",
    studentId: "SV1001",
  },
}

const selfPosts = [
  {
    id: "post-private",
    content: "Bai rieng tu",
    imageUrl: null,
    visibility: "PRIVATE",
    createdAt: new Date("2025-04-01T00:00:00.000Z"),
    club: null,
    group: null,
  },
  {
    id: "post-public",
    content: "Bai cong khai",
    imageUrl: "https://cdn.example/post.png",
    visibility: "PUBLIC",
    createdAt: new Date("2025-04-02T00:00:00.000Z"),
    club: {
      id: "club-1",
      name: "AI Club",
      slug: "ai-club",
    },
    group: {
      id: "group-1",
      name: "Data Study Group",
      slug: "data-study-group",
    },
  },
]

const publicPosts = [
  {
    id: "post-public-only",
    content: "Bai cong khai cua nguoi khac",
    imageUrl: null,
    visibility: "PUBLIC",
    createdAt: new Date("2025-04-03T00:00:00.000Z"),
    club: null,
    group: null,
  },
]

beforeEach(() => {
  prisma.userProfile.findFirst.mockReset()
  prisma.friendship.findMany.mockReset()
  prisma.friendship.count.mockReset()
  prisma.clubMember.findMany.mockReset()
  prisma.clubMember.count.mockReset()
  prisma.groupMember.findMany.mockReset()
  prisma.groupMember.count.mockReset()
  prisma.post.findMany.mockReset()
  prisma.post.count.mockReset()
  prisma.poll.findMany.mockReset()
  prisma.poll.findMany.mockResolvedValue([])
  prisma.follow.findUnique.mockReset()
  prisma.follow.count.mockReset()
  prisma.follow.findUnique.mockResolvedValue(null)
  prisma.follow.count.mockResolvedValue(0)
})

describe("getProfilePageData", () => {
  it("returns self profile data including non-public posts", async () => {
    prisma.userProfile.findFirst.mockResolvedValue(selfProfile)
    prisma.friendship.count.mockResolvedValue(2)
    prisma.friendship.findMany.mockResolvedValue([
      requesterFriendship,
      addresseeFriendship,
    ])
    prisma.clubMember.count.mockResolvedValue(1)
    prisma.clubMember.findMany.mockResolvedValue([clubMembership])
    prisma.groupMember.count.mockResolvedValue(1)
    prisma.groupMember.findMany.mockResolvedValue([groupMembership])
    prisma.post.count.mockResolvedValue(2)
    prisma.post.findMany.mockResolvedValue(selfPosts)

    const result = await getProfilePageData({
      viewerId: SELF_USER_ID,
      profileUserId: SELF_USER_ID,
    })

    expect(result).not.toBeNull()
    expect(result?.isOwnProfile).toBe(true)
    expect(result?.profile).toMatchObject({
      userId: SELF_USER_ID,
      displayName: "Nguyen Van A",
      username: "vana",
      avatarUrl: "https://cdn.example/avatar-self.png",
      bio: "Sinh vien nam cuoi",
      studentId: "SV1001",
      role: "STUDENT",
      major: "Cong nghe thong tin",
      year: 4,
      createdAt: "2025-01-01T00:00:00.000Z",
    })
    expect(result?.profile).not.toHaveProperty("email")
    expect(result?.stats).toEqual({
      postsCount: 2,
      clubsCount: 1,
      groupsCount: 1,
      connectionsCount: 2,
      followersCount: 0,
      followingCount: 0,
    })
    expect(result?.clubs).toEqual([
      {
        userId: SELF_USER_ID,
        clubId: "club-1",
        role: "ADMIN",
        joinedAt: "2025-02-01T00:00:00.000Z",
        club: {
          id: "club-1",
          name: "AI Club",
          slug: "ai-club",
          description: "Cong dong AI",
          coverUrl: "https://cdn.example/club-cover.png",
          logoUrl: "https://cdn.example/club-logo.png",
          category: "Academic",
          visibility: "PUBLIC",
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      },
    ])
    expect(result?.groups).toEqual([
      {
        userId: SELF_USER_ID,
        groupId: "group-1",
        role: "MEMBER",
        joinedAt: "2025-03-01T00:00:00.000Z",
        group: {
          id: "group-1",
          name: "Data Study Group",
          slug: "data-study-group",
          description: "Nhom hoc du lieu",
          coverUrl: "https://cdn.example/group-cover.png",
          visibility: "PUBLIC",
          createdAt: "2024-02-01T00:00:00.000Z",
        },
      },
    ])
    expect(result?.connectionsPreview).toEqual({
      totalCount: 2,
      items: [
        {
          userId: "friend-1",
          displayName: "Le Thi C",
          username: "lethic",
          avatarUrl: "https://cdn.example/avatar-friend.png",
          studentId: "SV3003",
        },
        {
          userId: "friend-2",
          displayName: "Pham Thi D",
          username: "phamthid",
          avatarUrl: "https://cdn.example/avatar-friend-2.png",
          studentId: "SV4004",
        },
      ],
    })
    expect(result?.posts).toEqual([
      {
        id: "post-private",
        content: "Bai rieng tu",
        imageUrl: null,
        visibility: "PRIVATE",
        createdAt: "2025-04-01T00:00:00.000Z",
        club: null,
        group: null,
        sharedPost: null,
        poll: null,
      },
      {
        id: "post-public",
        content: "Bai cong khai",
        imageUrl: "https://cdn.example/post.png",
        visibility: "PUBLIC",
        createdAt: "2025-04-02T00:00:00.000Z",
        club: {
          id: "club-1",
          name: "AI Club",
          slug: "ai-club",
        },
        group: {
          id: "group-1",
          name: "Data Study Group",
          slug: "data-study-group",
        },
        sharedPost: null,
        poll: null,
      },
    ])

    expect(prisma.userProfile.findFirst).toHaveBeenCalledWith({
      where: {
        userId: SELF_USER_ID,
        deletedAt: null,
      },
      select: expect.any(Object),
    })

    expect(prisma.friendship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "APPROVED",
          requester: {
            is: {
              deletedAt: null,
            },
          },
          addressee: {
            is: {
              deletedAt: null,
            },
          },
        }),
      })
    )

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          authorId: SELF_USER_ID,
          deletedAt: null,
        },
      })
    )
  })

  it("applies privacy rules when viewing another profile", async () => {
    prisma.userProfile.findFirst.mockResolvedValue(otherProfile)
    prisma.friendship.count.mockResolvedValue(0)
    prisma.friendship.findMany.mockResolvedValue([])
    prisma.clubMember.count.mockResolvedValue(0)
    prisma.clubMember.findMany.mockResolvedValue([])
    prisma.groupMember.count.mockResolvedValue(0)
    prisma.groupMember.findMany.mockResolvedValue([])
    prisma.post.count.mockResolvedValue(1)
    prisma.post.findMany.mockResolvedValue(publicPosts)

    const result = await getProfilePageData({
      viewerId: SELF_USER_ID,
      profileUserId: OTHER_USER_ID,
    })

    expect(result).not.toBeNull()
    expect(result?.isOwnProfile).toBe(false)
    expect(result?.profile).toMatchObject({
      userId: OTHER_USER_ID,
      displayName: "Tran Thi B",
      username: "thib",
      avatarUrl: "https://cdn.example/avatar-other.png",
      bio: "Dang hoc tai truong",
      studentId: "SV2002",
      role: "LECTURER",
      major: "Khoa hoc du lieu",
      year: 3,
      createdAt: "2024-09-01T00:00:00.000Z",
    })
    expect(result?.profile).not.toHaveProperty("email")
    expect(result?.posts).toEqual([
      {
        id: "post-public-only",
        content: "Bai cong khai cua nguoi khac",
        imageUrl: null,
        visibility: "PUBLIC",
        createdAt: "2025-04-03T00:00:00.000Z",
        club: null,
        group: null,
        sharedPost: null,
        poll: null,
      },
    ])

    expect(prisma.clubMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: OTHER_USER_ID,
          club: {
            is: {
              deletedAt: null,
            },
          },
        },
      })
    )

    expect(prisma.groupMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: OTHER_USER_ID,
          group: {
            is: {
              deletedAt: null,
            },
          },
        },
      })
    )

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          authorId: OTHER_USER_ID,
          deletedAt: null,
          visibility: "PUBLIC",
        },
      })
    )
  })

  it("returns null when the profile is missing or soft deleted", async () => {
    prisma.userProfile.findFirst.mockResolvedValue(null)

    const result = await getProfilePageData({
      viewerId: SELF_USER_ID,
      profileUserId: "missing-user",
    })

    expect(result).toBeNull()
    expect(prisma.friendship.count).not.toHaveBeenCalled()
    expect(prisma.clubMember.count).not.toHaveBeenCalled()
    expect(prisma.groupMember.count).not.toHaveBeenCalled()
    expect(prisma.post.count).not.toHaveBeenCalled()
  })
})
