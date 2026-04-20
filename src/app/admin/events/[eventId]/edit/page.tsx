import { notFound } from "next/navigation"

import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const eventsModule = getAdminModule("events")

export default async function AdminEditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const record = eventsModule.getRecord(eventId)

  if (!record) {
    notFound()
  }

  return <AdminFormPageShell<typeof record.cells> module={eventsModule} mode="edit" record={record} />
}
