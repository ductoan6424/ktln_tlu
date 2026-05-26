import type {
  AnnouncementAudience,
  AnnouncementTargetType,
  Prisma,
  UserRole,
} from "@prisma/client"

import {
  isAnnouncementRoleTargetValue,
  normalizeAnnouncementTargets,
  parseAnnouncementCohortValue,
} from "@/lib/announcements/targeting"
import { prisma } from "@/lib/prisma/client"

function roleFilterForLegacyAudience(audience: AnnouncementAudience): UserRole[] | null {
  if (audience === "STUDENTS") return ["STUDENT"]
  if (audience === "FACULTY") return ["LECTURER"]
  return null
}

function valuesByType(
  targets: Array<{ type: AnnouncementTargetType; value: string }>,
  type: AnnouncementTargetType,
): string[] {
  return targets
    .filter((target) => target.type === type)
    .map((target) => target.value)
}

function uniqueUserIds(values: string[]): string[] {
  return Array.from(new Set(values))
}

export async function resolveRecipientIdsFromTargets(
  audience: AnnouncementAudience,
  rawTargets: Array<{ type: AnnouncementTargetType; value: string }>,
): Promise<{ userIds: string[] }> {
  const targets = normalizeAnnouncementTargets(rawTargets)
  const directUserIds = valuesByType(targets, "USER")
  const groupedTargets = targets.filter((target) => target.type !== "USER")
  const directOnly = () => ({ userIds: uniqueUserIds(directUserIds) })

  const where: Prisma.UserProfileWhereInput = { deletedAt: null }

  if (groupedTargets.length === 0) {
    const roleFilter = roleFilterForLegacyAudience(audience)
    if (roleFilter) where.role = { in: roleFilter }
  } else {
    const roleValues = valuesByType(groupedTargets, "ROLE")
    const roles = roleValues.filter(isAnnouncementRoleTargetValue)
    const facultyIds = valuesByType(groupedTargets, "FACULTY")
    const cohortValues = valuesByType(groupedTargets, "COHORT")
    const cohorts = cohortValues
      .map(parseAnnouncementCohortValue)
      .filter((value): value is number => value !== null)
    const courseIds = valuesByType(groupedTargets, "COURSE")
    const clubIds = valuesByType(groupedTargets, "CLUB")
    const groupIds = valuesByType(groupedTargets, "GROUP")

    if (roleValues.length !== roles.length || cohortValues.length !== cohorts.length) {
      return directOnly()
    }

    if (roles.length > 0) where.role = { in: roles }
    if (facultyIds.length > 0) where.facultyId = { in: facultyIds }
    if (cohorts.length > 0) where.year = { in: cohorts }
    if (courseIds.length > 0) {
      where.courseMemberships = { some: { courseId: { in: courseIds } } }
    }
    if (clubIds.length > 0) {
      where.clubMemberships = { some: { clubId: { in: clubIds } } }
    }
    if (groupIds.length > 0) {
      where.groupMemberships = { some: { groupId: { in: groupIds } } }
    }
  }

  const rows = await prisma.userProfile.findMany({
    where,
    select: { userId: true },
    orderBy: { userId: "asc" },
  })

  const userIds = new Set(rows.map((row) => row.userId))
  for (const userId of directUserIds) {
    userIds.add(userId)
  }

  return { userIds: Array.from(userIds) }
}

export async function resolveAnnouncementRecipients(
  announcementId: string,
): Promise<{ userIds: string[] }> {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: {
      audience: true,
      targets: { select: { type: true, value: true } },
    },
  })

  if (!announcement) return { userIds: [] }

  return resolveRecipientIdsFromTargets(announcement.audience, announcement.targets)
}

export async function resolveRevisionRecipients(
  revisionId: string,
): Promise<{ userIds: string[] }> {
  const revision = await prisma.announcementRevision.findUnique({
    where: { id: revisionId },
    select: {
      audience: true,
      targets: { select: { type: true, value: true } },
    },
  })

  if (!revision) return { userIds: [] }

  return resolveRecipientIdsFromTargets(revision.audience, revision.targets)
}
