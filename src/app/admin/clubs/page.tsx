import { AdminUrlFilterBar } from "@/components/admin/module/admin-url-filter-bar"
import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { getClubsAdminModule } from "@/lib/admin/clubs/clubs-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminClubsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; q?: string }>
}) {
  const params = await searchParams
  const activeTab = params?.tab ?? "all"
  const query = params?.q ?? ""
  const clubsModule = await getClubsAdminModule({ tab: activeTab, query })

  return (
    <AdminListPageShell
      module={clubsModule}
      activeTab={activeTab}
      query={query}
      filterBar={(
        <AdminUrlFilterBar
          activeTab={activeTab}
          query={query}
          tabs={clubsModule.tabs}
          searchPlaceholder="Tìm kiếm câu lạc bộ..."
        />
      )}
    />
  )
}
