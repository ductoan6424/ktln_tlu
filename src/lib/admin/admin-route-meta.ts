import { ADMIN_MODULES } from "@/lib/admin/admin-modules"
import { ADMIN_MODULE_ROUTE_LABELS } from "@/lib/admin/admin-navigation"
import type { AdminBreadcrumbItem } from "@/lib/admin/admin-types"

const ADMIN_ROOT: AdminBreadcrumbItem = {
  label: "Admin",
  href: "/admin/dashboard",
}

const EDIT_BREADCRUMB_LABEL = "Chinh sua"

const STATIC_BREADCRUMBS: Record<string, AdminBreadcrumbItem[]> = {
  "/admin/dashboard": [ADMIN_ROOT, { label: "Dashboard" }],
  "/admin/announcements": [ADMIN_ROOT, { label: "Thong bao" }],
  "/admin/analytics": [ADMIN_ROOT, { label: "Phan tich" }],
  "/admin/settings": [ADMIN_ROOT, { label: "Cai dat he thong" }],
}

const MODULE_BY_KEY = new Map(ADMIN_MODULES.map((module) => [module.key, module]))

function formatBreadcrumbLabel(segment: string) {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

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

  const labels = ADMIN_MODULE_ROUTE_LABELS[adminModule.key]
  const baseHref = adminModule.basePath
  const detailHref = `${baseHref}/${segments[2]}`

  if (segments.length === 2) {
    return [ADMIN_ROOT, { label: labels.list }]
  }

  if (segments[2] === "new") {
    return [
      ADMIN_ROOT,
      { label: labels.list, href: baseHref },
      { label: labels.create },
    ]
  }

  if (segments[2] === "settings") {
    return [
      ADMIN_ROOT,
      { label: labels.list, href: baseHref },
      { label: labels.settings },
    ]
  }

  const recordId = segments[2]
  const nestedSegment = segments[3]

  if (!recordId) {
    return [ADMIN_ROOT, { label: labels.list }]
  }

  if (segments[3] === "edit") {
    return [
      ADMIN_ROOT,
      { label: labels.list, href: baseHref },
      { label: labels.detail, href: detailHref },
      { label: EDIT_BREADCRUMB_LABEL },
    ]
  }

  if (nestedSegment) {
    return [
      ADMIN_ROOT,
      { label: labels.list, href: baseHref },
      { label: labels.detail, href: detailHref },
      { label: formatBreadcrumbLabel(nestedSegment) },
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
