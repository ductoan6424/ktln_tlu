import { AdminListPageShell } from "@/components/admin/shells/admin-list-page-shell"
import { AdminUrlFilterBar } from "@/components/admin/module/admin-url-filter-bar"
import { getCoursesAdminModule } from "@/lib/admin/courses/courses-admin-data"

export const dynamic = "force-dynamic"

export default async function AdminSubjectsPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string; q?: string }>
}) {
  const params = await searchParams
  const activeTab = params?.tab ?? "all"
  const query = params?.q ?? ""
  const subjectsModule = await getCoursesAdminModule({ tab: activeTab, query })

  return (
    <AdminListPageShell
      module={subjectsModule}
      activeTab={activeTab}
      query={query}
      filterBar={(
        <AdminUrlFilterBar
          activeTab={activeTab}
          query={query}
          tabs={subjectsModule.tabs}
          searchPlaceholder="Tìm kiếm lớp học..."
        />
      )}
    />
  )
}
