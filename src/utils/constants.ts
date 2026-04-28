// Hằng số toàn cục cho ứng dụng UniConnect

export const APP_NAME = "TLU COMMUNITY";
export const APP_DESCRIPTION = "Mạng xã hội dành cho sinh viên đại học Thăng Long";

// Pagination mặc định
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Upload limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

// Routes
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  FEED: "/feed",
  MESSAGES: "/messages",
  NOTIFICATIONS: "/notifications",
  PROFILE: "/profile",
  CLUBS: "/clubs",
  ADMIN_DASHBOARD: "/dashboard",
  ADMIN_ANNOUNCEMENTS: "/announcements",
  ADMIN_USERS: "/users",
} as const;
