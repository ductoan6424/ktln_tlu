import { AdminSettingsPageShell } from "@/components/admin/shells/admin-settings-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const eventsModule = getAdminModule("events")

export default function AdminEventSettingsPage() {
  return <AdminSettingsPageShell module={eventsModule} />
}
