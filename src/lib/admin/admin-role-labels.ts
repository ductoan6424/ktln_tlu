// Bản đồ nhãn tiếng Việt cho các admin role hệ thống.
// Dữ liệu gốc trong DB được seed bằng tiếng Anh (xem migration 202604220130),
// nên phía ứng dụng tra cứu tên và mô tả hiển thị theo `code` ổn định.

const ADMIN_ROLE_LABELS: Record<string, string> = {
  USER_ADMIN: "Quản trị người dùng",
  CONTENT_MODERATOR: "Kiểm duyệt nội dung",
  ANNOUNCEMENT_MANAGER: "Quản lý thông báo",
  ANALYTICS_VIEWER: "Xem báo cáo thống kê",
  COURSE_ADMIN: "Quản trị lớp học",
  SUBJECT_MANAGER: "Quản lý môn học",
  CLUB_MANAGER: "Quản lý câu lạc bộ",
  GROUP_MANAGER: "Quản lý nhóm",
  EVENT_MANAGER: "Quản lý sự kiện",
  ADMIN_ROLE_MANAGER: "Quản lý phân quyền quản trị",
}

const ADMIN_ROLE_DESCRIPTIONS: Record<string, string> = {
  USER_ADMIN: "Gói quyền mặc định cho việc quản lý tài khoản người dùng.",
  CONTENT_MODERATOR: "Gói quyền mặc định cho việc kiểm duyệt bài viết.",
  ANNOUNCEMENT_MANAGER: "Gói quyền mặc định cho việc quản lý thông báo của trường.",
  ANALYTICS_VIEWER: "Gói quyền mặc định cho việc xem các báo cáo thống kê.",
  COURSE_ADMIN: "Gói quyền mặc định cho việc quản lý lớp học.",
  SUBJECT_MANAGER: "Gói quyền mặc định cho việc quản lý môn học.",
  CLUB_MANAGER: "Gói quyền mặc định cho việc quản lý câu lạc bộ.",
  GROUP_MANAGER: "Gói quyền mặc định cho việc quản lý nhóm người dùng.",
  EVENT_MANAGER: "Gói quyền mặc định cho việc quản lý sự kiện.",
  ADMIN_ROLE_MANAGER: "Gói quyền mặc định cho việc cấp và thu hồi gói quyền quản trị.",
}

export function getAdminRoleLabel(code: string, fallback?: string | null): string {
  return ADMIN_ROLE_LABELS[code] ?? fallback ?? code
}

export function getAdminRoleDescription(
  code: string,
  fallback?: string | null,
): string | null {
  return ADMIN_ROLE_DESCRIPTIONS[code] ?? fallback ?? null
}
