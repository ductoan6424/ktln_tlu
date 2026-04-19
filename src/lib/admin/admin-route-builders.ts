import type { AdminModulePaths } from "@/lib/admin/admin-types"

export function createAdminModulePaths(basePath: string): AdminModulePaths {
  const normalizedBasePath = basePath.replace(/\/+$/, "")

  return {
    list: normalizedBasePath,
    create: `${normalizedBasePath}/new`,
    settings: `${normalizedBasePath}/settings`,
    detail: `${normalizedBasePath}/[id]`,
    edit: `${normalizedBasePath}/[id]/edit`,
  }
}
