import type { AdminStatItem } from "@/lib/admin/admin-types"
import { assertBaseRole, getBaseRoleLabel } from "@/lib/auth/base-role"
import { prisma } from "@/lib/prisma/client"
import type { Prisma } from "@prisma/client"

const MODERATION_HISTORY_LIMIT = 50

export interface ModerationAuthorSummary {
  userId: string
  name: string
  email: string
  role?: string
  href: string
}

export interface ModerationContextSummary {
  type: "GROUP" | "CLUB" | "COURSE"
  id: string
  name: string
}

export interface PendingModerationPost {
  id: string
  excerpt: string
  createdAt: string
  reviewReason: string | null
  author: ModerationAuthorSummary
  context: ModerationContextSummary | null
}

export interface ModerationReportItem {
  id: string
  targetType: "GROUP" | "CLUB" | "COURSE"
  targetId: string
  contentType: "POST" | "COMMENT"
  contentId: string
  reason: string
  note: string | null
  status: string
  createdAt: string
  resolvedAt: string | null
  resolution: string | null
  reporter: ModerationAuthorSummary
  reportedAuthor: ModerationAuthorSummary | null
  content: string | null
}

export interface ModerationHistoryItem {
  id: string
  source: "COMMUNITY" | "POST" | "ACCOUNT"
  action: string
  subject: string
  actorName: string
  reason: string | null
  createdAt: string
}

type AuthorInput = {
  userId: string
  displayName: string
  email: string
  role?: string | null
}

type PostContextInput = {
  group?: { id: string; name: string } | null
  club?: { id: string; name: string } | null
  course?: { id: string; name: string } | null
}

type ReportContentInput = {
  id: string
  content: string
  author: AuthorInput
}

export function excerpt(value: string, max = 100): string {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1).trimEnd()}…`
}

function authorSummary(author: AuthorInput): ModerationAuthorSummary {
  const summary: ModerationAuthorSummary = {
    userId: author.userId,
    name: author.displayName,
    email: author.email,
    href: `/admin/users/${author.userId}`,
  }

  if (author.role) {
    summary.role = getBaseRoleLabel(assertBaseRole(author.role))
  }

  return summary
}

function contextForPost(post: PostContextInput): ModerationContextSummary | null {
  if (post.group) {
    return { type: "GROUP", id: post.group.id, name: post.group.name }
  }

  if (post.club) {
    return { type: "CLUB", id: post.club.id, name: post.club.name }
  }

  if (post.course) {
    return { type: "COURSE", id: post.course.id, name: post.course.name }
  }

  return null
}

function buildActiveAccountLockWhere(now: Date): Prisma.UserAccountModerationWhereInput {
  return {
    releasedAt: null,
    OR: [{ status: "LOCKED" }, { status: "TEMP_LOCKED", lockedUntil: { gt: now } }],
  }
}

export async function getModerationOverview(now = new Date()): Promise<AdminStatItem[]> {
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [pendingPosts, openReports, resolvedReports, lockedUsers] = await Promise.all([
    prisma.post.count({
      where: { communityStatus: "PENDING_APPROVAL", deletedAt: null },
    }),
    prisma.communityReport.count({ where: { status: "OPEN" } }),
    prisma.communityReport.count({
      where: {
        status: { in: ["RESOLVED", "DISMISSED"] },
        resolvedAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.userAccountModeration.count({ where: buildActiveAccountLockWhere(now) }),
  ])

  return [
    { label: "Bài chờ duyệt", value: String(pendingPosts) },
    { label: "Báo cáo đang mở", value: String(openReports) },
    { label: "Đã xử lý 7 ngày", value: String(resolvedReports) },
    { label: "Tài khoản bị khóa", value: String(lockedUsers) },
  ]
}

export async function listPendingModerationPosts(): Promise<PendingModerationPost[]> {
  const posts = await prisma.post.findMany({
    where: { communityStatus: "PENDING_APPROVAL", deletedAt: null },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    select: {
      id: true,
      content: true,
      createdAt: true,
      reviewReason: true,
      author: { select: { userId: true, displayName: true, email: true, role: true } },
      group: { select: { id: true, name: true } },
      club: { select: { id: true, name: true } },
      course: { select: { id: true, name: true } },
    },
  })

  return posts.map((post) => ({
    id: post.id,
    excerpt: excerpt(post.content),
    createdAt: post.createdAt.toISOString(),
    reviewReason: post.reviewReason,
    author: authorSummary(post.author),
    context: contextForPost(post),
  }))
}

async function mapReports(statusWhere: object): Promise<ModerationReportItem[]> {
  const reports = await prisma.communityReport.findMany({
    where: statusWhere,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 50,
    include: {
      reporter: { select: { userId: true, displayName: true, email: true, role: true } },
      resolver: { select: { userId: true, displayName: true, email: true } },
    },
  })
  const postIds = reports
    .filter((report) => report.contentType === "POST")
    .map((report) => report.contentId)
  const commentIds = reports
    .filter((report) => report.contentType === "COMMENT")
    .map((report) => report.contentId)

  const [posts, comments] = await Promise.all([
    postIds.length
      ? prisma.post.findMany({
          where: { id: { in: postIds } },
          select: {
            id: true,
            content: true,
            author: { select: { userId: true, displayName: true, email: true } },
          },
        })
      : Promise.resolve([]),
    commentIds.length
      ? prisma.comment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            author: { select: { userId: true, displayName: true, email: true } },
          },
        })
      : Promise.resolve([]),
  ])
  const postsById = new Map(posts.map((post: ReportContentInput) => [post.id, post]))
  const commentsById = new Map(comments.map((comment: ReportContentInput) => [comment.id, comment]))

  return reports.map((report) => {
    const content =
      report.contentType === "POST"
        ? postsById.get(report.contentId)
        : commentsById.get(report.contentId)

    return {
      id: report.id,
      targetType: report.targetType,
      targetId: report.targetId,
      contentType: report.contentType,
      contentId: report.contentId,
      reason: report.reason,
      note: report.note,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
      resolution: report.resolution,
      reporter: authorSummary(report.reporter),
      reportedAuthor: content ? authorSummary(content.author) : null,
      content: content ? excerpt(content.content) : null,
    }
  })
}

export function listOpenCommunityReports(): Promise<ModerationReportItem[]> {
  return mapReports({ status: "OPEN" })
}

export function listResolvedCommunityReports(): Promise<ModerationReportItem[]> {
  return mapReports({ status: { in: ["RESOLVED", "DISMISSED"] } })
}

export async function listModerationHistory(): Promise<ModerationHistoryItem[]> {
  const [communityLogs, postLogs, accountLogs] = await Promise.all([
    prisma.communityModerationLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MODERATION_HISTORY_LIMIT,
      include: { actor: { select: { displayName: true } } },
    }),
    prisma.postModerationLog.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MODERATION_HISTORY_LIMIT,
      include: { actor: { select: { displayName: true } } },
    }),
    prisma.userAccountModeration.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: MODERATION_HISTORY_LIMIT,
      include: { creator: { select: { displayName: true } } },
    }),
  ])
  const history: ModerationHistoryItem[] = [
    ...communityLogs.map((log) => ({
      id: `community:${log.id}`,
      source: "COMMUNITY" as const,
      action: log.action,
      subject: log.subjectId ?? log.targetId,
      actorName: log.actor?.displayName ?? "Không xác định",
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    })),
    ...postLogs.map((log) => ({
      id: `post:${log.id}`,
      source: "POST" as const,
      action: log.action,
      subject: log.postId,
      actorName: log.actor?.displayName ?? "Không xác định",
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    })),
    ...accountLogs.map((log) => ({
      id: `account:${log.id}`,
      source: "ACCOUNT" as const,
      action: log.status,
      subject: log.userId,
      actorName: log.creator?.displayName ?? "Không xác định",
      reason: log.reason,
      createdAt: log.createdAt.toISOString(),
    })),
  ]

  return history
    .sort((left, right) => {
      const timeDiff = Date.parse(right.createdAt) - Date.parse(left.createdAt)
      if (timeDiff !== 0) return timeDiff
      return right.id.localeCompare(left.id)
    })
    .slice(0, MODERATION_HISTORY_LIMIT)
}
