export type MainNavIcon = "home" | "users" | "calendar-days" | "users-round"

export interface MainNavItem {
  icon: MainNavIcon
  label: string
  href: string
}

export const MAIN_NAV_ITEMS: MainNavItem[] = [
  { icon: "home", label: "Trang chủ", href: "/feed" },
  { icon: "users", label: "Mạng lưới", href: "/clubs" },
  { icon: "calendar-days", label: "Sự kiện", href: "/events" },
  { icon: "users-round", label: "Nhóm", href: "/groups" },
]
