import { requireSystemAdmin } from "@/lib/auth/authorization"
import { getModuleFlags, getSystemSettings } from "@/lib/settings/queries"

import SettingsClient from "./settings-client"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  await requireSystemAdmin()

  const [settings, moduleFlags] = await Promise.all([
    getSystemSettings(),
    getModuleFlags(),
  ])

  return (
    <SettingsClient
      initialSettings={settings}
      initialModuleFlags={moduleFlags}
    />
  )
}
