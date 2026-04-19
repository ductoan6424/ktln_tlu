import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const groupsModule = getAdminModule("groups")

export default function AdminGroupsPage() {
  return <AdminListPageShell module={groupsModule} />
}
