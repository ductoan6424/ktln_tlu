import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const subjectsModule = getAdminModule("subjects")

export default function AdminSubjectsPage() {
  return <AdminListPageShell module={subjectsModule} />
}
