import { listAdminEvents } from "@/lib/events/queries"
import type { EventStatus } from "@prisma/client"

import AdminEventsClient from "./admin-events-client"

export const dynamic = "force-dynamic"

const EVENT_STATUS_TABS = new Set(["all", "PUBLISHED", "DRAFT", "CANCELLED"])

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; q?: string }>
}) {
  const params = await searchParams
  const rawTab = params?.tab ?? "all"
  const activeTab = EVENT_STATUS_TABS.has(rawTab) ? rawTab : "all"
  const query = params?.q?.trim() ?? ""
  const events = await listAdminEvents({
    query,
    status: activeTab === "all" ? "all" : (activeTab as EventStatus),
  })

  return <AdminEventsClient activeTab={activeTab} events={events} query={query} />
}
