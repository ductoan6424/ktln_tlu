import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { getUsersAdminModule } from "@/lib/admin/users/users-admin-data"

export default async function AdminUsersPage() {
  const usersModule = await getUsersAdminModule()

  return <AdminListPageShell module={usersModule} />
}
