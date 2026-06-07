import { ImportUsersClient } from "@/app/admin/users/import/import-users-client"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { getUserImportSettings } from "@/lib/admin/settings/admin-settings-queries"

export default async function AdminImportUsersPage() {
  await requireAdminPermission("admin.users.manage")
  const settings = await getUserImportSettings()

  return <ImportUsersClient settings={settings} />
}
