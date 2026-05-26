import { ForbiddenError } from "@/lib/errors"
import { prisma } from "@/lib/prisma/client"

export type AnnouncementUnitAssignmentRole = "AUTHOR" | "APPROVER"

export async function listActiveOrganizationUnits() {
  return prisma.organizationUnit.findMany({
    where: { isActive: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      facultyId: true,
      clubId: true,
      groupId: true,
    },
  })
}

export async function listActiveAnnouncementUnitAssignmentsForUser(
  userId: string,
) {
  return prisma.announcementUnitMember.findMany({
    where: {
      userId,
      isActive: true,
      unit: { isActive: true },
    },
    select: { unitId: true, role: true },
  })
}

export async function requireUnitMembership(
  userId: string,
  unitId: string,
  role: AnnouncementUnitAssignmentRole,
) {
  const membership = await prisma.announcementUnitMember.findFirst({
    where: {
      userId,
      unitId,
      role,
      isActive: true,
      unit: { isActive: true },
    },
    select: { unitId: true, role: true },
  })

  if (!membership) {
    throw new ForbiddenError("Ban khong co tham quyen voi don vi ban hanh nay")
  }

  return membership
}
