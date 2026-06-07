import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { AdminUrlFilterBar } from "@/components/admin/module/admin-url-filter-bar"
import { getGroupsAdminModule } from "@/lib/admin/groups/groups-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminGroupsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; q?: string }>
}) {
  const params = await searchParams
  const activeTab = params?.tab ?? "all"
  const query = params?.q ?? ""
  const groupsModule = await getGroupsAdminModule({ tab: activeTab, query })

  return (
    <AdminListPageShell
      module={groupsModule}
      activeTab={activeTab}
      query={query}
      filterBar={(
        <AdminUrlFilterBar
          activeTab={activeTab}
          query={query}
          tabs={groupsModule.tabs}
          searchPlaceholder="Tìm kiếm nhóm..."
        />
      )}
    />
  )
}
