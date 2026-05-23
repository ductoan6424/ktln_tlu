import {
  getAdminRoleDescription,
  getAdminRoleLabel,
} from "@/lib/admin/admin-role-labels"
import { assertBaseRole, getBaseRoleLabel, type BaseRole } from "@/lib/auth/base-role"
import { prisma } from "@/lib/prisma/client"
import { USERS_ADMIN_MODULE } from "@/lib/admin/modules/users"
import type { Prisma, UserAccountModerationStatus } from "@prisma/client"
import type {
  AdminDetailSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminStatItem,
} from "@/lib/admin/admin-types"

type UserCells = (typeof USERS_ADMIN_MODULE.records)[number]["cells"]

type AdminUserProfile = {
  userId: string
  email: string
  displayName: string
  role: BaseRole
  major: string | null
  studentId: string | null
  avatarUrl: string | null
  createdAt: Date
  deletedAt: Date | null
  emailVerifications: Array<{ id: string }>
  contactEmail: { email: string; verifiedAt: Date } | null
  contactEmailVerifications: Array<{ id: string; email: string; consumedAt: Date | null }>
  userAdminRoles: Array<{
    adminRole: {
      id: string
      code: string
      name: string
    }
  }>
  accountModerations: Array<{
    id: string
    status: UserAccountModerationStatus
    lockedUntil: Date | null
    releasedAt: Date | null
  }>
}

export type UserAccessEditorData = {
  user: {
    userId: string
    email: string
    displayName: string
    avatarUrl: string | null
    baseRole: BaseRole
    major: string | null
    studentId: string | null
    adminRoleIds: string[]
    adminRoleNames: string[]
  }
  adminRoles: Array<{
    id: string
    code: string
    name: string
    description: string | null
    isSystem: boolean
  }>
}

export type AdminUserAccountStatus = UserAccountModerationStatus

export type AdminUserAccountState = {
  status: AdminUserAccountStatus
  label: string
  lockedUntil: string | null
  reason: string | null
  note: string | null
  createdAt: string | null
  createdBy: string | null
}

export type AdminUserDetail = {
  user: {
    userId: string
    email: string
    displayName: string
    avatarUrl: string | null
    baseRole: BaseRole
    baseRoleLabel: string
    major: string | null
    studentId: string | null
    year: number | null
    joinedAt: string
    adminRoleNames: string[]
  }
  accountState: AdminUserAccountState
  recentPosts: Array<{
    id: string
    excerpt: string
    status: string
    deleted: boolean
    createdAt: string
  }>
  recentComments: Array<{
    id: string
    postId: string
    excerpt: string
    deleted: boolean
    createdAt: string
  }>
  relatedReports: Array<{ id: string; reason: string; status: string; createdAt: string }>
  adminHistory: Array<{
    id: string
    action: string
    actorName: string
    reason: string | null
    createdAt: string
  }>
}

export type AdminUserStatusFilter = "all" | "active" | "pending" | "locked" | "deleted"

export type AdminUsersListFilters = {
  query?: string
  role?: BaseRole | "all"
  status?: AdminUserStatusFilter
}

const ACCOUNT_STATUS_LABELS: Record<AdminUserAccountStatus, string> = {
  ACTIVE: "Đang hoạt động",
  TEMP_LOCKED: "Khóa tạm thời",
  LOCKED: "Đã khóa",
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getActiveAccountState(): AdminUserAccountState {
  return {
    status: "ACTIVE",
    label: ACCOUNT_STATUS_LABELS.ACTIVE,
    lockedUntil: null,
    reason: null,
    note: null,
    createdAt: null,
    createdBy: null,
  }
}

function toExcerpt(value: string, max = 90) {
  if (value.length <= max) {
    return value
  }

  return `${value.slice(0, max - 3)}...`
}

function buildRelatedReportWhere(userId: string, postIds: string[], commentIds: string[]) {
  const OR: Array<
    | { reporterId: string }
    | { contentType: "POST"; contentId: { in: string[] } }
    | { contentType: "COMMENT"; contentId: { in: string[] } }
  > = [{ reporterId: userId }]

  if (postIds.length > 0) {
    OR.push({ contentType: "POST", contentId: { in: postIds } })
  }

  if (commentIds.length > 0) {
    OR.push({ contentType: "COMMENT", contentId: { in: commentIds } })
  }

  return { OR }
}

function buildActiveAccountModerationWhere(now = new Date()): Prisma.UserAccountModerationWhereInput {
  return {
    releasedAt: null,
    OR: [{ status: "LOCKED" }, { status: "TEMP_LOCKED", lockedUntil: { gt: now } }],
  }
}

function buildUserProfileWhere(
  filters: AdminUsersListFilters,
  now = new Date(),
): Prisma.UserProfileWhereInput {
  const where: Prisma.UserProfileWhereInput = {}
  const query = filters.query?.trim()

  if (filters.role && filters.role !== "all") {
    where.role = filters.role
  }

  if (query) {
    where.OR = [
      { displayName: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
      { studentId: { contains: query, mode: "insensitive" } },
    ]
  }

  if (filters.status === "deleted") {
    where.deletedAt = { not: null }
  } else {
    where.deletedAt = null
  }

  if (filters.status === "locked") {
    where.accountModerations = {
      some: buildActiveAccountModerationWhere(now),
    }
  }

  if (filters.status === "active") {
    where.accountModerations = {
      none: buildActiveAccountModerationWhere(now),
    }
    where.emailVerifications = { none: {} }
  }

  if (filters.status === "pending") {
    where.emailVerifications = { some: {} }
  }

  return where
}

function getUserStatus(
  profile: Pick<AdminUserProfile, "deletedAt" | "emailVerifications" | "accountModerations">,
) {
  if (profile.deletedAt) {
    return "deleted" as const
  }

  if (profile.accountModerations.length > 0) {
    return "locked" as const
  }

  if (profile.emailVerifications.length > 0) {
    return "pending" as const
  }

  return "active" as const
}

function getUserStatusLabel(status: ReturnType<typeof getUserStatus>) {
  switch (status) {
    case "deleted":
      return "Đã xóa"
    case "locked":
      return "Đã khóa"
    case "pending":
      return "Chờ xác minh"
    default:
      return "Đang hoạt động"
  }
}

function mapProfileToRecord(profile: AdminUserProfile): AdminRecord<UserCells> {
  const status = getUserStatus(profile)

  return {
    id: profile.userId,
    title: profile.displayName,
    subtitle: getBaseRoleLabel(profile.role),
    status,
    cells: {
      title: profile.displayName,
      email: profile.email,
      role: getBaseRoleLabel(profile.role),
      faculty: profile.major ?? "Chưa cập nhật",
      status: getUserStatusLabel(status),
      joinedAt: formatDate(profile.createdAt),
    },
  }
}

function buildDetailSections(profile: AdminUserProfile): AdminDetailSection[] {
  const status = getUserStatus(profile)
  const delegatedRoleNames = profile.userAdminRoles.map(({ adminRole }) =>
    getAdminRoleLabel(adminRole.code, adminRole.name),
  )

  return [
    {
      title: "Thông tin cơ bản",
      items: [
        { label: "Họ và tên", value: profile.displayName },
        { label: "Email", value: profile.email },
        { label: "Email liên hệ", value: profile.contactEmail?.email ?? "Chưa xác thực" },
        {
          label: "Trạng thái email liên hệ",
          value: profile.contactEmail
            ? "Đã xác thực"
            : profile.contactEmailVerifications.length > 0
              ? "Đang chờ xác thực"
              : "Chưa xác thực",
        },
        { label: "Vai trò nền", value: getBaseRoleLabel(profile.role) },
        { label: "Trạng thái", value: getUserStatusLabel(status) },
      ],
    },
    {
      title: "Hồ sơ học vụ",
      items: [
        { label: "Mã sinh viên", value: profile.studentId ?? "Chưa cập nhật" },
        { label: "Khoa", value: profile.major ?? "Chưa cập nhật" },
        { label: "Ngày tham gia", value: formatDate(profile.createdAt) },
      ],
    },
    {
      title: "Phân quyền quản trị",
      items: [
        {
          label: "Gói quyền quản trị",
          value: delegatedRoleNames.length > 0 ? delegatedRoleNames.join(", ") : "Chưa được cấp",
        },
      ],
    },
  ]
}

function buildStats(profiles: AdminUserProfile[]): AdminStatItem[] {
  const totals = profiles.reduce(
    (acc, profile) => {
      const status = getUserStatus(profile)
      acc.total += 1
      acc[status] += 1
      return acc
    },
    { total: 0, active: 0, pending: 0, locked: 0, deleted: 0 },
  )

  return [
    { label: "Tổng người dùng", value: String(totals.total) },
    { label: "Đang hoạt động", value: String(totals.active) },
    { label: "Chờ xác minh", value: String(totals.pending) },
    { label: "Đã khóa", value: String(totals.locked) },
  ]
}

async function listAdminUserProfiles(filters: AdminUsersListFilters, now = new Date()) {
  return prisma.userProfile.findMany({
    where: buildUserProfileWhere(filters, now),
    orderBy: { createdAt: "desc" },
    include: {
      emailVerifications: {
        select: { id: true },
      },
      contactEmail: {
        select: { email: true, verifiedAt: true },
      },
      contactEmailVerifications: {
        where: { consumedAt: null },
        select: { id: true, email: true, consumedAt: true },
      },
      userAdminRoles: {
        include: {
          adminRole: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      accountModerations: {
        where: buildActiveAccountModerationWhere(now),
        select: {
          id: true,
          status: true,
          lockedUntil: true,
          releasedAt: true,
        },
      },
    },
  }) as Promise<AdminUserProfile[]>
}

export async function getUsersAdminModule(
  filters: AdminUsersListFilters = {},
): Promise<AdminModuleDefinition<UserCells>> {
  const profiles = await listAdminUserProfiles(filters)
  const records = profiles.map(mapProfileToRecord)
  const sectionsById = new Map(
    profiles.map((profile) => [profile.userId, buildDetailSections(profile)]),
  )

  return {
    ...USERS_ADMIN_MODULE,
    stats: buildStats(profiles),
    tabs: [
      { label: "Tất cả", value: "all", href: "/admin/users?tab=all" },
      { label: "Đang hoạt động", value: "active", href: "/admin/users?tab=active" },
      { label: "Chờ xác minh", value: "pending", href: "/admin/users?tab=pending" },
      { label: "Đã khóa", value: "locked", href: "/admin/users?tab=locked" },
      { label: "Đã xóa", value: "deleted", href: "/admin/users?tab=deleted" },
    ],
    records,
    getRecord: (id) => records.find((record) => record.id === id),
    getDetailSections: (id) => sectionsById.get(id),
  }
}

export async function getUserAccessEditorData(
  userId: string,
): Promise<UserAccessEditorData | null> {
  const [profile, adminRoles] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      include: {
        userAdminRoles: {
          include: {
            adminRole: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.adminRole.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isSystem: true,
      },
    }),
  ])

  if (!profile) {
    return null
  }

  return {
    user: {
      userId: profile.userId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      baseRole: profile.role,
      major: profile.major,
      studentId: profile.studentId,
      adminRoleIds: profile.userAdminRoles.map(({ adminRole }) => adminRole.id),
      adminRoleNames: profile.userAdminRoles.map(({ adminRole }) =>
        getAdminRoleLabel(adminRole.code, adminRole.name),
      ),
    },
    adminRoles: adminRoles.map((role) => ({
      ...role,
      name: getAdminRoleLabel(role.code, role.name),
      description: getAdminRoleDescription(role.code, role.description),
    })),
  }
}

export async function getUserAccountModerationState(
  userId: string,
  now: Date = new Date(),
): Promise<AdminUserAccountState> {
  const latest = await prisma.userAccountModeration.findFirst({
    where: {
      userId,
      releasedAt: null,
      OR: [{ status: "LOCKED" }, { status: "TEMP_LOCKED", lockedUntil: { gt: now } }],
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      status: true,
      lockedUntil: true,
      reason: true,
      note: true,
      createdAt: true,
      creator: { select: { displayName: true } },
    },
  })

  if (!latest) {
    return getActiveAccountState()
  }

  const status: AdminUserAccountStatus = latest.status

  return {
    status,
    label: ACCOUNT_STATUS_LABELS[status],
    lockedUntil: latest.lockedUntil?.toISOString() ?? null,
    reason: latest.reason,
    note: latest.note,
    createdAt: latest.createdAt.toISOString(),
    createdBy: latest.creator?.displayName ?? null,
  }
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    include: {
      userAdminRoles: {
        include: {
          adminRole: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!profile) {
    return null
  }

  const [accountState, recentPosts, recentComments, accountHistory] = await Promise.all([
    getUserAccountModerationState(userId),
    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        content: true,
        communityStatus: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        postId: true,
        content: true,
        deletedAt: true,
        createdAt: true,
      },
    }),
    prisma.userAccountModeration.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        status: true,
        reason: true,
        createdAt: true,
        creator: { select: { displayName: true } },
      },
    }),
  ])
  const relatedReports = await prisma.communityReport.findMany({
    where: buildRelatedReportWhere(
      userId,
      recentPosts.map((post) => post.id),
      recentComments.map((comment) => comment.id),
    ),
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 5,
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
    },
  })

  const baseRole = assertBaseRole(profile.role)

  return {
    user: {
      userId: profile.userId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      baseRole,
      baseRoleLabel: getBaseRoleLabel(baseRole),
      major: profile.major,
      studentId: profile.studentId,
      year: profile.year,
      joinedAt: profile.createdAt.toISOString(),
      adminRoleNames: profile.userAdminRoles.map(({ adminRole }) =>
        getAdminRoleLabel(adminRole.code, adminRole.name),
      ),
    },
    accountState,
    recentPosts: recentPosts.map((post) => ({
      id: post.id,
      excerpt: toExcerpt(post.content),
      status: post.communityStatus,
      deleted: Boolean(post.deletedAt),
      createdAt: post.createdAt.toISOString(),
    })),
    recentComments: recentComments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      excerpt: toExcerpt(comment.content),
      deleted: Boolean(comment.deletedAt),
      createdAt: comment.createdAt.toISOString(),
    })),
    relatedReports: relatedReports.map((report) => ({
      id: report.id,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
    })),
    adminHistory: accountHistory.map((entry) => ({
      id: entry.id,
      action: entry.status,
      actorName: entry.creator?.displayName ?? "Không xác định",
      reason: entry.reason,
      createdAt: entry.createdAt.toISOString(),
    })),
  }
}
