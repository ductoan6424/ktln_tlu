import { notFound } from "next/navigation"

import { requireSystemAdmin } from "@/lib/auth/authorization"
import { getUserAccessEditorData } from "@/lib/admin/users/users-admin-data"

import { UserAccessForm } from "./user-access-form"

export default async function AdminEditUserPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const [, editorData] = await Promise.all([
    requireSystemAdmin(),
    params.then(({ userId }) => getUserAccessEditorData(userId)),
  ])

  if (!editorData) {
    notFound()
  }

  return <UserAccessForm user={editorData.user} adminRoles={editorData.adminRoles} />
}
