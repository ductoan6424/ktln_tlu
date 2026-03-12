"use client"

import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { BreadcrumbNav } from "@/components/admin/breadcrumb-nav"
import { SearchInput } from "@/components/shared/search-input"
import { IconButton } from "@/components/shared/icon-button"
import { Bell } from "lucide-react"

const ADMIN_USER = {
  name: "Nguyễn Quản trị",
  role: "Quản trị viên",
}

const BREADCRUMB_MAP: Record<string, { label: string; href?: string }[]> = {
  "/admin/dashboard": [
    { label: "Bảng điều khiển" },
  ],
  "/admin/announcements": [
    { label: "Bảng điều khiển", href: "/admin/dashboard" },
    { label: "Tạo thông báo" },
  ],
  "/admin/users": [
    { label: "Bảng điều khiển", href: "/admin/dashboard" },
    { label: "Người dùng" },
  ],
  "/admin/analytics": [
    { label: "Bảng điều khiển", href: "/admin/dashboard" },
    { label: "Phân tích" },
  ],
  "/admin/settings": [
    { label: "Bảng điều khiển", href: "/admin/dashboard" },
    { label: "Cài đặt" },
  ],
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const breadcrumbs = BREADCRUMB_MAP[pathname] || [{ label: "Bảng điều khiển" }]

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar
        activeHref={pathname}
        user={ADMIN_USER}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-8 shrink-0">
          <BreadcrumbNav items={breadcrumbs} />
          <div className="flex items-center gap-4">
            <SearchInput placeholder="Tìm kiếm tài nguyên..." className="w-64" />
            <div className="relative">
              <IconButton icon={Bell} ariaLabel="Thông báo" />
              <span className="absolute top-1 right-1 size-2 bg-destructive rounded-full border-2 border-card" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
