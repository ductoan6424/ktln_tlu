import { requireAdminPermission } from "@/lib/auth/authorization"
import { listAdminAnnouncements } from "@/lib/announcements/queries"

import AnnouncementsClient from "./announcements-client"

export const dynamic = "force-dynamic"

export default async function AnnouncementsPage() {
  await requireAdminPermission("admin.announcements.manage")

  const { items, total } = await listAdminAnnouncements({ take: 50 })

  return <AnnouncementsClient initialItems={items} initialTotal={total} />
}
