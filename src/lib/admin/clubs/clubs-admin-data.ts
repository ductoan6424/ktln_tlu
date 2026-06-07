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

export type AdminClubFilters = {
  query?: string
  tab?: string
}

export type AdminClubCells = {
  title: string
  category: string
  privacy: string
  members: string
  owner: string
  posts: string
  settings: string
  updatedAt: string
}

export type AdminClubMemberItem = {
  userId: string
  displayName: string
  email: string
  avatarUrl: string | null
  studentId: string | null
  baseRole: string
  role: string
  joinedAt: string
}

export type AdminClubDetail = {
  club: {
    id: string
    shortId: string
    name: string
    description: string | null
    category: string | null
    communityVisibility: "PUBLIC" | "PRIVATE"
    requirePostApproval: boolean
    chatEnabled: boolean
    chatMode: string
    memberInviteEnabled: boolean
    href: string
    createdAt: string
    updatedAt: string
  }
  members: AdminClubMemberItem[]
  detailSections: AdminDetailSection[]
  record: AdminRecord<AdminClubCells>
}

const CLUB_TABS: AdminTabItems = [
  { label: "Tất cả", value: "all", active: true },
  { label: "Công khai", value: "public" },
  { label: "Riêng tư", value: "private" },
  { label: "Cần duyệt bài", value: "approval" },
  { label: "Chat đang tắt", value: "chat-off" },
]

const CLUB_COLUMNS = [
  { key: "title", header: "Tên câu lạc bộ" },
  { key: "category", header: "Lĩnh vực" },
  { key: "privacy", header: "Quyền riêng tư" },
  { key: "members", header: "Thành viên", align: "right" },
  { key: "owner", header: "Quản trị chính" },
  { key: "posts", header: "Bài viết", align: "right" },
  { key: "settings", header: "Cài đặt" },
  { key: "updatedAt", header: "Cập nhật" },
] satisfies AdminModuleDefinition<AdminClubCells>["columns"]

function formatDate(value: Date) {
  return value.toLocaleDateString("vi-VN")
}

function clubWhere(filters: AdminClubFilters): Prisma.ClubWhereInput {
  const query = filters.query?.trim()
  const where: Prisma.ClubWhereInput = { deletedAt: null }

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
      { category: { contains: query, mode: "insensitive" } },
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

function categoryLabel(value: string | null) {
  return value?.trim() || "Chưa phân loại"
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

function buildClubHref(row: { name: string; shortId: string }) {
  return buildCommunityPath("CLUB", row.name, row.shortId)
}

function buildClubRecord(row: {
  id: string
  name: string
  shortId: string
  category: string | null
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
}): AdminRecord<AdminClubCells> {
  return {
    id: row.id,
    title: row.name,
    subtitle: categoryLabel(row.category),
    href: `/admin/clubs/${row.id}`,
    status: row.communityVisibility.toLowerCase(),
    cells: {
      title: row.name,
      category: categoryLabel(row.category),
      privacy: privacyLabel(row.communityVisibility),
      members: row._count.members.toLocaleString("vi-VN"),
      owner: getOwnerName(row),
      posts: row._count.posts.toLocaleString("vi-VN"),
      settings: settingsLabel(row),
      updatedAt: formatDate(row.updatedAt),
    },
  }
}

function buildClubDetailSections(input: {
  club: AdminClubDetail["club"]
  memberCount: number
  postCount: number
  adminCount: number
  moderatorCount: number
}): AdminDetailSection[] {
  return [
    {
      title: "Tổng quan câu lạc bộ",
      items: [
        { label: "Tên câu lạc bộ", value: input.club.name },
        { label: "Lĩnh vực", value: categoryLabel(input.club.category) },
        { label: "Quyền riêng tư", value: privacyLabel(input.club.communityVisibility) },
        { label: "Trang công khai", value: input.club.href },
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
      title: "Cài đặt câu lạc bộ",
      items: [
        { label: "Duyệt bài viết", value: input.club.requirePostApproval ? "Bật" : "Tắt" },
        { label: "Chat", value: input.club.chatEnabled ? "Bật" : "Tắt" },
        { label: "Chế độ chat", value: input.club.chatMode },
        { label: "Lời mời thành viên", value: input.club.memberInviteEnabled ? "Bật" : "Tắt" },
      ],
    },
  ]
}

export async function getClubsAdminModule(
  filters: AdminClubFilters = {},
): Promise<AdminModuleDefinition<AdminClubCells>> {
  const rows = await prisma.club.findMany({
    where: clubWhere(filters),
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
  const records = rows.map(buildClubRecord)
  const recordById = new Map(records.map((record) => [record.id, record]))
  const totalMembers = rows.reduce((sum, row) => sum + row._count.members, 0)
  const privateCount = rows.filter((row) => row.communityVisibility === "PRIVATE").length
  const approvalCount = rows.filter((row) => row.requirePostApproval).length

  return {
    key: "clubs",
    label: "Câu lạc bộ",
    description: "Quản lý câu lạc bộ, lĩnh vực hoạt động, thành viên và cài đặt kiểm duyệt.",
    basePath: "/admin/clubs",
    icon: "UsersRound",
    entityNameSingular: "câu lạc bộ",
    entityNamePlural: "câu lạc bộ",
    paths: createAdminModulePaths("/admin/clubs"),
    navItem: {
      label: "Câu lạc bộ",
      href: "/admin/clubs",
      icon: "UsersRound",
      description: "Quản lý CLB và thành viên",
    },
    stats: [
      { label: "Tổng CLB", value: rows.length.toLocaleString("vi-VN") },
      { label: "Thành viên", value: totalMembers.toLocaleString("vi-VN") },
      { label: "Riêng tư", value: privateCount.toLocaleString("vi-VN") },
      { label: "Cần duyệt bài", value: approvalCount.toLocaleString("vi-VN") },
    ],
    tabs: CLUB_TABS,
    columns: CLUB_COLUMNS,
    records,
    quickActions: [
      {
        label: "Tạo câu lạc bộ",
        href: "/admin/clubs/new",
        icon: "UsersRound",
        description: "Thêm CLB mới và cấu hình quyền truy cập",
      },
      {
        label: "Mở trang CLB",
        href: "/clubs",
        icon: "UsersRound",
        description: "Xem danh sách CLB phía cộng đồng",
      },
    ],
    getDetailSections: (id) => {
      const record = recordById.get(id)
      if (!record) return undefined
      return [
        {
          title: "Thông tin nhanh",
          items: [
            { label: "Lĩnh vực", value: record.cells.category },
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
    buildDetailPath: (id) => `/admin/clubs/${id}`,
    buildEditPath: (id) => `/admin/clubs/${id}/edit`,
    buildNewPath: () => "/admin/clubs/new",
    buildSettingsPath: () => "/admin/clubs/settings",
    getRecord: (id) => recordById.get(id),
  }
}

export async function getAdminClubDetail(clubId: string): Promise<AdminClubDetail | null> {
  const row = await prisma.club.findUnique({
    where: { id: clubId },
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

  const club = {
    id: row.id,
    shortId: row.shortId,
    name: row.name,
    description: row.description,
    category: row.category,
    communityVisibility: row.communityVisibility,
    requirePostApproval: row.requirePostApproval,
    chatEnabled: row.chatEnabled,
    chatMode: row.chatMode,
    memberInviteEnabled: row.memberInviteEnabled,
    href: buildClubHref(row),
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  }
  const record = buildClubRecord(row)
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
    club,
    members,
    detailSections: buildClubDetailSections({
      club,
      memberCount: row._count.members,
      postCount: row._count.posts,
      adminCount,
      moderatorCount,
    }),
    record,
  }
}
