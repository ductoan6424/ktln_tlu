import type {
  AnnouncementAudience,
  AnnouncementTargetType,
  UserRole,
} from "@prisma/client"

export type AnnouncementTargetInput = {
  type: AnnouncementTargetType
  value: string
  label?: string | null
}

export type AnnouncementViewerContext = {
  userId: string | null
  role: UserRole | null
  facultyId: string | null
  year: number | null
  courseIds: string[]
  clubIds: string[]
  groupIds: string[]
}

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  ADMIN: "Quản trị viên",
}

export const TLU_LATEST_COHORT = 38

const ROLE_TARGET_VALUES = new Set<UserRole>(["STUDENT", "LECTURER", "ADMIN"])

export function isAnnouncementRoleTargetValue(value: string): value is UserRole {
  return ROLE_TARGET_VALUES.has(value as UserRole)
}

export function parseAnnouncementCohortValue(value: string): number | null {
  if (!/^\d+$/.test(value)) return null
  const cohort = Number(value)
  if (!Number.isInteger(cohort) || cohort < 1 || cohort > TLU_LATEST_COHORT) {
    return null
  }
  return cohort
}

export function normalizeAnnouncementTargets(
  targets: AnnouncementTargetInput[] | null | undefined,
): AnnouncementTargetInput[] {
  const seen = new Set<string>()
  const normalized: AnnouncementTargetInput[] = []

  for (const target of targets ?? []) {
    const value = target.value.trim()
    if (!value) continue
    const key = `${target.type}:${value}`
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push({ type: target.type, value, label: target.label ?? null })
  }

  return normalized
}

export function audiencesForRole(role: UserRole | null): AnnouncementAudience[] {
  if (role === "LECTURER") return ["ALL", "FACULTY"]
  if (role === "ADMIN") return ["ALL", "STUDENTS", "FACULTY"]
  return ["ALL", "STUDENTS"]
}

function targetMatchesViewer(
  context: AnnouncementViewerContext,
  target: AnnouncementTargetInput,
): boolean {
  switch (target.type) {
    case "ROLE":
      return context.role === target.value
    case "FACULTY":
      return context.facultyId === target.value
    case "COHORT":
      return context.year !== null && String(context.year) === target.value
    case "COURSE":
      return context.courseIds.includes(target.value)
    case "CLUB":
      return context.clubIds.includes(target.value)
    case "GROUP":
      return context.groupIds.includes(target.value)
    case "USER":
      return context.userId === target.value
  }
}

export function matchesAnnouncementTargets(
  context: AnnouncementViewerContext,
  targets: AnnouncementTargetInput[] | null | undefined,
  legacyAudience: AnnouncementAudience,
): boolean {
  const normalized = normalizeAnnouncementTargets(targets)
  if (normalized.length === 0) {
    return audiencesForRole(context.role).includes(legacyAudience)
  }

  const directUserTargets = normalized.filter((target) => target.type === "USER")
  if (directUserTargets.some((target) => targetMatchesViewer(context, target))) {
    return true
  }

  const grouped = new Map<AnnouncementTargetType, AnnouncementTargetInput[]>()
  for (const target of normalized) {
    if (target.type === "USER") continue
    grouped.set(target.type, [...(grouped.get(target.type) ?? []), target])
  }

  if (grouped.size === 0) return false

  for (const targetsForType of grouped.values()) {
    if (!targetsForType.some((target) => targetMatchesViewer(context, target))) {
      return false
    }
  }

  return true
}

export function deriveLegacyAudienceFromTargets(
  targets: AnnouncementTargetInput[] | null | undefined,
): AnnouncementAudience {
  const normalized = normalizeAnnouncementTargets(targets)
  if (normalized.length === 1 && normalized[0]?.type === "ROLE") {
    if (normalized[0].value === "STUDENT") return "STUDENTS"
    if (normalized[0].value === "LECTURER") return "FACULTY"
  }
  return "ALL"
}

export function getAnnouncementScopeLabels(
  targets: AnnouncementTargetInput[] | null | undefined,
  legacyAudience: AnnouncementAudience,
): string[] {
  const normalized = normalizeAnnouncementTargets(targets)
  if (normalized.length === 0) {
    if (legacyAudience === "STUDENTS") return ["Sinh viên"]
    if (legacyAudience === "FACULTY") return ["Giảng viên"]
    return ["Toàn trường"]
  }

  const labels = normalized
    .filter((target) => target.type !== "USER")
    .map((target) => {
      if (target.label) return target.label
      if (target.type === "ROLE") return ROLE_LABELS[target.value as UserRole] ?? target.value
      if (target.type === "COHORT") return `K${target.value}`
      if (target.type === "FACULTY") return `Khoa ${target.value}`
      if (target.type === "COURSE") return `Lớp ${target.value}`
      if (target.type === "CLUB") return `CLB ${target.value}`
      if (target.type === "GROUP") return `Nhóm ${target.value}`
      return target.value
    })

  return labels.length > 0 ? labels : ["Người nhận riêng"]
}
