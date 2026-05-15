import type { AnnouncementAudience, AnnouncementStatus } from "@prisma/client"

import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_AUTHOR_ID,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { prisma } from "@/lib/prisma/client"
import { formatRelativeTime } from "@/utils/formatters"

export type AnnouncementDto = {
  id: string
  title: string
  content: string
  audience: AnnouncementAudience
  status: AnnouncementStatus
  pinToTop: boolean
  sentEmail: boolean
  publishedAt: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  createdAtRelative: string
  author: {
    userId: string
    displayName: string
    avatarUrl: string | null
  }
}

export type AnnouncementFeedItem = {
  id: string
  title: string
  content: string
  audience: AnnouncementAudience
  pinToTop: boolean
  publishedAt: string
  createdAt: string
  createdAtRelative: string
  authorDisplayName: string
  authorAvatarUrl: string
  authorUserId: string
  isOfficial: true
  isSaved: boolean
}

export const OFFICIAL_AUTHOR = {
  userId: OFFICIAL_SCHOOL_AUTHOR_ID,
  displayName: OFFICIAL_SCHOOL_DISPLAY_NAME,
  avatarUrl: OFFICIAL_SCHOOL_AVATAR_URL,
}

export type ViewerRole = "STUDENT" | "LECTURER" | "ADMIN"

function audiencesForViewer(role: ViewerRole | null): AnnouncementAudience[] {
  if (role === "LECTURER") return ["ALL", "FACULTY"]
  if (role === "ADMIN") return ["ALL", "STUDENTS", "FACULTY"]
  return ["ALL", "STUDENTS"]
}

export async function listActiveAnnouncementsForViewer(
  viewerRole: ViewerRole | null,
  take = 10,
  viewerId: string | null = null,
): Promise<AnnouncementFeedItem[]> {
  const now = new Date()
  const audiences = audiencesForViewer(viewerRole)

  const rows = await prisma.announcement.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      audience: { in: audiences },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: viewerId
      ? { savedBy: { where: { userId: viewerId }, select: { userId: true } } }
      : undefined,
    orderBy: [
      { pinToTop: "desc" },
      { publishedAt: "desc" },
    ],
    take,
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    audience: row.audience,
    pinToTop: row.pinToTop,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    createdAt: row.createdAt.toISOString(),
    createdAtRelative: formatRelativeTime(row.publishedAt ?? row.createdAt),
    authorDisplayName: OFFICIAL_SCHOOL_DISPLAY_NAME,
    authorAvatarUrl: OFFICIAL_SCHOOL_AVATAR_URL,
    authorUserId: OFFICIAL_SCHOOL_AUTHOR_ID,
    isOfficial: true,
    isSaved: viewerId
      ? (Array.isArray((row as { savedBy?: { userId: string }[] }).savedBy) &&
         ((row as { savedBy?: { userId: string }[] }).savedBy?.length ?? 0) > 0)
      : false,
  }))
}

export async function listAdminAnnouncements(params: {
  status?: AnnouncementStatus | "ALL"
  take?: number
  skip?: number
}): Promise<{ items: AnnouncementDto[]; total: number }> {
  const { status = "ALL", take = 20, skip = 0 } = params

  const where = {
    deletedAt: null,
    ...(status !== "ALL" ? { status } : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: {
        author: {
          select: { userId: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: [
        { pinToTop: "desc" },
        { createdAt: "desc" },
      ],
      take,
      skip,
    }),
    prisma.announcement.count({ where }),
  ])

  const items: AnnouncementDto[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    audience: row.audience,
    status: row.status,
    pinToTop: row.pinToTop,
    sentEmail: row.sentEmail,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdAtRelative: formatRelativeTime(row.createdAt),
    author: {
      userId: row.author.userId,
      displayName: row.author.displayName,
      avatarUrl: row.author.avatarUrl,
    },
  }))

  return { items, total }
}

export async function getAnnouncementById(id: string): Promise<AnnouncementDto | null> {
  const row = await prisma.announcement.findUnique({
    where: { id },
    include: {
      author: {
        select: { userId: true, displayName: true, avatarUrl: true },
      },
    },
  })

  if (!row || row.deletedAt) return null

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    audience: row.audience,
    status: row.status,
    pinToTop: row.pinToTop,
    sentEmail: row.sentEmail,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdAtRelative: formatRelativeTime(row.createdAt),
    author: {
      userId: row.author.userId,
      displayName: row.author.displayName,
      avatarUrl: row.author.avatarUrl,
    },
  }
}
