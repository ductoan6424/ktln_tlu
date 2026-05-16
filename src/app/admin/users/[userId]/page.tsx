import { notFound } from "next/navigation"

import { AdminDetailPageShell } from "@/components/admin/shells/admin-detail-page-shell"
import { getUsersAdminModule } from "@/lib/admin/users/users-admin-data"

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const [{ userId }, usersModule] = await Promise.all([
    params,
    getUsersAdminModule(),
  ])

  if (!usersModule.getRecord(userId)) {
    notFound()
  }

  return <AdminDetailPageShell module={usersModule} recordId={userId} />
}
