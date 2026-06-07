import { ADMIN_MODULES } from "@/lib/admin/admin-modules"
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Settings,
  ShieldAlert,
  Users,
  UsersRound,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface AdminNavItem {
  icon: LucideIcon
  label: string
  href: string
  badge?: number
}

export interface AdminNavSection {
  label: string
  items: AdminNavItem[]
}

export interface AdminModuleRouteLabels {
  list: string
  create: string
  settings: string
  detail: string
}

const ADMIN_MODULE_ICONS = {
  users: Users,
  subjects: BookOpen,
  groups: UsersRound,
  events: CalendarDays,
} satisfies Record<(typeof ADMIN_MODULES)[number]["key"], LucideIcon>

export const ADMIN_MODULE_ROUTE_LABELS = {
  users: {
    list: "Quản lý người dùng",
    create: "Tạo mới",
    settings: "Cài đặt phân hệ",
    detail: "Chi tiết người dùng",
  },
  subjects: {
    list: "Quản lý lớp học",
    create: "Tạo mới",
    settings: "Cài đặt phân hệ",
    detail: "Chi tiết lớp học",
  },
  groups: {
    list: "Quản lý nhóm",
    create: "Tạo mới",
    settings: "Cài đặt phân hệ",
    detail: "Chi tiết nhóm",
  },
  events: {
    list: "Quản lý sự kiện",
    create: "Tạo mới",
    settings: "Cài đặt phân hệ",
    detail: "Chi tiết sự kiện",
  },
} satisfies Record<
  (typeof ADMIN_MODULES)[number]["key"],
  AdminModuleRouteLabels
>

export const ADMIN_MANAGEMENT_NAV_ITEMS = ADMIN_MODULES.map((module) => ({
  icon: ADMIN_MODULE_ICONS[module.key],
  label: module.label,
  href: module.navItem.href,
})) satisfies AdminNavItem[]

export const ADMIN_CORE_NAV_ITEMS = [
  {
    icon: LayoutDashboard,
    label: "Bảng điều khiển",
    href: "/admin/dashboard",
  },
  {
    icon: ShieldAlert,
    label: "Kiểm duyệt",
    href: "/admin/moderation",
  },
  {
    icon: Megaphone,
    label: "Thông báo",
    href: "/admin/announcements",
  },
  {
    icon: BarChart3,
    label: "Phân tích",
    href: "/admin/analytics",
  },
  {
    icon: Settings,
    label: "Cài đặt hệ thống",
    href: "/admin/settings",
  },
] satisfies AdminNavItem[]

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Tổng quan",
    items: ADMIN_CORE_NAV_ITEMS,
  },
  {
    label: "Quản lý",
    items: ADMIN_MANAGEMENT_NAV_ITEMS,
  },
]
