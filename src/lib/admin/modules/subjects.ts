import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface SubjectCells {
  code: string
  title: string
  lecturer: string
  members: string
  settings: string
}

const SUBJECT_RECORDS: AdminRecord<SubjectCells>[] = [
  {
    id: "subject-001",
    title: "Cơ sở dữ liệu",
    subtitle: "CS204",
    status: "active",
    cells: {
      code: "CS204",
      title: "Cơ sở dữ liệu",
      lecturer: "Giảng viên A",
      members: "42",
      settings: "Duyệt bài / OPEN",
    },
  },
  {
    id: "subject-002",
    title: "Kỹ thuật phần mềm",
    subtitle: "CS301",
    status: "active",
    cells: {
      code: "CS301",
      title: "Kỹ thuật phần mềm",
      lecturer: "Giảng viên B",
      members: "38",
      settings: "Đăng trực tiếp / OPEN",
    },
  },
]

const formSections: AdminFormSection[] = [
  {
    title: "Thông tin lớp học",
    fields: [
      { name: "code", label: "Mã lớp", type: "text", required: true },
      { name: "name", label: "Tên lớp học", type: "text", required: true },
      { name: "lecturerId", label: "Giảng viên", type: "text", required: true },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Cài đặt theo từng lớp",
    description: "Cấu hình lớp học được quản lý trong trang chi tiết từng lớp.",
    items: [
      { name: "managedPerCourse", label: "Quản lý riêng từng lớp", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "subject-001": [
    {
      title: "Thông tin lớp học",
      items: [
        { label: "Mã lớp", value: "CS204" },
        { label: "Tên lớp", value: "Cơ sở dữ liệu" },
        { label: "Giảng viên", value: "Giảng viên A" },
      ],
    },
  ],
  "subject-002": [
    {
      title: "Thông tin lớp học",
      items: [
        { label: "Mã lớp", value: "CS301" },
        { label: "Tên lớp", value: "Kỹ thuật phần mềm" },
        { label: "Giảng viên", value: "Giảng viên B" },
      ],
    },
  ],
}

export const SUBJECTS_ADMIN_MODULE: AdminModuleDefinition<SubjectCells> = {
  key: "subjects",
  label: "Lớp học",
  description: "Quản lý lớp học, giảng viên phụ trách, thành viên và thiết lập học tập.",
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
    { label: "Tổng lớp học", value: "42" },
    { label: "Đang mở", value: "31" },
    { label: "Cần duyệt bài", value: "8" },
    { label: "Cần cập nhật", value: "3" },
  ],
  tabs: [
    { label: "Tất cả", value: "all", active: true },
    { label: "Cần duyệt bài", value: "approval" },
    { label: "Chat đang bật", value: "chat-on" },
    { label: "Chat đang tắt", value: "chat-off" },
  ],
  columns: [
    { key: "code", header: "Mã lớp" },
    { key: "title", header: "Tên lớp" },
    { key: "lecturer", header: "Giảng viên" },
    { key: "members", header: "Sinh viên" },
    { key: "settings", header: "Cài đặt" },
  ],
  records: SUBJECT_RECORDS,
  quickActions: [
    {
      label: "Tạo lớp học",
      href: "/admin/subjects/new",
      icon: "BookOpen",
      description: "Thêm lớp học mới",
    },
    {
      label: "Mở trang lớp học",
      href: "/courses",
      icon: "BookOpen",
      description: "Xem danh sách lớp học phía cộng đồng",
    },
  ],
  getDetailSections: (id) => detailSectionsById[id],
  createSections: formSections,
  editSections: formSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/subjects/${id}`,
  buildEditPath: (id) => `/admin/subjects/${id}/edit`,
  buildNewPath: () => "/admin/subjects/new",
  buildSettingsPath: () => "/admin/subjects/settings",
  getRecord: (id) => SUBJECT_RECORDS.find((record) => record.id === id),
}
