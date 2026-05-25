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

  if (targets.some((target) => target.type === "USER")) {
    return false
  }

  const facultyTargets = targets.filter((target) => target.type === "FACULTY")
  if (facultyTargets.some((target) => target.value !== unit.facultyId)) {
    return false
  }

  if (facultyTargets.length > 0) {
    return true
  }

  const courseTargets = targets.filter((target) => target.type === "COURSE")
  return (
    courseTargets.length > 0 &&
    courseFacultyIds !== undefined &&
    courseFacultyIds.length === courseTargets.length &&
    courseFacultyIds.every((facultyId) => facultyId === unit.facultyId)
  )
}

function isOrganizationLocalScope(
  unit: AnnouncementUnitScope,
  targets: AnnouncementWorkflowTarget[],
): boolean {
  if (unit.type !== "ORGANIZATION" || targets.length === 0) {
    return false
  }

  if (targets.some((target) => target.type === "USER")) {
    return false
  }

  const clubTargets = targets.filter((target) => target.type === "CLUB")
  const groupTargets = targets.filter((target) => target.type === "GROUP")
  const isExactClubScope =
    unit.clubId !== null &&
    clubTargets.length > 0 &&
    clubTargets.every(
      (target) => target.type === "CLUB" && target.value === unit.clubId,
    )
  const isExactGroupScope =
    unit.groupId !== null &&
    groupTargets.length > 0 &&
    groupTargets.every(
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
  currentStatus: AnnouncementStatus,
): AnnouncementStatus {
  const isUnitOnlyRoute = stages.length === 1 && stages[0] === "UNIT"
  const isAdminRoute =
    stages.length === 2 && stages[0] === "UNIT" && stages[1] === "ADMIN"

  if (!isUnitOnlyRoute && !isAdminRoute) {
    throw new Error("Approval route is invalid")
  }

  if (approvedStage === "UNIT" && currentStatus === "PENDING_UNIT_REVIEW") {
    return isAdminRoute ? "PENDING_ADMIN_REVIEW" : "APPROVED"
  }

  if (
    isAdminRoute &&
    approvedStage === "ADMIN" &&
    currentStatus === "PENDING_ADMIN_REVIEW"
  ) {
    return "APPROVED"
  }

  throw new Error("Approval stage does not match current review status")
}
