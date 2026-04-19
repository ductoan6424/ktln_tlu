import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const groupsModule = getAdminModule("groups")

export default function AdminNewGroupPage() {
  return <AdminFormPageShell module={groupsModule} mode="create" />
}
