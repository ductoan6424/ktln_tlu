import { prisma } from "@/lib/prisma/client"
import { formatRelativeTime } from "@/utils/formatters"

type DateRangeKey = "7d" | "30d" | "90d" | "year"

export function resolveDateRange(range: DateRangeKey): { from: Date; previousFrom: Date } {
  const now = new Date()
  const from = new Date(now)
  switch (range) {
    case "7d":
      from.setDate(from.getDate() - 7)
      break
    case "30d":
      from.setDate(from.getDate() - 30)
      break
    case "90d":
      from.setDate(from.getDate() - 90)
      break
    case "year":
      from.setMonth(0, 1)
      from.setHours(0, 0, 0, 0)
      break
  }

  const duration = now.getTime() - from.getTime()
  const previousFrom = new Date(from.getTime() - duration)

  return { from, previousFrom }
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

export type DashboardStats = {
  totalUsers: number
  usersTrend: number
  totalPosts: number
  postsTrend: number
  eventsThisMonth: number
  eventsTrend: number
  pendingReports: number
  activityByDay: Array<{ day: string; label: string; value: number }>
  topPosts: Array<{
    id: string
    title: string
    authorName: string
    likes: number
    comments: number
    engagement: number
  }>
  recentActivities: Array<{
    id: string
    user: string
    action: string
    target: string
    timeRelative: string
    status: "info" | "success" | "warning" | "muted"
  }>
}

const DAY_LABELS_VI: Record<number, string> = {
  0: "CN",
  1: "T2",
  2: "T3",
  3: "T4",
  4: "T5",
  5: "T6",
  6: "T7",
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    totalUsers,
    usersLast7,
    usersPrev7,
    totalPosts,
    postsLast7,
    postsPrev7,
    eventsThisMonth,
    eventsLastMonth,
    pendingModerationLogs,
    recentPosts,
    topPosts,
  ] = await Promise.all([
    prisma.userProfile.count({ where: { deletedAt: null } }),
    prisma.userProfile.count({
      where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.userProfile.count({
      where: {
        deletedAt: null,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.post.count({
      where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.post.count({
      where: {
        deletedAt: null,
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
    prisma.post.count({
      where: { deletedAt: null, createdAt: { gte: startOfMonth } },
    }),
    prisma.post.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    prisma.postModerationLog.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.post.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: { select: { displayName: true } },
      },
    }),
    prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      take: 5,
      orderBy: [
        { likes: { _count: "desc" } },
        { comments: { _count: "desc" } },
      ],
      select: {
        id: true,
        content: true,
        author: { select: { displayName: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
  ])

  const activityByDay: DashboardStats["activityByDay"] = []
  for (let offset = 6; offset >= 0; offset--) {
    const dayStart = startOfDay(new Date(now.getTime() - offset * 24 * 60 * 60 * 1000))
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const count = await prisma.post.count({
      where: {
        deletedAt: null,
        createdAt: { gte: dayStart, lt: dayEnd },
      },
    })
    activityByDay.push({
      day: dayStart.toISOString(),
      label: DAY_LABELS_VI[dayStart.getDay()] ?? "",
      value: count,
    })
  }

  const topPostsMapped = topPosts.map((post) => {
    const title = post.content.slice(0, 80).trim() || "Bài viết không có tiêu đề"
    const likes = post._count.likes
    const comments = post._count.comments
    const engagement = likes + comments
    return {
      id: post.id,
      title,
      authorName: post.author.displayName,
      likes,
      comments,
      engagement,
    }
  })

  const maxEngagement = Math.max(1, ...topPostsMapped.map((p) => p.engagement))
  const topPostsNormalized = topPostsMapped.map((p) => ({
    ...p,
    engagement: Math.round((p.engagement / maxEngagement) * 100),
  }))

  const recentActivities: DashboardStats["recentActivities"] = recentPosts.map((post) => ({
    id: post.id,
    user: post.author.displayName,
    action: "đã đăng bài viết mới",
    target: post.content.slice(0, 60).trim() || "(không có nội dung)",
    timeRelative: formatRelativeTime(post.createdAt),
    status: "info" as const,
  }))

  return {
    totalUsers,
    usersTrend: percentChange(usersLast7, usersPrev7),
    totalPosts,
    postsTrend: percentChange(postsLast7, postsPrev7),
    eventsThisMonth,
    eventsTrend: percentChange(eventsThisMonth, eventsLastMonth),
    pendingReports: pendingModerationLogs,
    activityByDay,
    topPosts: topPostsNormalized,
    recentActivities,
  }
}

export type AnalyticsOverview = {
  range: DateRangeKey
  totalUsers: number
  newUsers: number
  newUsersTrend: number
  totalPosts: number
  newPosts: number
  newPostsTrend: number
  totalComments: number
  newComments: number
  totalLikes: number
  activeUsers: number
  activityByDay: Array<{ day: string; label: string; posts: number; users: number }>
  usersByRole: Array<{ role: string; count: number; percentage: number }>
  usersByMajor: Array<{ major: string; count: number; percentage: number }>
  topPosts: Array<{
    id: string
    title: string
    authorName: string
    likes: number
    comments: number
  }>
}

export async function getAnalyticsOverview(range: DateRangeKey): Promise<AnalyticsOverview> {
  const { from, previousFrom } = resolveDateRange(range)
  const now = new Date()

  const [
    totalUsers,
    newUsers,
    newUsersPrev,
    totalPosts,
    newPosts,
    newPostsPrev,
    totalComments,
    newComments,
    totalLikes,
    usersByRoleRaw,
    usersByMajorRaw,
    topPosts,
    activeUserSet,
  ] = await Promise.all([
    prisma.userProfile.count({ where: { deletedAt: null } }),
    prisma.userProfile.count({
      where: { deletedAt: null, createdAt: { gte: from } },
    }),
    prisma.userProfile.count({
      where: {
        deletedAt: null,
        createdAt: { gte: previousFrom, lt: from },
      },
    }),
    prisma.post.count({ where: { deletedAt: null } }),
    prisma.post.count({
      where: { deletedAt: null, createdAt: { gte: from } },
    }),
    prisma.post.count({
      where: {
        deletedAt: null,
        createdAt: { gte: previousFrom, lt: from },
      },
    }),
    prisma.comment.count({ where: { deletedAt: null } }),
    prisma.comment.count({
      where: { deletedAt: null, createdAt: { gte: from } },
    }),
    prisma.like.count(),
    prisma.userProfile.groupBy({
      by: ["role"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.userProfile.groupBy({
      by: ["major"],
      where: { deletedAt: null, major: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 6,
    }),
    prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gte: from } },
      take: 6,
      orderBy: [
        { likes: { _count: "desc" } },
        { comments: { _count: "desc" } },
      ],
      select: {
        id: true,
        content: true,
        author: { select: { displayName: true } },
        _count: { select: { likes: true, comments: true } },
      },
    }),
    prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gte: from } },
      distinct: ["authorId"],
      select: { authorId: true },
    }),
  ])

  // Activity theo ngày cho khoảng thời gian
  const daysWindow = Math.max(
    1,
    Math.min(30, Math.ceil((now.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))),
  )
  const step = daysWindow <= 14 ? 1 : Math.ceil(daysWindow / 14)
  const activityByDay: AnalyticsOverview["activityByDay"] = []
  for (let i = daysWindow - 1; i >= 0; i -= step) {
    const bucketStart = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000))
    const bucketEnd = new Date(bucketStart.getTime() + step * 24 * 60 * 60 * 1000)
    const [posts, users] = await Promise.all([
      prisma.post.count({
        where: {
          deletedAt: null,
          createdAt: { gte: bucketStart, lt: bucketEnd },
        },
      }),
      prisma.userProfile.count({
        where: {
          deletedAt: null,
          createdAt: { gte: bucketStart, lt: bucketEnd },
        },
      }),
    ])
    const label = `${bucketStart.getDate()}/${bucketStart.getMonth() + 1}`
    activityByDay.push({ day: bucketStart.toISOString(), label, posts, users })
  }

  const roleLabel: Record<string, string> = {
    STUDENT: "Sinh viên",
    LECTURER: "Giảng viên",
    ADMIN: "Quản trị",
  }
  const totalByRoleBase = Math.max(1, usersByRoleRaw.reduce((s, r) => s + r._count._all, 0))
  const usersByRole = usersByRoleRaw.map((r) => ({
    role: roleLabel[r.role] ?? r.role,
    count: r._count._all,
    percentage: Math.round((r._count._all / totalByRoleBase) * 100),
  }))

  const totalMajor = Math.max(1, usersByMajorRaw.reduce((s, r) => s + r._count._all, 0))
  const usersByMajor = usersByMajorRaw.map((r) => ({
    major: r.major ?? "Khác",
    count: r._count._all,
    percentage: Math.round((r._count._all / totalMajor) * 100),
  }))

  const topPostsDto = topPosts.map((post) => ({
    id: post.id,
    title: post.content.slice(0, 80).trim() || "Bài viết không có tiêu đề",
    authorName: post.author.displayName,
    likes: post._count.likes,
    comments: post._count.comments,
  }))

  return {
    range,
    totalUsers,
    newUsers,
    newUsersTrend: percentChange(newUsers, newUsersPrev),
    totalPosts,
    newPosts,
    newPostsTrend: percentChange(newPosts, newPostsPrev),
    totalComments,
    newComments,
    totalLikes,
    activeUsers: activeUserSet.length,
    activityByDay,
    usersByRole,
    usersByMajor,
    topPosts: topPostsDto,
  }
}
