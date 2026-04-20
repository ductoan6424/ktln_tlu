import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const eventsModule = getAdminModule("events")

export default function AdminEventsPage() {
  return <AdminListPageShell module={eventsModule} />
}
