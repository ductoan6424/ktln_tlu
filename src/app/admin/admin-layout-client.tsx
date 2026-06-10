"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { usePathname } from "next/navigation"

import { searchAdmin, type AdminSearchResult } from "@/actions/admin-search"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { BreadcrumbNav } from "@/components/admin/breadcrumb-nav"
import { SearchInput } from "@/components/shared/search-input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AdminNotifications } from "@/lib/admin/admin-notifications"
import { getAdminBreadcrumbItems } from "@/lib/admin/admin-route-meta"
import { Bell, Menu, X } from "lucide-react"

interface AdminLayoutClientProps {
  user: {
    name: string
    role: string
    avatarSrc?: string
  }
  notifications: AdminNotifications
  children: React.ReactNode
}

export function AdminLayoutClient({ user, notifications, children }: AdminLayoutClientProps) {
  const pathname = usePathname()

  return (
    <AdminLayoutShell key={pathname} pathname={pathname} user={user} notifications={notifications}>
      {children}
    </AdminLayoutShell>
  )
}

interface AdminLayoutShellProps extends AdminLayoutClientProps {
  pathname: string
}

function AdminLayoutShell({ pathname, user, notifications, children }: AdminLayoutShellProps) {
  const breadcrumbs = getAdminBreadcrumbItems(pathname)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden">
      <div className="hidden lg:block">
        <AdminSidebar activeHref={pathname} user={user} />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <button
            type="button"
            aria-label="Đóng menu quản trị"
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

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-2">
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
            <AdminGlobalSearch />
            <AdminNotificationMenu notifications={notifications} />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</div>
      </main>
    </div>
  )
}

function AdminGlobalSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AdminSearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleQueryChange(value: string) {
    setQuery(value)
    setOpen(Boolean(value.trim()))

    if (value.trim().length < 2) {
      setResults([])
      return
    }

    startTransition(async () => {
      const response = await searchAdmin({ query: value })
      setResults(response.success ? response.data ?? [] : [])
    })
  }

  return (
    <div className="relative hidden w-72 md:block">
      <SearchInput
        placeholder="Tìm kiếm trong quản trị..."
        value={query}
        onChange={handleQueryChange}
        onFocus={() => setOpen(Boolean(query.trim()))}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false)
        }}
      />
      {open ? (
        <div className="absolute right-0 top-11 z-50 w-96 overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-lg">
          <div className="max-h-96 overflow-y-auto p-2">
            {query.trim().length < 2 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Nhập ít nhất 2 ký tự.</p>
            ) : isPending ? (
              <AdminSearchSkeletonList />
            ) : results.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">Không có kết quả phù hợp.</p>
            ) : (
              results.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setOpen(false)}
                >
                  <span className="text-xs font-medium text-muted-foreground">{item.type}</span>
                  <span className="block font-medium text-foreground">{item.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function AdminSearchSkeletonList() {
  return (
    <div aria-busy="true" className="flex flex-col">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex flex-col gap-2 rounded-md px-3 py-2">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

function AdminNotificationMenu({ notifications }: { notifications: AdminNotifications }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Thông báo quản trị"
        className="relative inline-flex size-9 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-4" />
        {notifications.total > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {notifications.total > 9 ? "9+" : notifications.total}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-80">
        <div className="max-h-80 overflow-y-auto">
          {notifications.items.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Không có việc cần chú ý.</p>
          ) : (
            notifications.items.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-md px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="block text-xs text-muted-foreground">{item.description}</span>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
