import type {
  AnnouncementApprovalStage,
  AnnouncementStatus,
  AnnouncementTargetType,
  OrganizationUnitType,
} from "@prisma/client"

export type AnnouncementWorkflowTarget = {
  type: AnnouncementTargetType
  value: string
}

export type AnnouncementUnitScope = {
  type: OrganizationUnitType
  facultyId: string | null
  clubId: string | null
  groupId: string | null
}

export type AnnouncementApprovalRouteInput = {
  unit: AnnouncementUnitScope
  targets: AnnouncementWorkflowTarget[]
  courseFacultyIds?: string[]
}

function isFacultyLocalScope({
  unit,
  targets,
  courseFacultyIds,
}: AnnouncementApprovalRouteInput): boolean {
  if (unit.type !== "FACULTY" || !unit.facultyId || targets.length === 0) {
    return false
  }

  if (targets.some((target) => ["CLUB", "GROUP", "USER"].includes(target.type))) {
    return false
  }

  const facultyTargets = targets.filter((target) => target.type === "FACULTY")
  if (facultyTargets.some((target) => target.value !== unit.facultyId)) {
    return false
  }

  const courseTargets = targets.filter((target) => target.type === "COURSE")
  const hasVerifiedCourses =
    courseTargets.length > 0 &&
    courseFacultyIds !== undefined &&
    courseFacultyIds.length === courseTargets.length &&
    courseFacultyIds.every((facultyId) => facultyId === unit.facultyId)

  if (courseTargets.length > 0 && !hasVerifiedCourses) {
    return false
  }

  return facultyTargets.length > 0 || hasVerifiedCourses
}

function isOrganizationLocalScope(
  unit: AnnouncementUnitScope,
  targets: AnnouncementWorkflowTarget[],
): boolean {
  if (unit.type !== "ORGANIZATION" || targets.length === 0) {
    return false
  }

  const isExactClubScope =
    unit.clubId !== null &&
    targets.every(
      (target) => target.type === "CLUB" && target.value === unit.clubId,
    )
  const isExactGroupScope =
    unit.groupId !== null &&
    targets.every(
      (target) => target.type === "GROUP" && target.value === unit.groupId,
    )

  return isExactClubScope || isExactGroupScope
}

export function getRequiredApprovalStages(
  input: AnnouncementApprovalRouteInput,
): AnnouncementApprovalStage[] {
  return isFacultyLocalScope(input) || isOrganizationLocalScope(input.unit, input.targets)
    ? ["UNIT"]
    : ["UNIT", "ADMIN"]
}

export function isEditableAnnouncementStatus(status: AnnouncementStatus): boolean {
  return status === "DRAFT" || status === "CHANGES_REQUESTED"
}

export function nextStatusAfterApproval(
  stages: AnnouncementApprovalStage[],
  approvedStage: AnnouncementApprovalStage,
): AnnouncementStatus {
  if (stages[0] !== "UNIT" || !stages.includes(approvedStage)) {
    throw new Error("Approval stage is not part of the required route")
  }

  return approvedStage === "UNIT" && stages.includes("ADMIN")
    ? "PENDING_ADMIN_REVIEW"
    : "APPROVED"
}
