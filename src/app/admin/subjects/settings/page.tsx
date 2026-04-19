import { AdminSettingsPageShell } from "@/components/admin/shells/admin-settings-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const subjectsModule = getAdminModule("subjects")

export default function AdminSubjectSettingsPage() {
  return <AdminSettingsPageShell module={subjectsModule} />
}
