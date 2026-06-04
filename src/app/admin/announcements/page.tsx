import { requireAdminPermission } from "@/lib/auth/authorization"
import { listAdminAnnouncements } from "@/lib/announcements/queries"
import {
  listActiveAnnouncementUnitAssignmentsForUser,
  listActiveOrganizationUnits,
} from "@/lib/announcements/units"
import { prisma } from "@/lib/prisma/client"

import AnnouncementsClient from "./announcements-client"

export const dynamic = "force-dynamic"

export default async function AnnouncementsPage() {
  const actor = await requireAdminPermission("admin.announcements.manage")

  const [announcements, units, assignments, faculties, courses, cohorts] =
    await Promise.all([
      listAdminAnnouncements({ take: 50 }),
      listActiveOrganizationUnits(),
      listActiveAnnouncementUnitAssignmentsForUser(actor.profile.userId),
      prisma.faculty.findMany({
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      }),
      prisma.course.findMany({
        where: { deletedAt: null },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      }),
      prisma.userProfile.findMany({
        where: { year: { not: null } },
        distinct: ["year"],
        orderBy: { year: "desc" },
        select: { year: true },
      }),
    ])
  const authorUnitIds = new Set(
    assignments
      .filter((assignment) => assignment.role === "AUTHOR")
      .map((assignment) => assignment.unitId),
  )
  const approverUnitIds = assignments
    .filter((assignment) => assignment.role === "APPROVER")
    .map((assignment) => assignment.unitId)
  const authorUnits =
    actor.baseRole === "ADMIN"
      ? units
      : units.filter((unit) => authorUnitIds.has(unit.id))

  return (
    <AnnouncementsClient
      initialItems={announcements.items}
      initialTotal={announcements.total}
      authorUnits={authorUnits}
      approverUnitIds={approverUnitIds}
      isSystemAdmin={actor.baseRole === "ADMIN"}
      targetOptions={{
        faculties,
        courses,
        cohorts: cohorts
          .filter(
            (cohort): cohort is { year: number } =>
              cohort.year !== null && cohort.year <= 38,
          )
          .map((cohort) => ({
            value: String(cohort.year),
            label: `K${cohort.year}`,
          })),
      }}
    />
  )
}
