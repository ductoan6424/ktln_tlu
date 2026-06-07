export const SYSTEM_SETTING_KEYS = {
  name: "system.name",
  description: "system.description",
  url: "system.url",
  contactEmail: "system.contact_email",
  allowedEmailDomains: "auth.allowed_email_domains",
} as const

export type SystemSettingKey =
  (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS]

export const USER_IMPORT_SETTING_KEYS = {
  allowedEmailDomains: "admin.users.import.allowed_email_domains",
  duplicateStrategy: "admin.users.import.duplicate_strategy",
  defaultRole: "admin.users.import.default_role",
  maxRows: "admin.users.import.max_rows",
  requirePreview: "admin.users.import.require_preview",
} as const

export const USER_IMPORT_DEFAULTS = {
  allowedEmailDomains: ["tlu.edu.vn", "e.tlu.edu.vn", "thanglong.edu.vn"],
  duplicateStrategy: "skip",
  defaultRole: "STUDENT",
  maxRows: 1000,
  requirePreview: true,
} as const

export const EVENT_ADMIN_SETTING_KEYS = {
  defaultRegistrationStatus: "admin.events.default_registration_status",
  defaultCapacity: "admin.events.default_capacity",
  defaultType: "admin.events.default_type",
  defaultPublishMode: "admin.events.default_publish_mode",
  allowSelfCancellation: "admin.events.allow_self_cancellation",
} as const

export const EVENT_ADMIN_DEFAULTS = {
  defaultRegistrationStatus: "OPEN",
  defaultCapacity: 100,
  defaultType: "OTHER",
  defaultPublishMode: "draft",
  allowSelfCancellation: true,
} as const

export const SYSTEM_DEFAULTS = {
  name: "TLU Community",
  description:
    "Mạng xã hội nội bộ dành cho sinh viên và giảng viên Trường Đại học Thăng Long",
  url: "https://community.tlu.edu.vn",
  contactEmail: "support@tlu.edu.vn",
  allowedEmailDomains: ["tlu.edu.vn", "e.tlu.edu.vn", "thanglong.edu.vn"],
} as const

export const MODULE_FLAG_KEYS = [
  "feed",
  "messages",
  "clubs",
  "events",
  "groups",
  "courses",
  "announcements",
] as const

export type ModuleFlagKey = (typeof MODULE_FLAG_KEYS)[number]

export const MODULE_FLAG_LABELS: Record<ModuleFlagKey, string> = {
  feed: "Bảng tin",
  messages: "Tin nhắn",
  clubs: "Câu lạc bộ",
  events: "Sự kiện",
  groups: "Nhóm học tập",
  courses: "Môn học",
  announcements: "Thông báo chính thức",
}

export const MODULE_FLAG_DESCRIPTIONS: Record<ModuleFlagKey, string> = {
  feed: "Cho phép sinh viên và giảng viên đăng bài, chia sẻ thông tin",
  messages: "Hệ thống nhắn tin trực tiếp giữa các thành viên",
  clubs: "Quản lý CLB, đội nhóm sinh hoạt trong trường",
  events: "Tạo và quản lý sự kiện, hoạt động trong trường",
  groups: "Nhóm học tập, thảo luận theo chủ đề",
  courses: "Quản lý lớp học phần và môn học của giảng viên",
  announcements: "Hiển thị thông báo chính thức từ nhà trường",
}
