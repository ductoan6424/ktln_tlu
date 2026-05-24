import type {
  AnnouncementAudience,
  AnnouncementStatus,
  AnnouncementTargetType,
  UserRole,
} from "@prisma/client"

import {
  OFFICIAL_SCHOOL_AVATAR_URL,
  OFFICIAL_SCHOOL_AUTHOR_ID,
  OFFICIAL_SCHOOL_DISPLAY_NAME,
} from "@/lib/config/announcements"
import { prisma } from "@/lib/prisma/client"
import {
  audiencesForRole,
  getAnnouncementScopeLabels,
  matchesAnnouncementTargets,
  type AnnouncementViewerContext,
} from "@/lib/announcements/targeting"
import { formatRelativeTime } from "@/utils/formatters"

export type AnnouncementTargetDto = {
  type: AnnouncementTargetType
  value: string
  label: string | null
}

export type AnnouncementDto = {
  id: string
  title: string
  content: string
  audience: AnnouncementAudience
  targets: AnnouncementTargetDto[]
  scopeLabels: string[]
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
  targets: AnnouncementTargetDto[]
  scopeLabels: string[]
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

type AnnouncementTargetRow = {
  type: AnnouncementTargetType
  value: string
}

type TargetLabelMaps = {
  faculties: Map<string, string>
  courses: Map<string, string>
}

export const OFFICIAL_AUTHOR = {
  userId: OFFICIAL_SCHOOL_AUTHOR_ID,
  displayName: OFFICIAL_SCHOOL_DISPLAY_NAME,
  avatarUrl: OFFICIAL_SCHOOL_AVATAR_URL,
}

export type ViewerRole = UserRole

export function audiencesForViewer(role: ViewerRole | null): AnnouncementAudience[] {
  return audiencesForRole(role)
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

async function buildTargetLabelMaps(targets: AnnouncementTargetRow[]): Promise<TargetLabelMaps> {
  const facultyIds = unique(targets.filter((target) => target.type === "FACULTY").map((target) => target.value))
  const courseIds = unique(targets.filter((target) => target.type === "COURSE").map((target) => target.value))

  const [faculties, courses] = await Promise.all([
    facultyIds.length > 0
      ? prisma.faculty.findMany({
          where: { id: { in: facultyIds } },
          select: { id: true, code: true },
        })
      : Promise.resolve([]),
    courseIds.length > 0
      ? prisma.course.findMany({
          where: { id: { in: courseIds } },
          select: { id: true, code: true },
        })
      : Promise.resolve([]),
  ])

  return {
    faculties: new Map(faculties.map((faculty) => [faculty.id, `Khoa ${faculty.code}`])),
    courses: new Map(courses.map((course) => [course.id, `Lớp ${course.code}`])),
  }
}

function mapTargets(
  rows: AnnouncementTargetRow[],
  labelMaps: TargetLabelMaps,
): AnnouncementTargetDto[] {
  return rows.map((row) => {
    let label: string | null = null
    if (row.type === "FACULTY") label = labelMaps.faculties.get(row.value) ?? null
    if (row.type === "COURSE") label = labelMaps.courses.get(row.value) ?? null
    if (row.type === "COHORT") label = `K${row.value}`

    return {
      type: row.type,
      value: row.value,
      label,
    }
  })
}

function mapScopeLabels(targets: AnnouncementTargetDto[], audience: AnnouncementAudience) {
  return getAnnouncementScopeLabels(targets, audience)
}

function getDefaultViewerContext(
  viewerRole: ViewerRole | null,
  viewerId: string | null,
  override?: Partial<AnnouncementViewerContext>,
): AnnouncementViewerContext {
  return {
    userId: viewerId,
    role: viewerRole,
    facultyId: override?.facultyId ?? null,
    year: override?.year ?? null,
    courseIds: override?.courseIds ?? [],
    clubIds: override?.clubIds ?? [],
    groupIds: override?.groupIds ?? [],
  }
}

export async function listActiveAnnouncementsForViewer(
  viewerRole: ViewerRole | null,
  take = 10,
  viewerId: string | null = null,
  viewerContextOverride?: Partial<AnnouncementViewerContext>,
): Promise<AnnouncementFeedItem[]> {
  const now = new Date()
  const candidateLimit = Math.max(take * 10, 100)
  const viewerContext = getDefaultViewerContext(
    viewerRole,
    viewerId,
    viewerContextOverride,
  )

  const rows = await prisma.announcement.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: {
      targets: { select: { type: true, value: true } },
      ...(viewerId
        ? { savedBy: { where: { userId: viewerId }, select: { userId: true } } }
        : {}),
    },
    orderBy: [
      { pinToTop: "desc" },
      { publishedAt: "desc" },
    ],
    take: candidateLimit,
  })

  const visibleRows = rows
    .filter((row) =>
      matchesAnnouncementTargets(
        viewerContext,
        row.targets,
        row.audience,
      ),
    )
    .slice(0, take)

  const labelMaps = await buildTargetLabelMaps(
    visibleRows.flatMap((row) => row.targets),
  )

  return visibleRows.map((row) => {
    const targets = mapTargets(row.targets, labelMaps)
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      audience: row.audience,
      targets,
      scopeLabels: mapScopeLabels(targets, row.audience),
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
    }
  })
}

export async function getVisibleAnnouncementForViewer(
  id: string,
  viewerRole: ViewerRole | null,
  viewerId: string | null = null,
  viewerContextOverride?: Partial<AnnouncementViewerContext>,
): Promise<AnnouncementFeedItem | null> {
  const viewerContext = getDefaultViewerContext(
    viewerRole,
    viewerId,
    viewerContextOverride,
  )
  const row = await prisma.announcement.findUnique({
    where: { id },
    include: {
      targets: { select: { type: true, value: true } },
      ...(viewerId
        ? { savedBy: { where: { userId: viewerId }, select: { userId: true } } }
        : {}),
    },
  })

  if (!row || row.deletedAt || row.status !== "PUBLISHED") return null
  if (row.expiresAt && row.expiresAt <= new Date()) return null
  if (!matchesAnnouncementTargets(viewerContext, row.targets, row.audience)) {
    return null
  }

  const labelMaps = await buildTargetLabelMaps(row.targets)
  const targets = mapTargets(row.targets, labelMaps)

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    audience: row.audience,
    targets,
    scopeLabels: mapScopeLabels(targets, row.audience),
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
  }
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
        targets: { select: { type: true, value: true } },
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

  const labelMaps = await buildTargetLabelMaps(rows.flatMap((row) => row.targets))

  const items: AnnouncementDto[] = rows.map((row) => {
    const targets = mapTargets(row.targets, labelMaps)
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      audience: row.audience,
      targets,
      scopeLabels: mapScopeLabels(targets, row.audience),
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
  })

  return { items, total }
}

export async function getAnnouncementById(id: string): Promise<AnnouncementDto | null> {
  const row = await prisma.announcement.findUnique({
    where: { id },
    include: {
      targets: { select: { type: true, value: true } },
      author: {
        select: { userId: true, displayName: true, avatarUrl: true },
      },
    },
  })

  if (!row || row.deletedAt) return null

  const labelMaps = await buildTargetLabelMaps(row.targets)
  const targets = mapTargets(row.targets, labelMaps)

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    audience: row.audience,
    targets,
    scopeLabels: mapScopeLabels(targets, row.audience),
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
