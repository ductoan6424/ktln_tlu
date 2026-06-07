import type { Prisma } from "@prisma/client"

import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminTabItems,
} from "@/lib/admin/admin-types"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export type AdminGroupFilters = {
  query?: string
  tab?: string
}

export type AdminGroupCells = {
  title: string
  privacy: string
  members: string
  owner: string
  posts: string
  settings: string
  updatedAt: string
}

export type AdminGroupMemberItem = {
  userId: string
  displayName: string
  email: string
  avatarUrl: string | null
  studentId: string | null
  baseRole: string
  role: string
  joinedAt: string
}

export type AdminGroupDetail = {
  group: {
    id: string
    shortId: string
    name: string
    description: string | null
    communityVisibility: "PUBLIC" | "PRIVATE"
    requirePostApproval: boolean
    chatEnabled: boolean
    chatMode: string
    memberInviteEnabled: boolean
    href: string
    createdAt: string
    updatedAt: string
  }
  members: AdminGroupMemberItem[]
  detailSections: AdminDetailSection[]
  record: AdminRecord<AdminGroupCells>
}

const GROUP_TABS: AdminTabItems = [
  { label: "Tất cả", value: "all", active: true },
  { label: "Công khai", value: "public" },
  { label: "Riêng tư", value: "private" },
  { label: "Cần duyệt bài", value: "approval" },
  { label: "Chat đang tắt", value: "chat-off" },
]

const GROUP_COLUMNS = [
  { key: "title", header: "Tên nhóm" },
  { key: "privacy", header: "Quyền riêng tư" },
  { key: "members", header: "Thành viên", align: "right" },
  { key: "owner", header: "Quản trị chính" },
  { key: "posts", header: "Bài viết", align: "right" },
  { key: "settings", header: "Cài đặt" },
  { key: "updatedAt", header: "Cập nhật" },
] satisfies AdminModuleDefinition<AdminGroupCells>["columns"]

function formatDate(value: Date) {
  return value.toLocaleDateString("vi-VN")
}

function groupWhere(filters: AdminGroupFilters): Prisma.GroupWhereInput {
  const query = filters.query?.trim()
  const where: Prisma.GroupWhereInput = { deletedAt: null }

  if (filters.tab === "public") {
    where.communityVisibility = "PUBLIC"
  } else if (filters.tab === "private") {
    where.communityVisibility = "PRIVATE"
  } else if (filters.tab === "approval") {
    where.requirePostApproval = true
  } else if (filters.tab === "chat-off") {
    where.chatEnabled = false
  }

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      {
        members: {
          some: {
            user: {
              OR: [
                { displayName: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { studentId: { contains: query, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    ]
  }

  return where
}

function privacyLabel(value: "PUBLIC" | "PRIVATE") {
  return value === "PRIVATE" ? "Riêng tư" : "Công khai"
}

function settingsLabel(row: {
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: string
  memberInviteEnabled: boolean
}) {
  const approval = row.requirePostApproval ? "Duyệt bài" : "Đăng trực tiếp"
  const chat = row.chatEnabled ? row.chatMode : "Chat tắt"
  const invite = row.memberInviteEnabled ? "Mời thành viên" : "Tắt lời mời"
  return `${approval} / ${chat} / ${invite}`
}

function getOwnerName(row: {
  members?: Array<{
    role: string
    user: {
      displayName: string
    }
  }>
}) {
  return row.members?.find((member) => member.role === "ADMIN")?.user.displayName ?? "Chưa gán"
}

function buildGroupHref(row: { name: string; shortId: string }) {
  return buildCommunityPath("GROUP", row.name, row.shortId)
}

function buildGroupRecord(row: {
  id: string
  name: string
  shortId: string
  communityVisibility: "PUBLIC" | "PRIVATE"
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: string
  memberInviteEnabled: boolean
  updatedAt: Date
  members?: Array<{
    role: string
    user: { displayName: string }
  }>
  _count: {
    members: number
    posts: number
  }
}): AdminRecord<AdminGroupCells> {
  return {
    id: row.id,
    title: row.name,
    subtitle: privacyLabel(row.communityVisibility),
    href: `/admin/groups/${row.id}`,
    status: row.communityVisibility.toLowerCase(),
    cells: {
      title: row.name,
      privacy: privacyLabel(row.communityVisibility),
      members: row._count.members.toLocaleString("vi-VN"),
      owner: getOwnerName(row),
      posts: row._count.posts.toLocaleString("vi-VN"),
      settings: settingsLabel(row),
      updatedAt: formatDate(row.updatedAt),
    },
  }
}

function buildGroupDetailSections(input: {
  group: AdminGroupDetail["group"]
  memberCount: number
  postCount: number
  adminCount: number
  moderatorCount: number
}): AdminDetailSection[] {
  return [
    {
      title: "Tổng quan nhóm",
      items: [
        { label: "Tên nhóm", value: input.group.name },
        { label: "Quyền riêng tư", value: privacyLabel(input.group.communityVisibility) },
        { label: "Trang công khai", value: input.group.href },
        { label: "Thành viên", value: input.memberCount.toLocaleString("vi-VN") },
      ],
    },
    {
      title: "Vai trò thành viên",
      items: [
        { label: "Quản trị", value: input.adminCount.toLocaleString("vi-VN") },
        { label: "Kiểm duyệt", value: input.moderatorCount.toLocaleString("vi-VN") },
        { label: "Bài viết", value: input.postCount.toLocaleString("vi-VN") },
      ],
    },
    {
      title: "Cài đặt nhóm",
      items: [
        { label: "Duyệt bài viết", value: input.group.requirePostApproval ? "Bật" : "Tắt" },
        { label: "Chat", value: input.group.chatEnabled ? "Bật" : "Tắt" },
        { label: "Chế độ chat", value: input.group.chatMode },
        { label: "Lời mời thành viên", value: input.group.memberInviteEnabled ? "Bật" : "Tắt" },
      ],
    },
  ]
}

export async function getGroupsAdminModule(
  filters: AdminGroupFilters = {},
): Promise<AdminModuleDefinition<AdminGroupCells>> {
  const rows = await prisma.group.findMany({
    where: groupWhere(filters),
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    include: {
      members: {
        where: { role: "ADMIN" },
        take: 1,
        include: {
          user: {
            select: {
              displayName: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          posts: true,
        },
      },
    },
  })
  const records = rows.map(buildGroupRecord)
  const recordById = new Map(records.map((record) => [record.id, record]))
  const totalMembers = rows.reduce((sum, row) => sum + row._count.members, 0)
  const privateCount = rows.filter((row) => row.communityVisibility === "PRIVATE").length
  const approvalCount = rows.filter((row) => row.requirePostApproval).length

  return {
    key: "groups",
    label: "Nhóm",
    description: "Quản lý nhóm, thành viên, quyền riêng tư và cài đặt kiểm duyệt.",
    basePath: "/admin/groups",
    icon: "UsersRound",
    entityNameSingular: "nhóm",
    entityNamePlural: "nhóm",
    paths: createAdminModulePaths("/admin/groups"),
    navItem: {
      label: "Nhóm",
      href: "/admin/groups",
      icon: "UsersRound",
      description: "Quản lý nhóm và thành viên",
    },
    stats: [
      { label: "Tổng nhóm", value: rows.length.toLocaleString("vi-VN") },
      { label: "Thành viên", value: totalMembers.toLocaleString("vi-VN") },
      { label: "Riêng tư", value: privateCount.toLocaleString("vi-VN") },
      { label: "Cần duyệt bài", value: approvalCount.toLocaleString("vi-VN") },
    ],
    tabs: GROUP_TABS,
    columns: GROUP_COLUMNS,
    records,
    quickActions: [
      {
        label: "Tạo nhóm",
        href: "/admin/groups/new",
        icon: "UsersRound",
        description: "Thêm nhóm mới và cấu hình quyền truy cập",
      },
      {
        label: "Mở trang nhóm",
        href: "/groups",
        icon: "UsersRound",
        description: "Xem danh sách nhóm phía cộng đồng",
      },
    ],
    getDetailSections: (id) => {
      const record = recordById.get(id)
      if (!record) return undefined
      return [
        {
          title: "Thông tin nhanh",
          items: [
            { label: "Quyền riêng tư", value: record.cells.privacy },
            { label: "Quản trị chính", value: record.cells.owner },
            { label: "Thành viên", value: record.cells.members },
          ],
        },
      ]
    },
    createSections: [],
    editSections: [],
    settingsSections: [],
    buildDetailPath: (id) => `/admin/groups/${id}`,
    buildEditPath: (id) => `/admin/groups/${id}/edit`,
    buildNewPath: () => "/admin/groups/new",
    buildSettingsPath: () => "/admin/groups/settings",
    getRecord: (id) => recordById.get(id),
  }
}

export async function getAdminGroupDetail(groupId: string): Promise<AdminGroupDetail | null> {
  const row = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        include: {
          user: {
            select: {
              userId: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              studentId: true,
              role: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          posts: true,
        },
      },
    },
  })

  if (!row || row.deletedAt) return null

  const group = {
    id: row.id,
    shortId: row.shortId,
    name: row.name,
    description: row.description,
    communityVisibility: row.communityVisibility,
    requirePostApproval: row.requirePostApproval,
    chatEnabled: row.chatEnabled,
    chatMode: row.chatMode,
    memberInviteEnabled: row.memberInviteEnabled,
    href: buildGroupHref(row),
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  }
  const record = buildGroupRecord(row)
  const members = row.members.map((member) => ({
    userId: member.userId,
    displayName: member.user.displayName,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    studentId: member.user.studentId,
    baseRole: member.user.role,
    role: member.role,
    joinedAt: formatDate(member.joinedAt),
  }))
  const adminCount = members.filter((member) => member.role === "ADMIN").length
  const moderatorCount = members.filter((member) => member.role === "MODERATOR").length

  return {
    group,
    members,
    detailSections: buildGroupDetailSections({
      group,
      memberCount: row._count.members,
      postCount: row._count.posts,
      adminCount,
      moderatorCount,
    }),
    record,
  }
}
