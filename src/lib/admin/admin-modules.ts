import type { AdminModuleKey } from "@/lib/admin/admin-types"

import { EVENTS_ADMIN_MODULE } from "@/lib/admin/modules/events"
import { GROUPS_ADMIN_MODULE } from "@/lib/admin/modules/groups"
import { SUBJECTS_ADMIN_MODULE } from "@/lib/admin/modules/subjects"
import { USERS_ADMIN_MODULE } from "@/lib/admin/modules/users"

export type AdminModule =
  | typeof USERS_ADMIN_MODULE
  | typeof SUBJECTS_ADMIN_MODULE
  | typeof GROUPS_ADMIN_MODULE
  | typeof EVENTS_ADMIN_MODULE

export const ADMIN_MODULE_MAP = {
  users: USERS_ADMIN_MODULE,
  subjects: SUBJECTS_ADMIN_MODULE,
  groups: GROUPS_ADMIN_MODULE,
  events: EVENTS_ADMIN_MODULE,
} as const satisfies Record<AdminModuleKey, AdminModule>

export const ADMIN_MODULES = [
  ADMIN_MODULE_MAP.users,
  ADMIN_MODULE_MAP.subjects,
  ADMIN_MODULE_MAP.groups,
  ADMIN_MODULE_MAP.events,
] as const

export function getAdminModule<Key extends AdminModuleKey>(
  key: Key,
): (typeof ADMIN_MODULE_MAP)[Key] {
  return ADMIN_MODULE_MAP[key]
}
