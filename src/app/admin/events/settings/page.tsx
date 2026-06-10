import { EventAdminSettingsForm } from "@/components/admin/settings/event-admin-settings-form"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { getEventAdminSettings } from "@/lib/admin/settings/admin-settings-queries"

export const dynamic = "force-dynamic"

export default async function AdminEventSettingsPage() {
  await requireAdminPermission("admin.events.manage")
  const settings = await getEventAdminSettings()

  return <EventAdminSettingsForm settings={settings} />
}
