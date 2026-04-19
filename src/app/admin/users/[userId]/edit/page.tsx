import { notFound } from "next/navigation"

import { AdminFormPageShell } from "@/components/admin/shells/admin-form-page-shell"
import { getAdminModule } from "@/lib/admin/admin-modules"

const usersModule = getAdminModule("users")

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const record = usersModule.getRecord(userId)

  if (!record) {
    notFound()
  }

  return <AdminFormPageShell module={usersModule} mode="edit" record={record} />
}
