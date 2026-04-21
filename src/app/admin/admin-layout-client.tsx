"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"

import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { BreadcrumbNav } from "@/components/admin/breadcrumb-nav"
import { IconButton } from "@/components/shared/icon-button"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { getAdminBreadcrumbItems } from "@/lib/admin/admin-route-meta"
import { Bell, Menu, X } from "lucide-react"

interface AdminLayoutClientProps {
  user: {
    name: string
    role: string
    avatarSrc?: string
  }
  children: React.ReactNode
}

export function AdminLayoutClient({ user, children }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const breadcrumbs = getAdminBreadcrumbItems(pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden lg:block">
        <AdminSidebar activeHref={pathname} user={user} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl animate-in slide-in-from-left duration-200">
            <AdminSidebar activeHref={pathname} user={user} />
          </div>
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

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:h-16 lg:px-8">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 shrink-0 rounded-full lg:hidden"
              onClick={() => setSidebarOpen(true)}
              aria-label="Mở menu"
            >
              <Menu className="size-5" />
            </Button>
            <BreadcrumbNav items={breadcrumbs} />
          </div>
          <div className="flex items-center gap-3">
            <SearchInput
              placeholder="Tìm kiếm trong quản trị..."
              className="hidden w-64 md:block"
            />
            <div className="relative">
              <IconButton icon={Bell} ariaLabel="Thông báo" />
              <span className="absolute top-1 right-1 size-2 rounded-full border-2 border-card bg-destructive" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}
