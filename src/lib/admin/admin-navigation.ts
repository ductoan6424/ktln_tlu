import { ADMIN_MODULES } from "@/lib/admin/admin-modules"
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Settings,
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

const ADMIN_MODULE_ICONS = {
  users: Users,
  subjects: BookOpen,
  groups: UsersRound,
  events: CalendarDays,
} satisfies Record<(typeof ADMIN_MODULES)[number]["key"], LucideIcon>

export const ADMIN_MANAGEMENT_NAV_ITEMS = ADMIN_MODULES.map((module) => ({
  icon: ADMIN_MODULE_ICONS[module.key],
  label: module.label,
  href: module.navItem.href,
})) satisfies AdminNavItem[]

export const ADMIN_CORE_NAV_ITEMS = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    href: "/admin/dashboard",
  },
  {
    icon: Megaphone,
    label: "Thong bao",
    href: "/admin/announcements",
  },
  {
    icon: BarChart3,
    label: "Phan tich",
    href: "/admin/analytics",
  },
  {
    icon: Settings,
    label: "Cai dat he thong",
    href: "/admin/settings",
  },
] satisfies AdminNavItem[]

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    label: "Tong quan",
    items: ADMIN_CORE_NAV_ITEMS,
  },
  {
    label: "Quan ly",
    items: ADMIN_MANAGEMENT_NAV_ITEMS,
  },
]
