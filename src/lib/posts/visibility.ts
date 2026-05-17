import { Prisma } from "@prisma/client"

export type VisiblePostWhereInput = {
  joinedGroupIds: string[]
  joinedClubIds: string[]
  joinedCourseIds: string[]
  hiddenIds: string[]
}

export function buildVisiblePostWhere({
  joinedGroupIds,
  joinedClubIds,
  joinedCourseIds,
  hiddenIds,
}: VisiblePostWhereInput): Prisma.PostWhereInput {
  return {
    visibility: "PUBLIC",
    deletedAt: null,
    communityStatus: "PUBLISHED",
    OR: [
      { groupId: null, clubId: null, courseId: null },
      ...(joinedGroupIds.length > 0 ? [{ groupId: { in: joinedGroupIds } }] : []),
      ...(joinedClubIds.length > 0 ? [{ clubId: { in: joinedClubIds } }] : []),
      ...(joinedCourseIds.length > 0 ? [{ courseId: { in: joinedCourseIds } }] : []),
    ],
    ...(hiddenIds.length > 0 ? { id: { notIn: hiddenIds } } : {}),
  }
}

export function buildVisiblePostSqlWhere({
  joinedGroupIds,
  joinedClubIds,
  joinedCourseIds,
  hiddenIds,
}: VisiblePostWhereInput): Prisma.Sql {
  const branches: Prisma.Sql[] = [
    Prisma.sql`(p.group_id IS NULL AND p.club_id IS NULL AND p.course_id IS NULL)`,
  ]

  if (joinedGroupIds.length > 0) {
    branches.push(Prisma.sql`p.group_id IN (${Prisma.join(joinedGroupIds)})`)
  }
  if (joinedClubIds.length > 0) {
    branches.push(Prisma.sql`p.club_id IN (${Prisma.join(joinedClubIds)})`)
  }
  if (joinedCourseIds.length > 0) {
    branches.push(Prisma.sql`p.course_id IN (${Prisma.join(joinedCourseIds)})`)
  }

  return Prisma.sql`
    p.visibility = 'PUBLIC'
    AND p.deleted_at IS NULL
    AND p.community_status = 'PUBLISHED'
    AND (${Prisma.join(branches, " OR ")})
    ${hiddenIds.length > 0 ? Prisma.sql`AND p.post_id NOT IN (${Prisma.join(hiddenIds)})` : Prisma.empty}
  `
}
