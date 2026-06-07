import type { Prisma } from "@prisma/client"

import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSelectOption,
  AdminTabItems,
} from "@/lib/admin/admin-types"
import { buildCommunityPath } from "@/lib/communities/urls"
import { prisma } from "@/lib/prisma/client"

export type AdminCourseFilters = {
  query?: string
  tab?: string
}

export type AdminCourseCells = {
  title: string
  code: string
  lecturer: string
  members: string
  learning: string
  settings: string
  updatedAt: string
}

export type AdminCourseMemberItem = {
  userId: string
  displayName: string
  email: string
  avatarUrl: string | null
  studentId: string | null
  joinedAt: string
}

export type AdminCourseDetail = {
  course: {
    id: string
    shortId: string
    code: string
    name: string
    description: string | null
    lecturerId: string
    lecturerName: string
    lecturerEmail: string
    requirePostApproval: boolean
    chatEnabled: boolean
    chatMode: string
    href: string
    createdAt: string
    updatedAt: string
  }
  members: AdminCourseMemberItem[]
  detailSections: AdminDetailSection[]
  record: AdminRecord<AdminCourseCells>
}

const COURSE_TABS: AdminTabItems = [
  { label: "Tất cả", value: "all", active: true },
  { label: "Cần duyệt bài", value: "approval" },
  { label: "Chat đang bật", value: "chat-on" },
  { label: "Chat đang tắt", value: "chat-off" },
]

const COURSE_COLUMNS = [
  { key: "title", header: "Tên lớp học" },
  { key: "code", header: "Mã lớp" },
  { key: "lecturer", header: "Giảng viên" },
  { key: "members", header: "Sinh viên", align: "right" },
  { key: "learning", header: "Học liệu" },
  { key: "settings", header: "Cài đặt" },
  { key: "updatedAt", header: "Cập nhật" },
] satisfies AdminModuleDefinition<AdminCourseCells>["columns"]

function formatDate(value: Date) {
  return value.toLocaleDateString("vi-VN")
}

function courseWhere(filters: AdminCourseFilters): Prisma.CourseWhereInput {
  const query = filters.query?.trim()
  const where: Prisma.CourseWhereInput = { deletedAt: null }

  if (filters.tab === "approval") {
    where.requirePostApproval = true
  } else if (filters.tab === "chat-on") {
    where.chatEnabled = true
  } else if (filters.tab === "chat-off") {
    where.chatEnabled = false
  }

  if (query) {
    where.OR = [
      { code: { contains: query, mode: "insensitive" } },
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { lecturer: { displayName: { contains: query, mode: "insensitive" } } },
      { lecturer: { email: { contains: query, mode: "insensitive" } } },
    ]
  }

  return where
}

function settingsLabel(row: {
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: string
}) {
  const approval = row.requirePostApproval ? "Duyệt bài" : "Đăng trực tiếp"
  const chat = row.chatEnabled ? row.chatMode : "Chat tắt"
  return `${approval} / ${chat}`
}

function buildCourseHref(row: { code: string; shortId: string }) {
  return buildCommunityPath("COURSE", row.code, row.shortId)
}

function buildCourseRecord(row: {
  id: string
  code: string
  name: string
  shortId: string
  requirePostApproval: boolean
  chatEnabled: boolean
  chatMode: string
  updatedAt: Date
  lecturer: { displayName: string; email: string }
  _count: {
    members: number
    coursePosts: number
    announcements: number
    assignments: number
  }
}): AdminRecord<AdminCourseCells> {
  return {
    id: row.id,
    title: row.name,
    subtitle: row.code,
    href: `/admin/subjects/${row.id}`,
    status: row.requirePostApproval ? "approval" : "active",
    cells: {
      title: row.name,
      code: row.code,
      lecturer: row.lecturer.displayName,
      members: row._count.members.toLocaleString("vi-VN"),
      learning: `${row._count.announcements} TB / ${row._count.assignments} BT`,
      settings: settingsLabel(row),
      updatedAt: formatDate(row.updatedAt),
    },
  }
}

function buildCourseDetailSections(input: {
  course: AdminCourseDetail["course"]
  memberCount: number
  postCount: number
  announcementCount: number
  assignmentCount: number
}): AdminDetailSection[] {
  return [
    {
      title: "Tổng quan lớp học",
      items: [
        { label: "Mã lớp", value: input.course.code },
        { label: "Tên lớp", value: input.course.name },
        { label: "Giảng viên", value: input.course.lecturerName },
        { label: "Trang công khai", value: input.course.href },
      ],
    },
    {
      title: "Thành viên và học liệu",
      items: [
        { label: "Sinh viên", value: input.memberCount.toLocaleString("vi-VN") },
        { label: "Bài viết", value: input.postCount.toLocaleString("vi-VN") },
        { label: "Thông báo lớp", value: input.announcementCount.toLocaleString("vi-VN") },
        { label: "Bài tập", value: input.assignmentCount.toLocaleString("vi-VN") },
      ],
    },
    {
      title: "Cài đặt lớp học",
      items: [
        { label: "Duyệt bài viết", value: input.course.requirePostApproval ? "Bật" : "Tắt" },
        { label: "Chat", value: input.course.chatEnabled ? "Bật" : "Tắt" },
        { label: "Chế độ chat", value: input.course.chatMode },
        { label: "Cập nhật", value: input.course.updatedAt },
      ],
    },
  ]
}

export async function getCoursesAdminModule(
  filters: AdminCourseFilters = {},
): Promise<AdminModuleDefinition<AdminCourseCells>> {
  const rows = await prisma.course.findMany({
    where: courseWhere(filters),
    orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
    include: {
      lecturer: {
        select: {
          userId: true,
          displayName: true,
          email: true,
        },
      },
      _count: {
        select: {
          members: true,
          coursePosts: true,
          announcements: true,
          assignments: true,
        },
      },
    },
  })
  const records = rows.map(buildCourseRecord)
  const recordById = new Map(records.map((record) => [record.id, record]))
  const totalMembers = rows.reduce((sum, row) => sum + row._count.members, 0)
  const lecturers = new Set(rows.map((row) => row.lecturerId))
  const approvalCount = rows.filter((row) => row.requirePostApproval).length

  return {
    key: "subjects",
    label: "Lớp học",
    description: "Quản lý lớp học, giảng viên phụ trách, thành viên và cài đặt học tập.",
    basePath: "/admin/subjects",
    icon: "BookOpen",
    entityNameSingular: "lớp học",
    entityNamePlural: "lớp học",
    paths: createAdminModulePaths("/admin/subjects"),
    navItem: {
      label: "Lớp học",
      href: "/admin/subjects",
      icon: "BookOpen",
      description: "Quản lý lớp học và thành viên",
    },
    stats: [
      { label: "Tổng lớp học", value: rows.length.toLocaleString("vi-VN") },
      { label: "Sinh viên", value: totalMembers.toLocaleString("vi-VN") },
      { label: "Giảng viên", value: lecturers.size.toLocaleString("vi-VN") },
      { label: "Cần duyệt bài", value: approvalCount.toLocaleString("vi-VN") },
    ],
    tabs: COURSE_TABS,
    columns: COURSE_COLUMNS,
    records,
    quickActions: [
      {
        label: "Tạo lớp học",
        href: "/admin/subjects/new",
        icon: "BookOpen",
        description: "Thêm lớp học mới và chọn giảng viên phụ trách",
      },
      {
        label: "Mở trang lớp học",
        href: "/courses",
        icon: "BookOpen",
        description: "Xem danh sách lớp học phía cộng đồng",
      },
    ],
    getDetailSections: (id) => {
      const record = recordById.get(id)
      if (!record) return undefined
      return [
        {
          title: "Thông tin nhanh",
          items: [
            { label: "Mã lớp", value: record.cells.code },
            { label: "Giảng viên", value: record.cells.lecturer },
            { label: "Sinh viên", value: record.cells.members },
          ],
        },
      ]
    },
    createSections: [],
    editSections: [],
    settingsSections: [],
    buildDetailPath: (id) => `/admin/subjects/${id}`,
    buildEditPath: (id) => `/admin/subjects/${id}/edit`,
    buildNewPath: () => "/admin/subjects/new",
    buildSettingsPath: () => "/admin/subjects/settings",
    getRecord: (id) => recordById.get(id),
  }
}

export async function getAdminCourseDetail(courseId: string): Promise<AdminCourseDetail | null> {
  const row = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lecturer: {
        select: {
          userId: true,
          displayName: true,
          email: true,
        },
      },
      members: {
        orderBy: { joinedAt: "asc" },
        include: {
          user: {
            select: {
              userId: true,
              displayName: true,
              email: true,
              avatarUrl: true,
              studentId: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          coursePosts: true,
          announcements: true,
          assignments: true,
        },
      },
    },
  })

  if (!row || row.deletedAt) return null

  const course = {
    id: row.id,
    shortId: row.shortId,
    code: row.code,
    name: row.name,
    description: row.description,
    lecturerId: row.lecturerId,
    lecturerName: row.lecturer.displayName,
    lecturerEmail: row.lecturer.email,
    requirePostApproval: row.requirePostApproval,
    chatEnabled: row.chatEnabled,
    chatMode: row.chatMode,
    href: buildCourseHref(row),
    createdAt: formatDate(row.createdAt),
    updatedAt: formatDate(row.updatedAt),
  }
  const record = buildCourseRecord(row)
  const members = row.members.map((member) => ({
    userId: member.userId,
    displayName: member.user.displayName,
    email: member.user.email,
    avatarUrl: member.user.avatarUrl,
    studentId: member.user.studentId,
    joinedAt: formatDate(member.joinedAt),
  }))

  return {
    course,
    members,
    detailSections: buildCourseDetailSections({
      course,
      memberCount: row._count.members,
      postCount: row._count.coursePosts,
      announcementCount: row._count.announcements,
      assignmentCount: row._count.assignments,
    }),
    record,
  }
}

export async function listCourseLecturerOptions(): Promise<AdminSelectOption[]> {
  const lecturers = await prisma.userProfile.findMany({
    where: { role: "LECTURER", deletedAt: null },
    select: {
      userId: true,
      displayName: true,
      email: true,
    },
    orderBy: [{ displayName: "asc" }, { email: "asc" }],
  })

  return lecturers.map((lecturer) => ({
    label: `${lecturer.displayName} - ${lecturer.email}`,
    value: lecturer.userId,
  }))
}
