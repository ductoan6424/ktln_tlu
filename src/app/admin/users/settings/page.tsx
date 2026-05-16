import { AdminSettingsPageShell } from "@/components/admin/shells/admin-settings-page-shell"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { getAdminModule } from "@/lib/admin/admin-modules"

const usersModule = getAdminModule("users")

export default async function AdminUserSettingsPage() {
  await requireAdminPermission("admin.users.manage")

  return <AdminSettingsPageShell module={usersModule} />
}
