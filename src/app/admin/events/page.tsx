import { listAdminEvents } from "@/lib/events/queries"

import AdminEventsClient from "./admin-events-client"

export const dynamic = "force-dynamic"

export default async function AdminEventsPage() {
  const events = await listAdminEvents()

  return <AdminEventsClient events={events} />
}
