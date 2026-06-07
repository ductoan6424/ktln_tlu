import { EventForm } from "@/components/admin/event-form"
import { getEventAdminSettings } from "@/lib/admin/settings/admin-settings-queries"

export const dynamic = "force-dynamic"

export default async function AdminNewEventPage() {
  const defaults = await getEventAdminSettings()

  return <EventForm defaults={defaults} />
}
