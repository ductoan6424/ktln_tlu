import { notFound } from "next/navigation"

import { AdminDetailPageShell } from "@/components/admin/shells/admin-detail-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const eventsModule = getAdminModule("events")

export default async function AdminEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params

  if (!eventsModule.getRecord(eventId)) {
    notFound()
  }

  return <AdminDetailPageShell module={eventsModule} recordId={eventId} />
}
