import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const subjectsModule = getAdminModule("subjects")

export default function AdminNewSubjectPage() {
  return <AdminFormPageShell module={subjectsModule} mode="create" />
}
