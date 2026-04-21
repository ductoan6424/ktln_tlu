import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { getAdminModule } from "@/lib/admin/admin-modules"

const usersModule = getAdminModule("users")

export default async function AdminNewUserPage() {
  await requireAdminPermission("admin.users.manage")

  return <AdminFormPageShell module={usersModule} mode="create" />
}
