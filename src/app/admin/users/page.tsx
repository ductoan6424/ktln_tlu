import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const usersModule = getAdminModule("users")

export default function AdminUsersPage() {
  return <AdminListPageShell module={usersModule} />
}
