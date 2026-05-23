import { ImportUsersClient } from "@/app/admin/users/import/import-users-client"
import { requireAdminPermission } from "@/lib/auth/authorization"

export default async function AdminImportUsersPage() {
  await requireAdminPermission("admin.users.manage")

  return <ImportUsersClient />
}
