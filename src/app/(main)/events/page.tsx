import { getCurrentUserContext } from "@/lib/auth/current-user-context"
import { listPublicEvents } from "@/lib/events/queries"
import { EVENTS_PAGE_SIZE } from "@/lib/config/events"

import { EventsPageClient } from "./events-page-client"


export default async function EventsPage() {
  const context = await getCurrentUserContext()
  const events = await listPublicEvents({
    viewerId: context.userId,
    take: EVENTS_PAGE_SIZE,
  })

  return <EventsPageClient events={events} />
}
