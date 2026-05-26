import type {
  AnnouncementApprovalDecision,
  AnnouncementApprovalStage,
  AnnouncementAudience,
  AnnouncementAttachmentSource,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementTargetType,
  OrganizationUnitType,
  Prisma,
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
  issuingUnit: {
    id: string
    code: string
    name: string
    type: OrganizationUnitType
  } | null
  category: AnnouncementCategory
  priority: AnnouncementPriority
  pinToTop: boolean
  sentEmail: boolean
  requestEmailDelivery: boolean
  requiresAcknowledgement: boolean
  scheduledAt: string | null
  actionDeadlineAt: string | null
  activeRevisionId: string | null
  publishedRevisionId: string | null
  attachments: AnnouncementAttachmentDto[]
  activeRevision: AnnouncementActiveRevisionDto | null
  auditEvents: AnnouncementAuditDto[]
  recipientSummary: AnnouncementRecipientSummary | null
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

export type AnnouncementAttachmentDto = {
  id: string
  source: AnnouncementAttachmentSource
  url: string
  name: string
  type: string | null
  mimeType: string | null
  sizeBytes: number | null
}

export type AnnouncementApprovalDto = {
  id: string
  stage: AnnouncementApprovalStage
  decision: AnnouncementApprovalDecision
  comment: string | null
  createdAt: string
  reviewer: {
    userId: string
    displayName: string
  }
}

export type AnnouncementActiveRevisionDto = {
  id: string
  version: number
  title: string
  content: string
  submittedAt: string | null
  targets: AnnouncementTargetDto[]
  scopeLabels: string[]
  attachments: AnnouncementAttachmentDto[]
  approvals: AnnouncementApprovalDto[]
}

export type AnnouncementAuditDto = {
  id: string
  action: string
  actorName: string
  comment: string | null
  createdAt: string
}

export type AnnouncementRecipientSummary = {
  total: number
  notified: number
  emailSent: number
  seen: number
  acknowledged: number
}

export type AnnouncementFeedItem = {
  id: string
  title: string
  content: string
  status: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
  audience: AnnouncementAudience
  targets: AnnouncementTargetDto[]
  scopeLabels: string[]
  issuingUnitName: string | null
  category: AnnouncementCategory
  priority: AnnouncementPriority
  actionDeadlineAt: string | null
  requiresAcknowledgement: boolean
  seenAt: string | null
  acknowledgedAt: string | null
  attachments: AnnouncementAttachmentDto[]
  withdrawalReason: string | null
  replacementId: string | null
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

export function audiencesForViewer(
  role: ViewerRole | null,
): AnnouncementAudience[] {
  return audiencesForRole(role)
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

async function buildTargetLabelMaps(
  targets: AnnouncementTargetRow[],
): Promise<TargetLabelMaps> {
  const facultyIds = unique(
    targets
      .filter((target) => target.type === "FACULTY")
      .map((target) => target.value),
  )
  const courseIds = unique(
    targets
      .filter((target) => target.type === "COURSE")
      .map((target) => target.value),
  )

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
    faculties: new Map(
      faculties.map((faculty) => [faculty.id, `Khoa ${faculty.code}`]),
    ),
    courses: new Map(
      courses.map((course) => [course.id, `Lớp ${course.code}`]),
    ),
  }
}

function mapTargets(
  rows: AnnouncementTargetRow[],
  labelMaps: TargetLabelMaps,
): AnnouncementTargetDto[] {
  return rows.map((row) => {
    let label: string | null = null
    if (row.type === "FACULTY")
      label = labelMaps.faculties.get(row.value) ?? null
    if (row.type === "COURSE") label = labelMaps.courses.get(row.value) ?? null
    if (row.type === "COHORT") label = `K${row.value}`

    return {
      type: row.type,
      value: row.value,
      label,
    }
  })
}

function mapScopeLabels(
  targets: AnnouncementTargetDto[],
  audience: AnnouncementAudience,
) {
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

function shouldExposeDeliverySummary(status: AnnouncementStatus) {
  return (
    status === "PUBLISHED" || status === "WITHDRAWN" || status === "SUPERSEDED"
  )
}

function readAuditComment(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata))
    return null
  const comment = (metadata as { comment?: unknown }).comment
  return typeof comment === "string" ? comment : null
}

export async function getAnnouncementRecipientSummary(
  announcementId: string,
): Promise<AnnouncementRecipientSummary> {
  const [total, notified, emailSent, seen, acknowledged] = await Promise.all([
    prisma.announcementRecipient.count({ where: { announcementId } }),
    prisma.announcementRecipient.count({
      where: { announcementId, notificationDispatchedAt: { not: null } },
    }),
    prisma.announcementRecipient.count({
      where: { announcementId, emailSentAt: { not: null } },
    }),
    prisma.announcementRecipient.count({
      where: { announcementId, seenAt: { not: null } },
    }),
    prisma.announcementRecipient.count({
      where: { announcementId, acknowledgedAt: { not: null } },
    }),
  ])

  return { total, notified, emailSent, seen, acknowledged }
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
  const visibilityFilters: Prisma.AnnouncementWhereInput[] = [
    {
      publishedRevisionId: null,
      status: "PUBLISHED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  ]
  if (viewerId) {
    visibilityFilters.push({
      publishedRevisionId: { not: null },
      recipients: { some: { userId: viewerId } },
      OR: [
        {
          status: "PUBLISHED",
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
        { status: { in: ["WITHDRAWN", "SUPERSEDED"] } },
      ],
    })
  }

  const rows = await prisma.announcement.findMany({
    where: {
      deletedAt: null,
      OR: visibilityFilters,
    },
    include: {
      targets: { select: { type: true, value: true } },
      issuingUnit: { select: { name: true } },
      publishedRevision: {
        select: {
          title: true,
          content: true,
          audience: true,
          category: true,
          priority: true,
          requiresAcknowledgement: true,
          actionDeadlineAt: true,
          targets: { select: { type: true, value: true } },
          attachments: {
            select: {
              id: true,
              source: true,
              url: true,
              name: true,
              type: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
        },
      },
      replacements: {
        where: { status: "PUBLISHED" },
        select: { id: true },
        take: 1,
      },
      ...(viewerId
        ? {
            savedBy: { where: { userId: viewerId }, select: { userId: true } },
            recipients: {
              where: { userId: viewerId },
              select: { userId: true, seenAt: true, acknowledgedAt: true },
            },
          }
        : {}),
    },
    orderBy: [{ pinToTop: "desc" }, { publishedAt: "desc" }],
    take: candidateLimit,
  })

  const visibleRows = rows
    .filter((row) => {
      if (row.publishedRevisionId) {
        return Boolean(
          viewerId &&
            row.recipients.length > 0 &&
            (row.status !== "PUBLISHED" || !row.expiresAt || row.expiresAt > now),
        )
      }
      return (
        row.status === "PUBLISHED" &&
        (!row.expiresAt || row.expiresAt > now) &&
        matchesAnnouncementTargets(viewerContext, row.targets, row.audience)
      )
    })
    .slice(0, take)

  const labelMaps = await buildTargetLabelMaps(
    visibleRows.flatMap((row) => row.publishedRevision?.targets ?? row.targets),
  )

  return visibleRows.map((row) => {
    const revision = row.publishedRevision
    const targets = mapTargets(revision?.targets ?? row.targets, labelMaps)
    const recipient = row.recipients?.[0]
    return {
      id: row.id,
      title: revision?.title ?? row.title,
      content: revision?.content ?? row.content,
      status: row.status as "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED",
      audience: revision?.audience ?? row.audience,
      targets,
      scopeLabels: mapScopeLabels(targets, revision?.audience ?? row.audience),
      issuingUnitName: row.issuingUnit?.name ?? null,
      category: revision?.category ?? row.category,
      priority: revision?.priority ?? row.priority,
      actionDeadlineAt: revision?.actionDeadlineAt
        ? revision.actionDeadlineAt.toISOString()
        : null,
      requiresAcknowledgement: revision?.requiresAcknowledgement ?? false,
      seenAt: recipient?.seenAt ? recipient.seenAt.toISOString() : null,
      acknowledgedAt: recipient?.acknowledgedAt
        ? recipient.acknowledgedAt.toISOString()
        : null,
      attachments: revision?.attachments ?? [],
      withdrawalReason: row.withdrawalReason,
      replacementId: row.replacements?.[0]?.id ?? null,
      pinToTop: row.pinToTop,
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
      createdAt: row.createdAt.toISOString(),
      createdAtRelative: formatRelativeTime(row.publishedAt ?? row.createdAt),
      authorDisplayName: OFFICIAL_SCHOOL_DISPLAY_NAME,
      authorAvatarUrl: OFFICIAL_SCHOOL_AVATAR_URL,
      authorUserId: OFFICIAL_SCHOOL_AUTHOR_ID,
      isOfficial: true,
      isSaved: viewerId
        ? Array.isArray((row as { savedBy?: { userId: string }[] }).savedBy) &&
          ((row as { savedBy?: { userId: string }[] }).savedBy?.length ?? 0) > 0
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
      issuingUnit: { select: { name: true } },
      publishedRevision: {
        select: {
          title: true,
          content: true,
          audience: true,
          category: true,
          priority: true,
          requiresAcknowledgement: true,
          actionDeadlineAt: true,
          targets: { select: { type: true, value: true } },
          attachments: {
            select: {
              id: true,
              source: true,
              url: true,
              name: true,
              type: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
        },
      },
      replacements: {
        where: { status: "PUBLISHED" },
        select: { id: true },
        take: 1,
      },
      ...(viewerId
        ? {
            savedBy: { where: { userId: viewerId }, select: { userId: true } },
            recipients: {
              where: { userId: viewerId },
              select: { userId: true, seenAt: true, acknowledgedAt: true },
            },
          }
        : {}),
    },
  })

  if (!row || row.deletedAt) return null
  if (row.publishedRevisionId) {
    if (
      (row.status !== "PUBLISHED" &&
        row.status !== "WITHDRAWN" &&
        row.status !== "SUPERSEDED") ||
      !viewerId ||
      row.recipients.length === 0 ||
      (row.status === "PUBLISHED" &&
        Boolean(row.expiresAt && row.expiresAt <= new Date()))
    ) {
      return null
    }
  } else {
    if (row.status !== "PUBLISHED") return null
    if (row.expiresAt && row.expiresAt <= new Date()) return null
    if (!matchesAnnouncementTargets(viewerContext, row.targets, row.audience)) {
      return null
    }
  }

  const revision = row.publishedRevision
  const labelMaps = await buildTargetLabelMaps(revision?.targets ?? row.targets)
  const targets = mapTargets(revision?.targets ?? row.targets, labelMaps)
  const recipient = row.recipients?.[0]

  return {
    id: row.id,
    title: revision?.title ?? row.title,
    content: revision?.content ?? row.content,
    status: row.status as "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED",
    audience: revision?.audience ?? row.audience,
    targets,
    scopeLabels: mapScopeLabels(targets, revision?.audience ?? row.audience),
    issuingUnitName: row.issuingUnit?.name ?? null,
    category: revision?.category ?? row.category,
    priority: revision?.priority ?? row.priority,
    actionDeadlineAt: revision?.actionDeadlineAt
      ? revision.actionDeadlineAt.toISOString()
      : null,
    requiresAcknowledgement: revision?.requiresAcknowledgement ?? false,
    seenAt: recipient?.seenAt ? recipient.seenAt.toISOString() : null,
    acknowledgedAt: recipient?.acknowledgedAt
      ? recipient.acknowledgedAt.toISOString()
      : null,
    attachments: revision?.attachments ?? [],
    withdrawalReason: row.withdrawalReason,
    replacementId: row.replacements?.[0]?.id ?? null,
    pinToTop: row.pinToTop,
    publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
    createdAt: row.createdAt.toISOString(),
    createdAtRelative: formatRelativeTime(row.publishedAt ?? row.createdAt),
    authorDisplayName: OFFICIAL_SCHOOL_DISPLAY_NAME,
    authorAvatarUrl: OFFICIAL_SCHOOL_AVATAR_URL,
    authorUserId: OFFICIAL_SCHOOL_AUTHOR_ID,
    isOfficial: true,
    isSaved: viewerId
      ? Array.isArray((row as { savedBy?: { userId: string }[] }).savedBy) &&
        ((row as { savedBy?: { userId: string }[] }).savedBy?.length ?? 0) > 0
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
        issuingUnit: {
          select: { id: true, code: true, name: true, type: true },
        },
        attachments: {
          where: { revisionId: null },
          select: {
            id: true,
            source: true,
            url: true,
            name: true,
            type: true,
            mimeType: true,
            sizeBytes: true,
          },
        },
        activeRevision: {
          select: {
            id: true,
            version: true,
            title: true,
            content: true,
            submittedAt: true,
            targets: { select: { type: true, value: true } },
            attachments: {
              select: {
                id: true,
                source: true,
                url: true,
                name: true,
                type: true,
                mimeType: true,
                sizeBytes: true,
              },
            },
            approvals: {
              include: {
                reviewer: { select: { userId: true, displayName: true } },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        },
        auditEvents: {
          select: {
            id: true,
            action: true,
            metadata: true,
            createdAt: true,
            actor: { select: { displayName: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
      orderBy: [{ pinToTop: "desc" }, { createdAt: "desc" }],
      take,
      skip,
    }),
    prisma.announcement.count({ where }),
  ])

  const labelMaps = await buildTargetLabelMaps(
    rows.flatMap((row) => [
      ...row.targets,
      ...(row.activeRevision?.targets ?? []),
    ]),
  )

  const recipientSummaries = await Promise.all(
    rows.map((row) =>
      shouldExposeDeliverySummary(row.status)
        ? getAnnouncementRecipientSummary(row.id)
        : Promise.resolve(null),
    ),
  )

  const items: AnnouncementDto[] = rows.map((row, index) => {
    const targets = mapTargets(row.targets, labelMaps)
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      audience: row.audience,
      targets,
      scopeLabels: mapScopeLabels(targets, row.audience),
      status: row.status,
      issuingUnit: row.issuingUnit,
      category: row.category,
      priority: row.priority,
      pinToTop: row.pinToTop,
      sentEmail: row.sentEmail,
      requestEmailDelivery: row.requestEmailDelivery,
      requiresAcknowledgement: row.requiresAcknowledgement,
      scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
      actionDeadlineAt: row.actionDeadlineAt
        ? row.actionDeadlineAt.toISOString()
        : null,
      activeRevisionId: row.activeRevisionId,
      publishedRevisionId: row.publishedRevisionId,
      attachments: row.attachments,
      activeRevision: row.activeRevision
        ? (() => {
            const revisionTargets = mapTargets(
              row.activeRevision.targets,
              labelMaps,
            )
            return {
              id: row.activeRevision.id,
              version: row.activeRevision.version,
              title: row.activeRevision.title,
              content: row.activeRevision.content,
              submittedAt: row.activeRevision.submittedAt
                ? row.activeRevision.submittedAt.toISOString()
                : null,
              targets: revisionTargets,
              scopeLabels: mapScopeLabels(revisionTargets, row.audience),
              attachments: row.activeRevision.attachments,
              approvals: row.activeRevision.approvals.map((approval) => ({
                id: approval.id,
                stage: approval.stage,
                decision: approval.decision,
                comment: approval.comment,
                createdAt: approval.createdAt.toISOString(),
                reviewer: approval.reviewer,
              })),
            }
          })()
        : null,
      auditEvents: row.auditEvents.map((event) => ({
        id: event.id,
        action: event.action,
        actorName: event.actor?.displayName ?? "Hệ thống",
        comment: readAuditComment(event.metadata),
        createdAt: event.createdAt.toISOString(),
      })),
      recipientSummary: recipientSummaries[index] ?? null,
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

export async function getAnnouncementById(
  id: string,
): Promise<AnnouncementDto | null> {
  const row = await prisma.announcement.findUnique({
    where: { id },
    include: {
      targets: { select: { type: true, value: true } },
      author: {
        select: { userId: true, displayName: true, avatarUrl: true },
      },
      issuingUnit: {
        select: { id: true, code: true, name: true, type: true },
      },
      attachments: {
        where: { revisionId: null },
        select: {
          id: true,
          source: true,
          url: true,
          name: true,
          type: true,
          mimeType: true,
          sizeBytes: true,
        },
      },
      activeRevision: {
        select: {
          id: true,
          version: true,
          title: true,
          content: true,
          submittedAt: true,
          targets: { select: { type: true, value: true } },
          attachments: {
            select: {
              id: true,
              source: true,
              url: true,
              name: true,
              type: true,
              mimeType: true,
              sizeBytes: true,
            },
          },
          approvals: {
            include: {
              reviewer: { select: { userId: true, displayName: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      auditEvents: {
        select: {
          id: true,
          action: true,
          metadata: true,
          createdAt: true,
          actor: { select: { displayName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  })

  if (!row || row.deletedAt) return null

  const labelMaps = await buildTargetLabelMaps([
    ...row.targets,
    ...(row.activeRevision?.targets ?? []),
  ])
  const targets = mapTargets(row.targets, labelMaps)
  const recipientSummary = shouldExposeDeliverySummary(row.status)
    ? await getAnnouncementRecipientSummary(row.id)
    : null

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    audience: row.audience,
    targets,
    scopeLabels: mapScopeLabels(targets, row.audience),
    status: row.status,
    issuingUnit: row.issuingUnit,
    category: row.category,
    priority: row.priority,
    pinToTop: row.pinToTop,
    sentEmail: row.sentEmail,
    requestEmailDelivery: row.requestEmailDelivery,
    requiresAcknowledgement: row.requiresAcknowledgement,
    scheduledAt: row.scheduledAt ? row.scheduledAt.toISOString() : null,
    actionDeadlineAt: row.actionDeadlineAt
      ? row.actionDeadlineAt.toISOString()
      : null,
    activeRevisionId: row.activeRevisionId,
    publishedRevisionId: row.publishedRevisionId,
    attachments: row.attachments,
    activeRevision: row.activeRevision
      ? (() => {
          const revisionTargets = mapTargets(
            row.activeRevision.targets,
            labelMaps,
          )
          return {
            id: row.activeRevision.id,
            version: row.activeRevision.version,
            title: row.activeRevision.title,
            content: row.activeRevision.content,
            submittedAt: row.activeRevision.submittedAt
              ? row.activeRevision.submittedAt.toISOString()
              : null,
            targets: revisionTargets,
            scopeLabels: mapScopeLabels(revisionTargets, row.audience),
            attachments: row.activeRevision.attachments,
            approvals: row.activeRevision.approvals.map((approval) => ({
              id: approval.id,
              stage: approval.stage,
              decision: approval.decision,
              comment: approval.comment,
              createdAt: approval.createdAt.toISOString(),
              reviewer: approval.reviewer,
            })),
          }
        })()
      : null,
    auditEvents: row.auditEvents.map((event) => ({
      id: event.id,
      action: event.action,
      actorName: event.actor?.displayName ?? "Hệ thống",
      comment: readAuditComment(event.metadata),
      createdAt: event.createdAt.toISOString(),
    })),
    recipientSummary,
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

export async function listAnnouncementWorkQueue(params: {
  viewerId: string
  statuses: AnnouncementStatus[]
}) {
  const [approverMemberships, viewer] = await Promise.all([
    prisma.announcementUnitMember.findMany({
      where: {
        userId: params.viewerId,
        role: "APPROVER",
        isActive: true,
        unit: { isActive: true },
      },
      select: { unitId: true },
    }),
    prisma.userProfile.findUnique({
      where: { userId: params.viewerId, deletedAt: null },
      select: { role: true },
    }),
  ])

  const authorStatuses = params.statuses.filter(
    (status): status is "DRAFT" | "CHANGES_REQUESTED" =>
      status === "DRAFT" || status === "CHANGES_REQUESTED",
  )
  const unitStatuses = params.statuses.filter(
    (status): status is "PENDING_UNIT_REVIEW" =>
      status === "PENDING_UNIT_REVIEW",
  )
  const adminStatuses = params.statuses.filter(
    (status): status is "PENDING_ADMIN_REVIEW" =>
      status === "PENDING_ADMIN_REVIEW",
  )
  const filters: Array<Record<string, unknown>> = []

  if (authorStatuses.length > 0) {
    filters.push({
      authorId: params.viewerId,
      status: { in: authorStatuses },
    })
  }
  if (unitStatuses.length > 0 && approverMemberships.length > 0) {
    filters.push({
      issuingUnitId: { in: approverMemberships.map(({ unitId }) => unitId) },
      status: { in: unitStatuses },
    })
  }
  if (adminStatuses.length > 0 && viewer?.role === "ADMIN") {
    filters.push({ status: { in: adminStatuses } })
  }

  return prisma.announcement.findMany({
    where: {
      deletedAt: null,
      OR: filters,
    },
    include: {
      issuingUnit: true,
      activeRevision: {
        include: {
          approvals: true,
          attachments: true,
          targets: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  })
}

export async function getAnnouncementGovernanceDetail(id: string) {
  const announcement = await prisma.announcement.findUnique({
    where: { id },
    include: {
      issuingUnit: true,
      revisions: {
        include: {
          approvals: { include: { reviewer: true } },
          attachments: true,
          targets: true,
        },
        orderBy: { version: "desc" },
      },
      auditEvents: {
        include: { actor: true },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!announcement || announcement.deletedAt) return null

  return {
    ...announcement,
    recipientSummary: shouldExposeDeliverySummary(announcement.status)
      ? await getAnnouncementRecipientSummary(announcement.id)
      : null,
  }
}
