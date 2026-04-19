import { ADMIN_MODULES } from "@/lib/admin/admin-modules"
import type { AdminBreadcrumbItem } from "@/lib/admin/admin-types"

type BreadcrumbKind = "list" | "create" | "settings" | "detail" | "edit"

const ADMIN_ROOT: AdminBreadcrumbItem = {
  label: "Admin",
  href: "/admin/dashboard",
}

const STATIC_BREADCRUMBS: Record<string, AdminBreadcrumbItem[]> = {
  "/admin/dashboard": [ADMIN_ROOT, { label: "Dashboard" }],
  "/admin/announcements": [ADMIN_ROOT, { label: "Thong bao" }],
  "/admin/analytics": [ADMIN_ROOT, { label: "Phan tich" }],
  "/admin/settings": [ADMIN_ROOT, { label: "Cai dat he thong" }],
}

const MODULE_BREADCRUMB_LABELS: Record<
  (typeof ADMIN_MODULES)[number]["key"],
  Record<BreadcrumbKind, string>
> = {
  users: {
    list: "Quan ly nguoi dung",
    create: "Tao nguoi dung",
    settings: "Cai dat nguoi dung",
    detail: "Chi tiet nguoi dung",
    edit: "Chinh sua",
  },
  subjects: {
    list: "Quan ly mon hoc",
    create: "Tao mon hoc",
    settings: "Cai dat mon hoc",
    detail: "Chi tiet mon hoc",
    edit: "Chinh sua",
  },
  groups: {
    list: "Quan ly group",
    create: "Tao group",
    settings: "Cai dat group",
    detail: "Chi tiet group",
    edit: "Chinh sua",
  },
  events: {
    list: "Quan ly su kien",
    create: "Tao su kien",
    settings: "Cai dat su kien",
    detail: "Chi tiet su kien",
    edit: "Chinh sua",
  },
}

const MODULE_BY_KEY = new Map(ADMIN_MODULES.map((module) => [module.key, module]))

function getModuleBreadcrumbItems(pathname: string): AdminBreadcrumbItem[] | null {
  const segments = pathname.split("/").filter(Boolean)

  if (segments[0] !== "admin" || segments.length < 2) {
    return null
  }

  const moduleKey = segments[1] as keyof typeof MODULE_BREADCRUMB_LABELS
  const adminModule = MODULE_BY_KEY.get(moduleKey)

  if (!adminModule) {
    return null
  }

  const labels = MODULE_BREADCRUMB_LABELS[adminModule.key]
  const baseHref = adminModule.basePath

  if (segments.length === 2) {
    return [ADMIN_ROOT, { label: labels.list }]
  }

  if (segments[2] === "new") {
    return [ADMIN_ROOT, { label: labels.list, href: baseHref }, { label: labels.create }]
  }

  if (segments[2] === "settings") {
    return [
      ADMIN_ROOT,
      { label: labels.list, href: baseHref },
      { label: labels.settings },
    ]
  }

  const recordId = segments[2]

  if (!recordId) {
    return [ADMIN_ROOT, { label: labels.list }]
  }

  if (segments[3] === "edit") {
    return [
      ADMIN_ROOT,
      { label: labels.list, href: baseHref },
      { label: labels.detail, href: `${baseHref}/${recordId}` },
      { label: labels.edit },
    ]
  }

  return [
    ADMIN_ROOT,
    { label: labels.list, href: baseHref },
    { label: labels.detail },
  ]
}

export function getAdminBreadcrumbItems(pathname: string): AdminBreadcrumbItem[] {
  return STATIC_BREADCRUMBS[pathname] ?? getModuleBreadcrumbItems(pathname) ?? [ADMIN_ROOT]
}
