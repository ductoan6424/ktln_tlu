import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface UserCells {
  title: string
  email: string
  role: string
  faculty: string
  status: string
  joinedAt: string
}

const USERS_RECORDS: AdminRecord<UserCells>[] = [
  {
    id: "user-001",
    title: "Nguyễn Đức Toàn",
    subtitle: "Sinh viên",
    status: "active",
    cells: {
      title: "Nguyễn Đức Toàn",
      email: "nguyenductoan@example.edu",
      role: "Sinh viên",
      faculty: "Công nghệ thông tin",
      status: "Đang hoạt động",
      joinedAt: "2025-09-01",
    },
  },
  {
    id: "user-002",
    title: "Lê Minh Anh",
    subtitle: "Giảng viên",
    status: "pending",
    cells: {
      title: "Lê Minh Anh",
      email: "leminhanh@example.edu",
      role: "Giảng viên",
      faculty: "Hệ thống thông tin",
      status: "Chờ xác minh",
      joinedAt: "2025-09-18",
    },
  },
  {
    id: "user-003",
    title: "Phạm Gia Hủy",
    subtitle: "Quản trị viên",
    status: "blocked",
    cells: {
      title: "Phạm Gia Hủy",
      email: "phamgiahuy@example.edu",
      role: "Quản trị viên",
      faculty: "Khối quản trị",
      status: "Đã chặn",
      joinedAt: "2025-07-07",
    },
  },
]

const USER_ROLE_OPTIONS = [
  { label: "Sinh viên", value: "student" },
  { label: "Giảng viên", value: "lecturer" },
  { label: "Quản trị viên", value: "admin" },
] as const

const USER_STATUS_OPTIONS = [
  { label: "Đang hoạt động", value: "active" },
  { label: "Chờ xác minh", value: "pending" },
  { label: "Đã chặn", value: "blocked" },
] as const

const createSections: AdminFormSection[] = [
  {
    title: "Thông tin hồ sơ",
    description: "Các trường nhận diện và liên hệ cốt lõi của tài khoản người dùng.",
    fields: [
      { name: "fullName", label: "Họ và tên", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "role", label: "Vai trò", type: "select", options: USER_ROLE_OPTIONS, required: true },
    ],
  },
  {
    title: "Quyền truy cập tài khoản",
    description: "Thiết lập bảo mật và trạng thái dành cho tài khoản.",
    fields: [
      { name: "status", label: "Trạng thái", type: "select", options: USER_STATUS_OPTIONS, required: true },
      { name: "temporaryPassword", label: "Mật khẩu tạm thời", type: "password" },
      { name: "sendInvite", label: "Gửi lời mời", type: "toggle" },
    ],
  },
]

const editSections: AdminFormSection[] = [
  {
    title: "Danh tính",
    description: "Cập nhật hồ sơ người dùng và thông tin liên hệ.",
    fields: [
      { name: "fullName", label: "Họ và tên", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "faculty", label: "Khoa", type: "text" },
    ],
  },
  {
    title: "Phân quyền",
    description: "Kiểm soát cấp truy cập và trạng thái vận hành.",
    fields: [
      { name: "role", label: "Vai trò", type: "select", options: USER_ROLE_OPTIONS, required: true },
      { name: "status", label: "Trạng thái", type: "select", options: USER_STATUS_OPTIONS, required: true },
      { name: "isVerified", label: "Đã xác minh", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Mặc định đăng ký",
    description: "Kiểm soát luồng tiếp nhận người dùng mới theo mặc định.",
    items: [
      { name: "autoApprove", label: "Tự động phê duyệt người dùng mới", value: "off", type: "toggle" },
      {
        name: "defaultRole",
        label: "Vai trò mặc định",
        value: "student",
        type: "select",
        options: USER_ROLE_OPTIONS,
      },
    ],
  },
  {
    title: "Quy tắc kiểm duyệt",
    description: "Giữ chất lượng và độ an toàn của tài khoản trong tầm kiểm soát.",
    items: [
      { name: "requireEmail", label: "Yêu cầu email đã xác minh", value: "on", type: "toggle" },
      { name: "blockNewAdmins", label: "Chặn tạo trực tiếp quản trị viên", value: "on", type: "toggle" },
    ],
  },
  {
    title: "Quy trình lời mời",
    description: "Tinh chỉnh cách hệ thống xử lý lời mời.",
    items: [
      { name: "inviteExpires", label: "Thời hạn lời mời", value: "7 ngày", type: "text" },
      { name: "sendReminder", label: "Gửi nhắc nhở", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "user-001": [
    {
      title: "Thông tin cơ bản",
      items: [
        { label: "Họ và tên", value: "Nguyễn Đức Toàn" },
        { label: "Vai trò", value: "Sinh viên" },
        { label: "Trạng thái", value: "Đang hoạt động" },
      ],
    },
    {
      title: "Bối cảnh học tập",
      items: [
        { label: "Khoa", value: "Công nghệ thông tin" },
        { label: "Email", value: "nguyenductoan@example.edu" },
        { label: "Ngày tham gia", value: "2025-09-01" },
      ],
    },
  ],
  "user-002": [
    {
      title: "Thông tin cơ bản",
      items: [
        { label: "Họ và tên", value: "Lê Minh Anh" },
        { label: "Vai trò", value: "Giảng viên" },
        { label: "Trạng thái", value: "Chờ xác minh" },
      ],
    },
    {
      title: "Bối cảnh giảng dạy",
      items: [
        { label: "Khoa", value: "Hệ thống thông tin" },
        { label: "Email", value: "leminhanh@example.edu" },
        { label: "Ngày tham gia", value: "2025-09-18" },
      ],
    },
  ],
  "user-003": [
    {
      title: "Thông tin cơ bản",
      items: [
        { label: "Họ và tên", value: "Phạm Gia Hủy" },
        { label: "Vai trò", value: "Quản trị viên" },
        { label: "Trạng thái", value: "Đã chặn" },
      ],
    },
    {
      title: "Bối cảnh quản trị",
      items: [
        { label: "Đơn vị", value: "Khối quản trị" },
        { label: "Email", value: "phamgiahuy@example.edu" },
        { label: "Ngày tham gia", value: "2025-07-07" },
      ],
    },
  ],
}

export const USERS_ADMIN_MODULE: AdminModuleDefinition<UserCells> = {
  key: "users",
  label: "Người dùng",
  description: "Quản lý tài khoản, vai trò và quy tắc kiểm duyệt người dùng.",
  basePath: "/admin/users",
  icon: "Users",
  entityNameSingular: "người dùng",
  entityNamePlural: "người dùng",
  paths: createAdminModulePaths("/admin/users"),
  navItem: {
    label: "Người dùng",
    href: "/admin/users",
    icon: "Users",
    description: "Quản lý tài khoản và quyền truy cập",
  },
  stats: [
    { label: "Tổng người dùng", value: "128" },
    { label: "Đang hoạt động", value: "94" },
    { label: "Chờ xác minh", value: "18" },
    { label: "Đã chặn", value: "6" },
  ],
  tabs: [
    { label: "Tất cả", value: "all", active: true },
    { label: "Sinh viên", value: "students" },
    { label: "Giảng viên", value: "lecturers" },
    { label: "Quản trị viên", value: "admins" },
  ],
  columns: [
    { key: "title", header: "Họ và tên" },
    { key: "email", header: "Email" },
    { key: "role", header: "Vai trò" },
    { key: "faculty", header: "Khoa" },
    { key: "status", header: "Trạng thái" },
    { key: "joinedAt", header: "Ngày tham gia" },
  ],
  records: USERS_RECORDS,
  quickActions: [
    {
      label: "Import tài khoản",
      href: "/admin/users/import",
      icon: "Users",
      description: "Upload CSV/XLSX để tạo tài khoản trường",
    },
    {
      label: "Mở cài đặt",
      href: "/admin/users/settings",
      icon: "Users",
      description: "Rà soát thiết lập đăng ký",
    },
  ],
  getDetailSections: (id) => detailSectionsById[id],
  createSections,
  editSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/users/${id}`,
  buildEditPath: (id) => `/admin/users/${id}/edit`,
  buildNewPath: () => "/admin/users/import",
  buildSettingsPath: () => "/admin/users/settings",
  getRecord: (id) => USERS_RECORDS.find((record) => record.id === id),
}
