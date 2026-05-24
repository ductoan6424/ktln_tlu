import { requireAdminPermission } from "@/lib/auth/authorization"
import { listAdminAnnouncements } from "@/lib/announcements/queries"
import { prisma } from "@/lib/prisma/client"

import AnnouncementsClient from "./announcements-client"

export const dynamic = "force-dynamic"

export default async function AnnouncementsPage() {
  await requireAdminPermission("admin.announcements.manage")

  const [announcements, faculties, courses, cohorts] = await Promise.all([
    listAdminAnnouncements({ take: 50 }),
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

  return (
    <AnnouncementsClient
      initialItems={announcements.items}
      initialTotal={announcements.total}
      targetOptions={{
        faculties,
        courses,
        cohorts: cohorts
          .filter((cohort): cohort is { year: number } => cohort.year !== null)
          .map((cohort) => ({
            value: String(cohort.year),
            label: `K${cohort.year}`,
          })),
      }}
    />
  )
}
