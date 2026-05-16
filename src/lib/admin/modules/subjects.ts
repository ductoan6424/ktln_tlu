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
  faculty: string
  credits: string
  status: string
}

const SUBJECT_RECORDS: AdminRecord<SubjectCells>[] = [
  {
    id: "subject-001",
    title: "Cơ sở dữ liệu",
    subtitle: "CS204",
    status: "open",
    cells: {
      code: "CS204",
      title: "Cơ sở dữ liệu",
      faculty: "Công nghệ thông tin",
      credits: "3",
      status: "Đang mở",
    },
  },
  {
    id: "subject-002",
    title: "Kỹ thuật phần mềm",
    subtitle: "CS301",
    status: "review",
    cells: {
      code: "CS301",
      title: "Kỹ thuật phần mềm",
      faculty: "Công nghệ thông tin",
      credits: "4",
      status: "Chờ rà soát",
    },
  },
]

const SUBJECT_STATUS_OPTIONS = [
  { label: "Bản nháp", value: "draft" },
  { label: "Đang mở", value: "open" },
  { label: "Tạm dừng", value: "paused" },
] as const

const formSections: AdminFormSection[] = [
  {
    title: "Thông tin môn học",
    description: "Các thông tin cốt lõi xuất hiện xuyên suốt khu vực quản trị.",
    fields: [
      { name: "code", label: "Mã môn học", type: "text", required: true },
      { name: "name", label: "Tên môn học", type: "text", required: true },
      { name: "credits", label: "Số tín chỉ", type: "number", required: true },
    ],
  },
  {
    title: "Hiển thị",
    description: "Xác định cách môn học được hiển thị tới người dùng.",
    fields: [
      { name: "status", label: "Trạng thái", type: "select", options: SUBJECT_STATUS_OPTIONS, required: true },
      { name: "isPublic", label: "Hiển thị công khai", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Quy ước mã môn",
    description: "Thiết lập dùng chung cho việc đặt mã của môn học mới.",
    items: [
      { name: "prefix", label: "Tiền tố mã môn", value: "CS", type: "text" },
      { name: "autoNumber", label: "Tự động đánh số môn học", value: "on", type: "toggle" },
    ],
  },
  {
    title: "Hiển thị mặc định",
    description: "Hành vi hiển thị mặc định cho môn học mới.",
    items: [
      {
        name: "defaultStatus",
        label: "Trạng thái mặc định",
        value: "draft",
        type: "select",
        options: SUBJECT_STATUS_OPTIONS,
      },
      { name: "showInCatalog", label: "Hiển thị trong danh mục", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "subject-001": [
    {
      title: "Thông tin môn học",
      items: [
        { label: "Mã môn", value: "CS204" },
        { label: "Tên môn", value: "Cơ sở dữ liệu" },
        { label: "Số tín chỉ", value: "3" },
      ],
    },
    {
      title: "Bối cảnh quản trị",
      items: [
        { label: "Tổ giảng viên", value: "Tổ Cơ sở dữ liệu" },
        { label: "Nhóm liên kết", value: "2" },
        { label: "Sự kiện liên kết", value: "1" },
      ],
    },
  ],
  "subject-002": [
    {
      title: "Thông tin môn học",
      items: [
        { label: "Mã môn", value: "CS301" },
        { label: "Tên môn", value: "Kỹ thuật phần mềm" },
        { label: "Số tín chỉ", value: "4" },
      ],
    },
    {
      title: "Bối cảnh quản trị",
      items: [
        { label: "Tổ giảng viên", value: "Tổ Kỹ thuật phần mềm" },
        { label: "Nhóm liên kết", value: "3" },
        { label: "Sự kiện liên kết", value: "2" },
      ],
    },
  ],
}

export const SUBJECTS_ADMIN_MODULE: AdminModuleDefinition<SubjectCells> = {
  key: "subjects",
  label: "Môn học",
  description: "Quản lý dữ liệu môn học và các thiết lập mặc định theo môn.",
  basePath: "/admin/subjects",
  icon: "BookOpen",
  entityNameSingular: "môn học",
  entityNamePlural: "môn học",
  paths: createAdminModulePaths("/admin/subjects"),
  navItem: {
    label: "Môn học",
    href: "/admin/subjects",
    icon: "BookOpen",
    description: "Quản lý dữ liệu môn học",
  },
  stats: [
    { label: "Tổng môn học", value: "42" },
    { label: "Đang mở", value: "31" },
    { label: "Tạm dừng", value: "8" },
    { label: "Cần cập nhật", value: "3" },
  ],
  tabs: [
    { label: "Tất cả", value: "all", active: true },
    { label: "Cơ sở", value: "core" },
    { label: "Chuyên ngành", value: "major" },
    { label: "Thực hành", value: "practice" },
  ],
  columns: [
    { key: "code", header: "Mã môn" },
    { key: "title", header: "Tên môn" },
    { key: "faculty", header: "Khoa" },
    { key: "credits", header: "Tín chỉ" },
    { key: "status", header: "Trạng thái" },
  ],
  records: SUBJECT_RECORDS,
  quickActions: [
    {
      label: "Tạo môn học",
      href: "/admin/subjects/new",
      icon: "BookOpen",
      description: "Thêm bản ghi môn học mới",
    },
    {
      label: "Mở cài đặt",
      href: "/admin/subjects/settings",
      icon: "BookOpen",
      description: "Chỉnh sửa cấu hình mặc định của môn học",
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
