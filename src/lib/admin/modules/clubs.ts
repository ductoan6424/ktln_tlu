import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface ClubCells {
  title: string
  category: string
  members: string
  owner: string
  privacy: string
  moderated: string
  status: string
}

const CLUB_RECORDS: AdminRecord<ClubCells>[] = [
  {
    id: "club-001",
    title: "CLB Tin học",
    subtitle: "Công nghệ",
    status: "active",
    cells: {
      title: "CLB Tin học",
      category: "Công nghệ",
      members: "120",
      owner: "Nguyễn Đức Toàn",
      privacy: "Công khai",
      moderated: "on",
      status: "Đang hoạt động",
    },
  },
  {
    id: "club-002",
    title: "CLB Truyền thông",
    subtitle: "Truyền thông",
    status: "review",
    cells: {
      title: "CLB Truyền thông",
      category: "Truyền thông",
      members: "64",
      owner: "Lê Minh Anh",
      privacy: "Riêng tư",
      moderated: "off",
      status: "Chờ rà soát",
    },
  },
]

const CLUB_CATEGORY_OPTIONS = [
  { label: "Công nghệ", value: "technology" },
  { label: "Truyền thông", value: "media" },
  { label: "Nghệ thuật", value: "arts" },
  { label: "Thể thao", value: "sports" },
] as const

const CLUB_PRIVACY_OPTIONS = [
  { label: "Công khai", value: "public" },
  { label: "Riêng tư", value: "private" },
] as const

const CLUB_REVIEWER_ROLE_OPTIONS = [
  { label: "Quản trị viên", value: "admin" },
  { label: "Ban chủ nhiệm CLB", value: "club-admin" },
  { label: "Điều phối viên", value: "moderator" },
] as const

const formSections: AdminFormSection[] = [
  {
    title: "Thông tin câu lạc bộ",
    description: "Các thông tin nhận diện cơ bản và người phụ trách của CLB.",
    fields: [
      { name: "name", label: "Tên câu lạc bộ", type: "text", required: true },
      { name: "category", label: "Lĩnh vực", type: "select", options: CLUB_CATEGORY_OPTIONS },
      { name: "owner", label: "Người phụ trách", type: "text", required: true },
    ],
  },
  {
    title: "Quyền truy cập",
    description: "Thiết lập quyền riêng tư, lời mời và kiểm duyệt bài viết.",
    fields: [
      { name: "privacy", label: "Quyền riêng tư", type: "select", options: CLUB_PRIVACY_OPTIONS, required: true },
      { name: "moderated", label: "Bật kiểm duyệt", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Quy trình phê duyệt",
    description: "Kiểm soát cách CLB mới được rà soát trước khi hiển thị.",
    items: [
      { name: "requireApproval", label: "Yêu cầu phê duyệt", value: "on", type: "toggle" },
      {
        name: "reviewerRole",
        label: "Vai trò người duyệt",
        value: "admin",
        type: "select",
        options: CLUB_REVIEWER_ROLE_OPTIONS,
      },
    ],
  },
  {
    title: "Giới hạn thành viên",
    description: "Thiết lập giới hạn an toàn cho quá trình mở rộng CLB.",
    items: [
      { name: "maxMembers", label: "Số thành viên tối đa", value: "500", type: "number" },
      { name: "allowWaitlist", label: "Cho phép danh sách chờ", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "club-001": [
    {
      title: "Tổng quan câu lạc bộ",
      items: [
        { label: "Tên câu lạc bộ", value: "CLB Tin học" },
        { label: "Lĩnh vực", value: "Công nghệ" },
        { label: "Thành viên", value: "120" },
      ],
    },
    {
      title: "Bối cảnh liên quan",
      items: [
        { label: "Khoa liên kết", value: "Công nghệ thông tin" },
        { label: "Sự kiện liên kết", value: "Hackathon TLU" },
        { label: "Quyền riêng tư", value: "Công khai" },
      ],
    },
  ],
  "club-002": [
    {
      title: "Tổng quan câu lạc bộ",
      items: [
        { label: "Tên câu lạc bộ", value: "CLB Truyền thông" },
        { label: "Lĩnh vực", value: "Truyền thông" },
        { label: "Thành viên", value: "64" },
      ],
    },
    {
      title: "Bối cảnh liên quan",
      items: [
        { label: "Khoa liên kết", value: "Truyền thông đa phương tiện" },
        { label: "Sự kiện liên kết", value: "Ngày hội tuyển thành viên" },
        { label: "Quyền riêng tư", value: "Riêng tư" },
      ],
    },
  ],
}

export const CLUBS_ADMIN_MODULE: AdminModuleDefinition<ClubCells> = {
  key: "clubs",
  label: "Câu lạc bộ",
  description: "Quản lý câu lạc bộ, ban chủ nhiệm, thành viên và thiết lập kiểm duyệt đi kèm.",
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
    { label: "Tổng CLB", value: "18" },
    { label: "Đang hoạt động", value: "14" },
    { label: "Riêng tư", value: "4" },
    { label: "Cần rà soát", value: "2" },
  ],
  tabs: [
    { label: "Tất cả", value: "all", active: true },
    { label: "Công nghệ", value: "technology" },
    { label: "Truyền thông", value: "media" },
    { label: "Nghệ thuật", value: "arts" },
    { label: "Thể thao", value: "sports" },
  ],
  columns: [
    { key: "title", header: "Tên câu lạc bộ" },
    { key: "category", header: "Lĩnh vực" },
    { key: "members", header: "Thành viên" },
    { key: "owner", header: "Người phụ trách" },
    { key: "status", header: "Trạng thái" },
  ],
  records: CLUB_RECORDS,
  quickActions: [
    {
      label: "Tạo câu lạc bộ",
      href: "/admin/clubs/new",
      icon: "UsersRound",
      description: "Mở biểu mẫu tạo CLB mới",
    },
    {
      label: "Mở cài đặt",
      href: "/admin/clubs/settings",
      icon: "UsersRound",
      description: "Rà soát thiết lập kiểm duyệt mặc định",
    },
  ],
  getDetailSections: (id) => detailSectionsById[id],
  createSections: formSections,
  editSections: formSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/clubs/${id}`,
  buildEditPath: (id) => `/admin/clubs/${id}/edit`,
  buildNewPath: () => "/admin/clubs/new",
  buildSettingsPath: () => "/admin/clubs/settings",
  getRecord: (id) => CLUB_RECORDS.find((record) => record.id === id),
}
