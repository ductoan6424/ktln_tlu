import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { isBaseRole } from "@/lib/auth/base-role"
import {
  getUsersAdminModule,
  type AdminUserStatusFilter,
} from "@/lib/admin/users/users-admin-data"

const STATUS_VALUES = new Set(["all", "active", "pending", "locked", "deleted"])

interface AdminUsersPageProps {
  searchParams: Promise<{ tab?: string; role?: string; q?: string }>
}

export default async function AdminUsersPage({ searchParams }: AdminUsersPageProps) {
  const params = await searchParams
  const status = STATUS_VALUES.has(params.tab ?? "")
    ? (params.tab as AdminUserStatusFilter)
    : "all"
  const role = isBaseRole(params.role) ? params.role : "all"
  const query = params.q?.trim() || undefined
  const usersModule = await getUsersAdminModule({ query, role, status })

  return <AdminListPageShell module={usersModule} activeTab={status} query={query} />
}
