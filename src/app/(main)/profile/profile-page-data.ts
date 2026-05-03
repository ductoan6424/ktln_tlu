import { FriendshipStatus, MemberRole, PostVisibility, type UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma/client"
import {
  getFollowCounts,
  getFollowStatus,
  type FollowStatus,
} from "@/lib/follows/queries"
import { getPollsForPosts } from "@/lib/polls/queries"
import type { PollView } from "@/lib/polls/types"

export type ProfilePageParams = {
  viewerId: string
  profileUserId: string
}

export type ProfilePageData = {
  viewerId: string
  profileUserId: string
  isOwnProfile: boolean
  profile: ProfileSummary
  stats: ProfileStats
  clubs: ClubMembershipDto[]
  groups: GroupMembershipDto[]
  connectionsPreview: ConnectionsPreview
  posts: ProfilePostDto[]
  followStatus: FollowStatus | null
}

export type ProfileSummary = {
  userId: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  studentId: string | null
  role: UserRole
  major: string | null
  year: number | null
  createdAt: string
}

export type ProfileStats = {
  postsCount: number
  clubsCount: number
  groupsCount: number
  connectionsCount: number
  followersCount: number
  followingCount: number
}

export type ConnectionsPreview = {
  totalCount: number
  items: ConnectionPreviewItem[]
}

export type ConnectionPreviewItem = {
  userId: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  studentId: string | null
}

export type ClubMembershipDto = {
  userId: string
  clubId: string
  role: MemberRole
  joinedAt: string
  club: {
    id: string
    name: string
    slug: string
    description: string | null
    coverUrl: string | null
    logoUrl: string | null
    category: string | null
    visibility: PostVisibility
    createdAt: string
  }
}

export type GroupMembershipDto = {
  userId: string
  groupId: string
  role: MemberRole
  joinedAt: string
  group: {
    id: string
    name: string
    slug: string
    description: string | null
    coverUrl: string | null
    visibility: PostVisibility
    createdAt: string
  }
}

export type ProfilePostDto = {
  id: string
  content: string
  imageUrl: string | null
  visibility: PostVisibility
  createdAt: string
  club: {
    id: string
    name: string
    slug: string
  } | null
  group: {
    id: string
    name: string
    slug: string
  } | null
  sharedPost: {
    id: string
    content: string
    imageUrl: string | null
    authorDisplayName: string
    authorAvatarUrl: string | null
  } | null
  poll: PollView | null
}

type ProfileRecord = {
  userId: string
  displayName: string
  username: string | null
  avatarUrl: string | null
  bio: string | null
  studentId: string | null
  role: UserRole
  major: string | null
  year: number | null
  createdAt: Date
}

type FriendshipRecord = {
  requesterId: string
  addresseeId: string
  requester: {
    userId: string
    displayName: string
    username: string | null
    avatarUrl: string | null
    studentId: string | null
  }
  addressee: {
    userId: string
    displayName: string
    username: string | null
    avatarUrl: string | null
    studentId: string | null
  }
}

type ClubMembershipRecord = {
  userId: string
  clubId: string
  role: MemberRole
  joinedAt: Date
  club: {
    id: string
    name: string
    slug: string
    description: string | null
    coverUrl: string | null
    logoUrl: string | null
    category: string | null
    visibility: PostVisibility
    createdAt: Date
  }
}

type GroupMembershipRecord = {
  userId: string
  groupId: string
  role: MemberRole
  joinedAt: Date
  group: {
    id: string
    name: string
    slug: string
    description: string | null
    coverUrl: string | null
    visibility: PostVisibility
    createdAt: Date
  }
}

type PostRecord = {
  id: string
  content: string
  imageUrl: string | null
  visibility: PostVisibility
  createdAt: Date
  club: {
    id: string
    name: string
    slug: string
  } | null
  group: {
    id: string
    name: string
    slug: string
  } | null
  sharedPost: {
    id: string
    content: string
    imageUrl: string | null
    deletedAt: Date | null
    author: { displayName: string; avatarUrl: string | null }
  } | null
}

function toIsoString(date: Date) {
  return date.toISOString()
}

function mapProfile(profile: ProfileRecord): ProfileSummary {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    username: profile.username,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    studentId: profile.studentId,
    role: profile.role,
    major: profile.major,
    year: profile.year,
    createdAt: toIsoString(profile.createdAt),
  }
}

function mapConnection(friendship: FriendshipRecord, profileUserId: string): ConnectionPreviewItem {
  const connection = friendship.requesterId === profileUserId
    ? friendship.addressee
    : friendship.requester

  return {
    userId: connection.userId,
    displayName: connection.displayName,
    username: connection.username,
    avatarUrl: connection.avatarUrl,
    studentId: connection.studentId,
  }
}

function mapClubMembership(membership: ClubMembershipRecord): ClubMembershipDto {
  return {
    userId: membership.userId,
    clubId: membership.clubId,
    role: membership.role,
    joinedAt: toIsoString(membership.joinedAt),
    club: {
      id: membership.club.id,
      name: membership.club.name,
      slug: membership.club.slug,
      description: membership.club.description,
      coverUrl: membership.club.coverUrl,
      logoUrl: membership.club.logoUrl,
      category: membership.club.category,
      visibility: membership.club.visibility,
      createdAt: toIsoString(membership.club.createdAt),
    },
  }
}

function mapGroupMembership(membership: GroupMembershipRecord): GroupMembershipDto {
  return {
    userId: membership.userId,
    groupId: membership.groupId,
    role: membership.role,
    joinedAt: toIsoString(membership.joinedAt),
    group: {
      id: membership.group.id,
      name: membership.group.name,
      slug: membership.group.slug,
      description: membership.group.description,
      coverUrl: membership.group.coverUrl,
      visibility: membership.group.visibility,
      createdAt: toIsoString(membership.group.createdAt),
    },
  }
}

function mapPost(
  post: PostRecord,
  poll: PollView | null,
): ProfilePostDto {
  return {
    id: post.id,
    content: post.content,
    imageUrl: post.imageUrl,
    visibility: post.visibility,
    createdAt: toIsoString(post.createdAt),
    club: post.club
      ? {
        id: post.club.id,
        name: post.club.name,
        slug: post.club.slug,
      }
      : null,
    group: post.group
      ? {
        id: post.group.id,
        name: post.group.name,
        slug: post.group.slug,
      }
      : null,
    sharedPost: post.sharedPost && !post.sharedPost.deletedAt
      ? {
        id: post.sharedPost.id,
        content: post.sharedPost.content,
        imageUrl: post.sharedPost.imageUrl,
        authorDisplayName: post.sharedPost.author.displayName,
        authorAvatarUrl: post.sharedPost.author.avatarUrl,
      }
      : null,
    poll,
  }
}

export async function getProfilePageData({
  viewerId,
  profileUserId,
}: ProfilePageParams): Promise<ProfilePageData | null> {
  const profile = await prisma.userProfile.findFirst({
    where: {
      userId: profileUserId,
      deletedAt: null,
    },
    select: {
      userId: true,
      displayName: true,
      username: true,
      avatarUrl: true,
      bio: true,
      studentId: true,
      role: true,
      major: true,
      year: true,
      createdAt: true,
    },
  })

  if (!profile) {
    return null
  }

  const isOwnProfile = viewerId === profileUserId
  const postVisibilityFilter = isOwnProfile ? {} : { visibility: PostVisibility.PUBLIC }

  const [
    connectionsCount,
    connectionsPreview,
    clubsCount,
    clubs,
    groupsCount,
    groups,
    postsCount,
    posts,
    followCounts,
    followStatus,
  ] = await Promise.all([
    prisma.friendship.count({
      where: {
        status: FriendshipStatus.APPROVED,
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
        OR: [
          { requesterId: profileUserId },
          { addresseeId: profileUserId },
        ],
      },
    }),
    prisma.friendship.findMany({
      where: {
        status: FriendshipStatus.APPROVED,
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
        OR: [
          { requesterId: profileUserId },
          { addresseeId: profileUserId },
        ],
      },
      select: {
        requesterId: true,
        addresseeId: true,
        requester: {
          select: {
            userId: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            studentId: true,
          },
        },
        addressee: {
          select: {
            userId: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            studentId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
    prisma.clubMember.count({
      where: {
        userId: profileUserId,
        club: {
          is: {
            deletedAt: null,
          },
        },
      },
    }),
    prisma.clubMember.findMany({
      where: {
        userId: profileUserId,
        club: {
          is: {
            deletedAt: null,
          },
        },
      },
      select: {
        userId: true,
        clubId: true,
        role: true,
        joinedAt: true,
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            coverUrl: true,
            logoUrl: true,
            category: true,
            visibility: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    }),
    prisma.groupMember.count({
      where: {
        userId: profileUserId,
        group: {
          is: {
            deletedAt: null,
          },
        },
      },
    }),
    prisma.groupMember.findMany({
      where: {
        userId: profileUserId,
        group: {
          is: {
            deletedAt: null,
          },
        },
      },
      select: {
        userId: true,
        groupId: true,
        role: true,
        joinedAt: true,
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            coverUrl: true,
            visibility: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    }),
    prisma.post.count({
      where: {
        authorId: profileUserId,
        deletedAt: null,
        ...postVisibilityFilter,
      },
    }),
    prisma.post.findMany({
      where: {
        authorId: profileUserId,
        deletedAt: null,
        ...postVisibilityFilter,
      },
      select: {
        id: true,
        content: true,
        imageUrl: true,
        visibility: true,
        createdAt: true,
        club: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        group: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        sharedPost: {
          select: {
            id: true,
            content: true,
            imageUrl: true,
            deletedAt: true,
            author: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    }),
    getFollowCounts(profileUserId),
    isOwnProfile
      ? Promise.resolve(null)
      : getFollowStatus(viewerId, profileUserId),
  ])

  // Batch fetch polls cho các post hiển thị trên profile
  const pollMap = await getPollsForPosts(
    posts.map((post) => post.id),
    viewerId,
  )

  return {
    viewerId,
    profileUserId,
    isOwnProfile,
    profile: mapProfile(profile),
    stats: {
      postsCount,
      clubsCount,
      groupsCount,
      connectionsCount,
      followersCount: followCounts.followersCount,
      followingCount: followCounts.followingCount,
    },
    clubs: clubs.map(mapClubMembership),
    groups: groups.map(mapGroupMembership),
    connectionsPreview: {
      totalCount: connectionsCount,
      items: connectionsPreview.map((friendship) => mapConnection(friendship, profileUserId)),
    },
    posts: posts.map((post) => mapPost(post, pollMap.get(post.id) ?? null)),
    followStatus,
  }
}
