import { AdminSettingsPageShell } from "@/components/admin/shells/admin-settings-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const usersModule = getAdminModule("users")

export default function AdminUserSettingsPage() {
  return <AdminSettingsPageShell module={usersModule} />
}
