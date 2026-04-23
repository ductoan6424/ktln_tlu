import {
  getAdminRoleDescription,
  getAdminRoleLabel,
} from "@/lib/admin/admin-role-labels"
import { getBaseRoleLabel, type BaseRole } from "@/lib/auth/base-role"
import { prisma } from "@/lib/prisma/client"
import { USERS_ADMIN_MODULE } from "@/lib/admin/modules/users"
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
  userAdminRoles: Array<{
    adminRole: {
      id: string
      code: string
      name: string
    }
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

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function getUserStatus(profile: Pick<AdminUserProfile, "deletedAt" | "emailVerifications">) {
  if (profile.deletedAt) {
    return "blocked" as const
  }

  if (profile.emailVerifications.length > 0) {
    return "pending" as const
  }

  return "active" as const
}

function getUserStatusLabel(status: ReturnType<typeof getUserStatus>) {
  switch (status) {
    case "blocked":
      return "Đã chặn"
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
    { total: 0, active: 0, pending: 0, blocked: 0 },
  )

  return [
    { label: "Tổng người dùng", value: String(totals.total) },
    { label: "Đang hoạt động", value: String(totals.active) },
    { label: "Chờ xác minh", value: String(totals.pending) },
    { label: "Đã chặn", value: String(totals.blocked) },
  ]
}

async function listAdminUserProfiles() {
  return prisma.userProfile.findMany({
    where: {},
    orderBy: { createdAt: "desc" },
    include: {
      emailVerifications: {
        select: { id: true },
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
    },
  }) as Promise<AdminUserProfile[]>
}

export async function getUsersAdminModule(): Promise<AdminModuleDefinition<UserCells>> {
  const profiles = await listAdminUserProfiles()
  const records = profiles.map(mapProfileToRecord)
  const sectionsById = new Map(
    profiles.map((profile) => [profile.userId, buildDetailSections(profile)]),
  )

  return {
    ...USERS_ADMIN_MODULE,
    stats: buildStats(profiles),
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
