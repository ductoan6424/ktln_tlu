import type { AdminModuleDefinition, AdminModuleKey } from "@/lib/admin/admin-types"

import { EVENTS_ADMIN_MODULE } from "@/lib/admin/modules/events"
import { GROUPS_ADMIN_MODULE } from "@/lib/admin/modules/groups"
import { SUBJECTS_ADMIN_MODULE } from "@/lib/admin/modules/subjects"
import { USERS_ADMIN_MODULE } from "@/lib/admin/modules/users"

export const ADMIN_MODULES: readonly AdminModuleDefinition[] = [
  USERS_ADMIN_MODULE,
  SUBJECTS_ADMIN_MODULE,
  GROUPS_ADMIN_MODULE,
  EVENTS_ADMIN_MODULE,
]

export function getAdminModule(key: AdminModuleKey): AdminModuleDefinition {
  const module = ADMIN_MODULES.find((candidate) => candidate.key === key)

  if (!module) {
    throw new Error(`Unknown admin module: ${key}`)
  }

  return module
}
