import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface GroupCells {
  title: string
  type: string
  members: string
  owner: string
  privacy: string
  moderated: string
  status: string
}

const GROUP_RECORDS: AdminRecord<GroupCells>[] = [
  {
    id: "group-001",
    title: "Câu lạc bộ học tập AI",
    subtitle: "Nhóm học tập",
    status: "active",
    cells: {
      title: "Câu lạc bộ học tập AI",
      type: "Nhóm học tập",
      members: "24",
      owner: "Nguyễn Đức Toàn",
      privacy: "Riêng tư",
      moderated: "on",
      status: "Đang hoạt động",
    },
  },
  {
    id: "group-002",
    title: "Đội ngũ đồ án tốt nghiệp",
    subtitle: "Nhóm dự án",
    status: "review",
    cells: {
      title: "Đội ngũ đồ án tốt nghiệp",
      type: "Nhóm dự án",
      members: "13",
      owner: "Lê Minh Anh",
      privacy: "Công khai",
      moderated: "off",
      status: "Chờ rà soát",
    },
  },
]

const GROUP_TYPE_OPTIONS = [
  { label: "Nhóm học tập", value: "study-group" },
  { label: "Nhóm dự án", value: "project-group" },
  { label: "Cộng đồng", value: "community" },
] as const

const GROUP_PRIVACY_OPTIONS = [
  { label: "Công khai", value: "public" },
  { label: "Riêng tư", value: "private" },
  { label: "Chỉ theo lời mời", value: "invite-only" },
] as const

const GROUP_REVIEWER_ROLE_OPTIONS = [
  { label: "Quản trị viên", value: "admin" },
  { label: "Giảng viên", value: "lecturer" },
  { label: "Điều phối viên", value: "moderator" },
] as const

const formSections: AdminFormSection[] = [
  {
    title: "Thông tin nhóm",
    description: "Các thông tin nhận diện cơ bản và người phụ trách của nhóm.",
    fields: [
      { name: "name", label: "Tên nhóm", type: "text", required: true },
      { name: "type", label: "Loại nhóm", type: "select", options: GROUP_TYPE_OPTIONS, required: true },
      { name: "owner", label: "Người phụ trách", type: "text", required: true },
    ],
  },
  {
    title: "Quyền truy cập",
    description: "Thiết lập quyền riêng tư và kiểm duyệt.",
    fields: [
      { name: "privacy", label: "Quyền riêng tư", type: "select", options: GROUP_PRIVACY_OPTIONS, required: true },
      { name: "moderated", label: "Bật kiểm duyệt", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Quy trình phê duyệt",
    description: "Kiểm soát cách nhóm mới được rà soát trước khi hiển thị.",
    items: [
      { name: "requireApproval", label: "Yêu cầu phê duyệt", value: "on", type: "toggle" },
      {
        name: "reviewerRole",
        label: "Vai trò người duyệt",
        value: "admin",
        type: "select",
        options: GROUP_REVIEWER_ROLE_OPTIONS,
      },
    ],
  },
  {
    title: "Giới hạn thành viên",
    description: "Thiết lập giới hạn an toàn cho quá trình mở rộng nhóm.",
    items: [
      { name: "maxMembers", label: "Số thành viên tối đa", value: "100", type: "number" },
      { name: "allowWaitlist", label: "Cho phép danh sách chờ", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "group-001": [
    {
      title: "Tổng quan nhóm",
      items: [
        { label: "Tên nhóm", value: "Câu lạc bộ học tập AI" },
        { label: "Loại nhóm", value: "Nhóm học tập" },
        { label: "Thành viên", value: "24" },
      ],
    },
    {
      title: "Bối cảnh liên quan",
      items: [
        { label: "Môn học liên kết", value: "Cơ sở dữ liệu" },
        { label: "Sự kiện liên kết", value: "Hội thảo nghiên cứu" },
        { label: "Quyền riêng tư", value: "Riêng tư" },
      ],
    },
  ],
  "group-002": [
    {
      title: "Tổng quan nhóm",
      items: [
        { label: "Tên nhóm", value: "Đội ngũ đồ án tốt nghiệp" },
        { label: "Loại nhóm", value: "Nhóm dự án" },
        { label: "Thành viên", value: "13" },
      ],
    },
    {
      title: "Bối cảnh liên quan",
      items: [
        { label: "Môn học liên kết", value: "Kỹ thuật phần mềm" },
        { label: "Sự kiện liên kết", value: "Buổi phản biện đồ án" },
        { label: "Quyền riêng tư", value: "Công khai" },
      ],
    },
  ],
}

export const GROUPS_ADMIN_MODULE: AdminModuleDefinition<GroupCells> = {
  key: "groups",
  label: "Nhóm",
  description: "Quản lý các nhóm cộng tác và thiết lập kiểm duyệt đi kèm.",
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
    { label: "Tổng nhóm", value: "28" },
    { label: "Đang hoạt động", value: "19" },
    { label: "Riêng tư", value: "12" },
    { label: "Cần rà soát", value: "4" },
  ],
  tabs: [
    { label: "Tất cả", value: "all", active: true },
    { label: "Học tập", value: "study" },
    { label: "Dự án", value: "project" },
    { label: "Cộng đồng", value: "community" },
  ],
  columns: [
    { key: "title", header: "Tên nhóm" },
    { key: "type", header: "Loại" },
    { key: "members", header: "Thành viên" },
    { key: "owner", header: "Người phụ trách" },
    { key: "status", header: "Trạng thái" },
  ],
  records: GROUP_RECORDS,
  quickActions: [
    {
      label: "Tạo nhóm",
      href: "/admin/groups/new",
      icon: "UsersRound",
      description: "Mở biểu mẫu tạo nhóm mới",
    },
    {
      label: "Mở cài đặt",
      href: "/admin/groups/settings",
      icon: "UsersRound",
      description: "Rà soát thiết lập kiểm duyệt mặc định",
    },
  ],
  getDetailSections: (id) => detailSectionsById[id],
  createSections: formSections,
  editSections: formSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/groups/${id}`,
  buildEditPath: (id) => `/admin/groups/${id}/edit`,
  buildNewPath: () => "/admin/groups/new",
  buildSettingsPath: () => "/admin/groups/settings",
  getRecord: (id) => GROUP_RECORDS.find((record) => record.id === id),
}
