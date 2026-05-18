import { createClient } from "@/lib/supabase/server"
import { listPublicEvents } from "@/lib/events/queries"
import { EVENTS_PAGE_SIZE } from "@/lib/config/events"

import { EventsPageClient } from "./events-page-client"

export const dynamic = "force-dynamic"

export default async function EventsPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  const events = await listPublicEvents({
    viewerId: data.user?.id ?? null,
    take: EVENTS_PAGE_SIZE,
  })

  return <EventsPageClient events={events} />
}
