"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma/client"
import { successResult, errorResult } from "@/types/api"
import type { ActionResult } from "@/types/api"
import {
  getAnnouncementScopeLabels,
  matchesAnnouncementTargets,
  type AnnouncementViewerContext,
} from "@/lib/announcements/targeting"
import { formatRelativeTime } from "@/utils/formatters"

export interface SavedAnnouncementItem {
  announcementId: string
  savedAt: string
  savedAtRelative: string
  title: string
  content: string
  status: "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED"
  issuingUnitName: string | null
  priority: "NORMAL" | "IMPORTANT" | "URGENT"
  withdrawalReason: string | null
  publishedAt: string
  pinToTop: boolean
  scopeLabels: string[]
}

type SavedAnnouncementTarget = {
  type: "ROLE" | "FACULTY" | "COHORT" | "COURSE" | "CLUB" | "GROUP" | "USER"
  value: string
}

type SavedAnnouncementVisibilityInput = {
  deletedAt?: Date | null
  status?: string
  expiresAt?: Date | null
  publishedRevisionId?: string | null
  recipients?: Array<{ userId: string }>
  audience: "ALL" | "STUDENTS" | "FACULTY"
  targets: SavedAnnouncementTarget[]
  publishedRevision?: {
    audience: "ALL" | "STUDENTS" | "FACULTY"
    targets: SavedAnnouncementTarget[]
  } | null
}

async function buildTargetLabelMaps(targets: SavedAnnouncementTarget[]) {
  const facultyIds = Array.from(
    new Set(targets.filter((target) => target.type === "FACULTY").map((target) => target.value)),
  )
  const courseIds = Array.from(
    new Set(targets.filter((target) => target.type === "COURSE").map((target) => target.value)),
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
    faculties: new Map(faculties.map((faculty) => [faculty.id, `Khoa ${faculty.code}`])),
    courses: new Map(courses.map((course) => [course.id, `Lớp ${course.code}`])),
  }
}

function withTargetLabels(
  targets: SavedAnnouncementTarget[],
  labelMaps: Awaited<ReturnType<typeof buildTargetLabelMaps>>,
) {
  return targets.map((target) => {
    if (target.type === "FACULTY") {
      return { ...target, label: labelMaps.faculties.get(target.value) ?? null }
    }
    if (target.type === "COURSE") {
      return { ...target, label: labelMaps.courses.get(target.value) ?? null }
    }
    if (target.type === "COHORT") {
      return { ...target, label: `K${target.value}` }
    }
    return { ...target, label: null }
  })
}

async function getViewerContext(userId: string): Promise<AnnouncementViewerContext | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: {
      role: true,
      facultyId: true,
      year: true,
    },
  })

  if (!profile) return null

  const [courseMemberships, clubMemberships, groupMemberships] = await Promise.all([
    prisma.courseMember.findMany({
      where: { userId },
      select: { courseId: true },
    }),
    prisma.clubMember.findMany({
      where: { userId },
      select: { clubId: true },
    }),
    prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    }),
  ])

  return {
    userId,
    role: profile.role,
    facultyId: profile.facultyId,
    year: profile.year,
    courseIds: courseMemberships.map((membership) => membership.courseId),
    clubIds: clubMemberships.map((membership) => membership.clubId),
    groupIds: groupMemberships.map((membership) => membership.groupId),
  }
}

function isAnnouncementVisibleToViewer(
  announcement: SavedAnnouncementVisibilityInput,
  viewerContext: AnnouncementViewerContext,
) {
  if (announcement.deletedAt) return false
  if (announcement.publishedRevisionId) {
    if (
      announcement.status !== "PUBLISHED" &&
      announcement.status !== "WITHDRAWN" &&
      announcement.status !== "SUPERSEDED"
    ) {
      return false
    }
    if (
      announcement.status === "PUBLISHED" &&
      announcement.expiresAt &&
      announcement.expiresAt <= new Date()
    ) {
      return false
    }
    const hasRecipient = Boolean(
      viewerContext.userId &&
        announcement.recipients?.some(
          (recipient) => recipient.userId === viewerContext.userId,
        ),
    )
    if (hasRecipient) return true
    if (announcement.status !== "PUBLISHED") return false
    return matchesAnnouncementTargets(
      viewerContext,
      announcement.publishedRevision?.targets ?? announcement.targets,
      announcement.publishedRevision?.audience ?? announcement.audience,
    )
  }
  if (announcement.status && announcement.status !== "PUBLISHED") return false
  if (announcement.expiresAt && announcement.expiresAt <= new Date()) return false
  return matchesAnnouncementTargets(
    viewerContext,
    announcement.targets,
    announcement.audience,
  )
}

export async function toggleSaveAnnouncement(
  announcementId: string,
): Promise<ActionResult<{ saved: boolean }>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id
  const viewerContext = await getViewerContext(userId)
  if (!viewerContext) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }

  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: {
      deletedAt: true,
      status: true,
      expiresAt: true,
      publishedRevisionId: true,
      audience: true,
      targets: { select: { type: true, value: true } },
      publishedRevision: {
        select: {
          audience: true,
          targets: { select: { type: true, value: true } },
        },
      },
      recipients: {
        where: { userId },
        select: { userId: true },
      },
    },
  })
  if (!announcement || !isAnnouncementVisibleToViewer(announcement, viewerContext)) {
    return errorResult("Thông báo không tồn tại.", "NOT_FOUND")
  }

  try {
    const existing = await prisma.savedAnnouncement.findUnique({
      where: { userId_announcementId: { userId, announcementId } },
    })

    if (existing) {
      await prisma.savedAnnouncement.delete({
        where: { userId_announcementId: { userId, announcementId } },
      })
      revalidatePath("/saved")
      return successResult({ saved: false })
    } else {
      await prisma.savedAnnouncement.create({ data: { userId, announcementId } })
      revalidatePath("/saved")
      return successResult({ saved: true })
    }
  } catch (error) {
    console.error("toggleSaveAnnouncement error:", error)
    return errorResult("Không thể lưu thông báo. Vui lòng thử lại.")
  }
}

export async function loadSavedAnnouncements(): Promise<ActionResult<SavedAnnouncementItem[]>> {
  const supabase = await createClient()
  const { data: userData, error: authError } = await supabase.auth.getUser()
  if (authError || !userData.user) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  const userId = userData.user.id
  const viewerContext = await getViewerContext(userId)
  if (!viewerContext) {
    return errorResult("Bạn cần đăng nhập để thực hiện", "UNAUTHORIZED")
  }
  try {
    const rows = await prisma.savedAnnouncement.findMany({
      where: {
        userId,
        announcement: {
          deletedAt: null,
          status: { in: ["PUBLISHED", "WITHDRAWN", "SUPERSEDED"] },
        },
      },
      include: {
        announcement: {
          select: {
            id: true,
            title: true,
            content: true,
            status: true,
            deletedAt: true,
            publishedRevisionId: true,
            priority: true,
            withdrawalReason: true,
            issuingUnit: { select: { name: true } },
            publishedAt: true,
            pinToTop: true,
            audience: true,
            expiresAt: true,
            targets: {
              select: { type: true, value: true },
            },
            publishedRevision: {
              select: {
                title: true,
                content: true,
                audience: true,
                priority: true,
                targets: { select: { type: true, value: true } },
              },
            },
            recipients: {
              where: { userId },
              select: { userId: true },
            },
          },
        },
      },
      orderBy: [
        { announcement: { pinToTop: "desc" } },
        { savedAt: "desc" },
      ],
    })

    const visibleRows = rows.filter((r) =>
      isAnnouncementVisibleToViewer(r.announcement, viewerContext),
    )
    const labelMaps = await buildTargetLabelMaps(
      visibleRows.flatMap(
        (row) => row.announcement.publishedRevision?.targets ?? row.announcement.targets,
      ),
    )

    const items: SavedAnnouncementItem[] = visibleRows
      .map((r) => {
        const revision = r.announcement.publishedRevision
        const audience = revision?.audience ?? r.announcement.audience
        const targets = revision?.targets ?? r.announcement.targets

        return {
          announcementId: r.announcementId,
          savedAt: r.savedAt.toISOString(),
          savedAtRelative: formatRelativeTime(r.savedAt),
          title: revision?.title ?? r.announcement.title,
          content: revision?.content ?? r.announcement.content,
          status:
            (r.announcement.status as "PUBLISHED" | "WITHDRAWN" | "SUPERSEDED") ??
            "PUBLISHED",
          issuingUnitName: r.announcement.issuingUnit?.name ?? null,
          priority: revision?.priority ?? r.announcement.priority ?? "NORMAL",
          withdrawalReason: r.announcement.withdrawalReason ?? null,
          publishedAt: r.announcement.publishedAt?.toISOString() ?? r.savedAt.toISOString(),
          pinToTop: r.announcement.pinToTop,
          scopeLabels: getAnnouncementScopeLabels(
            withTargetLabels(targets, labelMaps),
            audience,
          ),
        }
      })

    return successResult(items)
  } catch (error) {
    console.error("loadSavedAnnouncements error:", error)
    return errorResult("Không thể tải danh sách thông báo đã lưu.")
  }
}
