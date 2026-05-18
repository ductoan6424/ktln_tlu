import { notFound } from "next/navigation"

import { EventForm } from "@/components/admin/event-form"
import { getAdminEventById } from "@/lib/events/queries"

export default async function AdminEditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const { eventId } = await params
  const event = await getAdminEventById(eventId)

  if (!event) notFound()

  return (
    <EventForm
      initialValues={{
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        location: event.location,
        organizerName: event.organizerName,
        startAt: event.startAt,
        endAt: event.endAt,
        capacity: event.capacity,
        registrationStatus: event.registrationStatus,
        featured: event.featured,
        coverImageUrl: event.coverImageUrl,
        status: event.status,
      }}
    />
  )
}
