import { ADMIN_MODULES } from "@/lib/admin/admin-modules"
import { ADMIN_MODULE_ROUTE_LABELS } from "@/lib/admin/admin-navigation"
import type { AdminBreadcrumbItem } from "@/lib/admin/admin-types"

const ADMIN_ROOT: AdminBreadcrumbItem = {
  label: "Quản trị",
  href: "/admin/dashboard",
}

const EDIT_BREADCRUMB_LABEL = "Chỉnh sửa"

const STATIC_BREADCRUMBS: Record<string, AdminBreadcrumbItem[]> = {
  "/admin/dashboard": [ADMIN_ROOT, { label: "Bảng điều khiển" }],
  "/admin/announcements": [ADMIN_ROOT, { label: "Thông báo" }],
  "/admin/analytics": [ADMIN_ROOT, { label: "Phân tích" }],
  "/admin/settings": [ADMIN_ROOT, { label: "Cài đặt hệ thống" }],
}

const MODULE_BY_KEY = new Map(ADMIN_MODULES.map((module) => [module.key, module]))
const DYNAMIC_SEGMENT_LABELS: Record<string, string> = {
  members: "Thành viên",
  member: "Thành viên",
}

function formatBreadcrumbLabel(segment: string) {
  return segment
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => DYNAMIC_SEGMENT_LABELS[part] ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getBreadcrumbLabel(segment: string) {
  if (segment === "new") {
    return "Tạo mới"
  }

  if (segment === "edit") {
    return EDIT_BREADCRUMB_LABEL
  }

  return formatBreadcrumbLabel(segment)
}

function getModuleBreadcrumbItems(pathname: string): AdminBreadcrumbItem[] | null {
  const segments = pathname.split("/").filter(Boolean)

  if (segments[0] !== "admin" || segments.length < 2) {
    return null
  }

  const moduleKey = segments[1] as keyof typeof ADMIN_MODULE_ROUTE_LABELS
  const adminModule = MODULE_BY_KEY.get(moduleKey)

  if (!adminModule) {
    return null
  }

  const labels = ADMIN_MODULE_ROUTE_LABELS[adminModule.key]
  const baseHref = adminModule.basePath

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

  if (!recordId) {
    return [ADMIN_ROOT, { label: labels.list }]
  }

  const breadcrumbs: AdminBreadcrumbItem[] = [
    ADMIN_ROOT,
    { label: labels.list, href: baseHref },
  ]
  const detailHref = `${baseHref}/${recordId}`
  breadcrumbs.push({ label: labels.detail, href: detailHref })

  const nestedSegments = segments.slice(3)

  if (nestedSegments.length === 0) {
    return breadcrumbs
  }

  let nestedHref = detailHref

  for (let index = 0; index < nestedSegments.length; index += 1) {
    const segment = nestedSegments[index]!
    const isLastSegment = index === nestedSegments.length - 1

    nestedHref = `${nestedHref}/${segment}`

    const shouldLink = !isLastSegment && segment !== "new" && segment !== "edit"

    breadcrumbs.push({
      label: getBreadcrumbLabel(segment),
      ...(shouldLink ? { href: nestedHref } : {}),
    })
  }

  return breadcrumbs
}

export function getAdminBreadcrumbItems(pathname: string): AdminBreadcrumbItem[] {
  return STATIC_BREADCRUMBS[pathname] ?? getModuleBreadcrumbItems(pathname) ?? [ADMIN_ROOT]
}
