import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const usersModule = getAdminModule("users")

export default function AdminNewUserPage() {
  return <AdminFormPageShell module={usersModule} mode="create" />
}
