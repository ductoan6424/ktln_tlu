import { AdminSettingsPageShell } from "@/components/admin/shells/admin-settings-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const groupsModule = getAdminModule("groups")

export default function AdminGroupSettingsPage() {
  return <AdminSettingsPageShell module={groupsModule} />
}
