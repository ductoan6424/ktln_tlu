"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { BreadcrumbNav } from "@/components/admin/breadcrumb-nav"
import { SearchInput } from "@/components/shared/search-input"
import { IconButton } from "@/components/shared/icon-button"
import { Button } from "@/components/ui/button"
import { Bell, Menu, X } from "lucide-react"

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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  /* Đóng sidebar khi chuyển trang (click nav item) */
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar overlay — áp dụng cho mọi kích thước */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel */}
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl animate-in slide-in-from-left duration-200">
            <AdminSidebar
              activeHref={pathname}
              user={ADMIN_USER}
            />
          </div>
          {/* Nút đóng */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-3 left-[17rem] size-8 rounded-full bg-card/80 text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      )}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 lg:h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-8 shrink-0 gap-3">
          <div className="flex items-center gap-2">
            {/* Nút mở sidebar — hiện trên mọi kích thước */}
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full shrink-0"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </Button>
            <BreadcrumbNav items={breadcrumbs} />
          </div>
          <div className="flex items-center gap-3">
            <SearchInput
              placeholder="Tìm kiếm tài nguyên..."
              className="hidden md:block w-64"
            />
            <div className="relative">
              <IconButton icon={Bell} ariaLabel="Thông báo" />
              <span className="absolute top-1 right-1 size-2 bg-destructive rounded-full border-2 border-card" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

