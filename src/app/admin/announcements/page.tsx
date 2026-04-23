import { requireAdminPermission } from "@/lib/auth/authorization"

import AnnouncementsClient from "./announcements-client"

export default async function AnnouncementsPage() {
  await requireAdminPermission("admin.announcements.manage")

  return <AnnouncementsClient />
}
