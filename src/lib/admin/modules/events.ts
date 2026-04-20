import { createAdminModulePaths } from "@/lib/admin/admin-route-builders"
import type {
  AdminDetailSection,
  AdminFormSection,
  AdminModuleDefinition,
  AdminRecord,
  AdminSettingsSection,
} from "@/lib/admin/admin-types"

interface EventCells {
  title: string
  type: string
  location: string
  registration: string
  schedule: string
  organizer: string
  participants: string
  status: string
}

const EVENT_RECORDS: AdminRecord<EventCells>[] = [
  {
    id: "event-001",
    title: "Ngày hội định hướng",
    subtitle: "Sự kiện nội bộ",
    status: "upcoming",
    cells: {
      title: "Ngày hội định hướng",
      type: "Nội bộ",
      location: "Hội trường lớn",
      registration: "Mở đăng ký",
      schedule: "2026-08-20 09:00",
      organizer: "Phòng công tác sinh viên",
      participants: "240",
      status: "Sắp diễn ra",
    },
  },
  {
    id: "event-002",
    title: "Triển lãm nghiên cứu",
    subtitle: "Sự kiện học thuật",
    status: "open",
    cells: {
      title: "Triển lãm nghiên cứu",
      type: "Học thuật",
      location: "Trung tâm đổi mới sáng tạo",
      registration: "Cần phê duyệt",
      schedule: "2026-09-02 13:30",
      organizer: "Ban chủ nhiệm khoa",
      participants: "180",
      status: "Đang mở",
    },
  },
]

const EVENT_TYPE_OPTIONS = [
  { label: "Học thuật", value: "academic" },
  { label: "Câu lạc bộ", value: "club" },
  { label: "Hội thảo", value: "workshop" },
  { label: "Nội bộ", value: "internal" },
] as const

const EVENT_REGISTRATION_OPTIONS = [
  { label: "Mở đăng ký", value: "open" },
  { label: "Cần phê duyệt", value: "approval-required" },
  { label: "Đã đóng", value: "closed" },
] as const

const formSections: AdminFormSection[] = [
  {
    title: "Thông tin sự kiện",
    description: "Thông tin nhận diện và lịch trình cốt lõi của sự kiện.",
    fields: [
      { name: "title", label: "Tên sự kiện", type: "text", required: true },
      { name: "type", label: "Loại sự kiện", type: "select", options: EVENT_TYPE_OPTIONS, required: true },
      { name: "location", label: "Địa điểm", type: "text", required: true },
    ],
  },
  {
    title: "Đăng ký",
    description: "Thiết lập luồng đăng ký và cách sự kiện được hiển thị.",
    fields: [
      {
        name: "registration",
        label: "Hình thức đăng ký",
        type: "select",
        options: EVENT_REGISTRATION_OPTIONS,
        required: true,
      },
      { name: "featured", label: "Nổi bật", type: "toggle" },
    ],
  },
]

const settingsSections: AdminSettingsSection[] = [
  {
    title: "Mặc định đăng ký",
    description: "Thiết lập dùng chung cho các bản nháp sự kiện mới.",
    items: [
      { name: "requireApproval", label: "Yêu cầu phê duyệt", value: "on", type: "toggle" },
      { name: "allowGuest", label: "Cho phép khách mời", value: "on", type: "toggle" },
    ],
  },
  {
    title: "Quy tắc nhắc lịch",
    description: "Thiết lập nhắc lịch tự động cho các sự kiện sắp diễn ra.",
    items: [
      { name: "firstReminder", label: "Lần nhắc đầu tiên", value: "3 ngày", type: "text" },
      { name: "secondReminder", label: "Lần nhắc thứ hai", value: "1 ngày", type: "text" },
    ],
  },
  {
    title: "Quy tắc hiển thị",
    description: "Cách sự kiện xuất hiện trước cộng đồng.",
    items: [
      { name: "showInFeed", label: "Hiển thị trên bảng tin", value: "on", type: "toggle" },
      { name: "showOrganizer", label: "Hiển thị đơn vị tổ chức", value: "on", type: "toggle" },
    ],
  },
]

const detailSectionsById: Record<string, AdminDetailSection[]> = {
  "event-001": [
    {
      title: "Tổng quan sự kiện",
      items: [
        { label: "Tên sự kiện", value: "Ngày hội định hướng" },
        { label: "Loại sự kiện", value: "Sự kiện nội bộ" },
        { label: "Trạng thái", value: "Sắp diễn ra" },
      ],
    },
    {
      title: "Bối cảnh sự kiện",
      items: [
        { label: "Đơn vị tổ chức", value: "Phòng công tác sinh viên" },
        { label: "Nhóm liên kết", value: "Ban cán sự sinh viên" },
        { label: "Môn học liên kết", value: "Kỹ năng nhập môn" },
      ],
    },
  ],
  "event-002": [
    {
      title: "Tổng quan sự kiện",
      items: [
        { label: "Tên sự kiện", value: "Triển lãm nghiên cứu" },
        { label: "Loại sự kiện", value: "Sự kiện học thuật" },
        { label: "Trạng thái", value: "Đang mở" },
      ],
    },
    {
      title: "Bối cảnh sự kiện",
      items: [
        { label: "Đơn vị tổ chức", value: "Ban chủ nhiệm khoa" },
        { label: "Nhóm liên kết", value: "Phòng thí nghiệm nghiên cứu" },
        { label: "Môn học liên kết", value: "Phương pháp nghiên cứu" },
      ],
    },
  ],
}

export const EVENTS_ADMIN_MODULE: AdminModuleDefinition<EventCells> = {
  key: "events",
  label: "Sự kiện",
  description: "Quản lý thông báo sự kiện, đăng ký tham gia và các quy tắc hiển thị.",
  basePath: "/admin/events",
  icon: "CalendarDays",
  entityNameSingular: "sự kiện",
  entityNamePlural: "sự kiện",
  paths: createAdminModulePaths("/admin/events"),
  navItem: {
    label: "Sự kiện",
    href: "/admin/events",
    icon: "CalendarDays",
    description: "Quản lý sự kiện và nhắc lịch",
  },
  stats: [
    { label: "Tổng sự kiện", value: "36" },
    { label: "Sắp diễn ra", value: "14" },
    { label: "Đang mở đăng ký", value: "9" },
    { label: "Đã kết thúc", value: "13" },
  ],
  tabs: [
    { label: "Tất cả", value: "all", active: true },
    { label: "Học thuật", value: "academic" },
    { label: "Câu lạc bộ", value: "club" },
    { label: "Hội thảo", value: "workshop" },
    { label: "Nội bộ", value: "internal" },
  ],
  columns: [
    { key: "title", header: "Tên sự kiện" },
    { key: "schedule", header: "Thời gian" },
    { key: "organizer", header: "Đơn vị tổ chức" },
    { key: "participants", header: "Số người tham gia" },
    { key: "status", header: "Trạng thái" },
  ],
  records: EVENT_RECORDS,
  quickActions: [
    {
      label: "Tạo sự kiện",
      href: "/admin/events/new",
      icon: "CalendarDays",
      description: "Mở biểu mẫu tạo sự kiện",
    },
    {
      label: "Mở cài đặt",
      href: "/admin/events/settings",
      icon: "CalendarDays",
      description: "Rà soát thiết lập đăng ký mặc định",
    },
  ],
  getDetailSections: (id) => detailSectionsById[id],
  createSections: formSections,
  editSections: formSections,
  settingsSections,
  buildDetailPath: (id) => `/admin/events/${id}`,
  buildEditPath: (id) => `/admin/events/${id}/edit`,
  buildNewPath: () => "/admin/events/new",
  buildSettingsPath: () => "/admin/events/settings",
  getRecord: (id) => EVENT_RECORDS.find((record) => record.id === id),
}
