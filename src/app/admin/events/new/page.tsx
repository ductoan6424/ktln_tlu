import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const eventsModule = getAdminModule("events")

export default function AdminNewEventPage() {
  return <AdminFormPageShell module={eventsModule} mode="create" />
}
