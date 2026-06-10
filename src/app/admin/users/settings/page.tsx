import { UserImportSettingsForm } from "@/components/admin/settings/user-import-settings-form"
import { requireAdminPermission } from "@/lib/auth/authorization"
import { getUserImportSettings } from "@/lib/admin/settings/admin-settings-queries"

export const dynamic = "force-dynamic"

export default async function AdminUsersSettingsPage() {
  await requireAdminPermission("admin.users.manage")
  const settings = await getUserImportSettings()

  return <UserImportSettingsForm settings={settings} />
}
