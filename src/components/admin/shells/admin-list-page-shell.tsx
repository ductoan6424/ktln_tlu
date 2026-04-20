import {
  AdminDataTable,
} from "@/components/admin/module/admin-data-table"
import { AdminActionList } from "@/components/admin/module/admin-action-list"
import { AdminFilterBar } from "@/components/admin/module/admin-filter-bar"
import { AdminPageHeader } from "@/components/admin/module/admin-page-header"
import { AdminStatsGrid } from "@/components/admin/module/admin-stats-grid"
import type { AdminModuleDefinition, AdminCellValues } from "@/lib/admin/admin-types"

interface AdminListPageShellProps<Cells extends AdminCellValues> {
  module: AdminModuleDefinition<Cells>
  activeTab?: string
  query?: string
}

function buildListTitle(entityName: string) {
  return `Quan ly ${entityName}`
}

function buildCreateLabel(entityName: string) {
  return `Them ${entityName}`
}

export function AdminListPageShell<Cells extends AdminCellValues>({
  module,
  activeTab: activeTabProp,
  query: queryProp,
}: AdminListPageShellProps<Cells>) {
  const hasHrefTabs = Boolean(module.tabs[0]?.href)
  const defaultTab = module.tabs.find((tab) => tab.active)?.value ?? module.tabs[0]?.value ?? ""
  const activeTab = activeTabProp ?? (hasHrefTabs ? "" : defaultTab)
  const query = queryProp

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={buildListTitle(module.entityNameSingular)}
        description={module.description}
        primaryAction={{
          label: buildCreateLabel(module.entityNameSingular),
          href: module.buildNewPath(),
        }}
      />
      <AdminStatsGrid stats={module.stats} />
      <AdminFilterBar
        activeTab={activeTab}
        query={query}
        tabs={module.tabs}
        searchPlaceholder={`Tim kiem ${module.entityNamePlural}...`}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminDataTable
          columns={module.columns}
          records={module.records.map((record) => ({
            ...record,
            href: record.href ?? module.buildDetailPath(record.id),
          }))}
          emptyState={{
            title: `Chua co ${module.entityNamePlural}`,
            description: `Bat dau bang cach tao ${module.entityNameSingular} dau tien.`,
            actionLabel: buildCreateLabel(module.entityNameSingular),
            actionHref: module.buildNewPath(),
          }}
        />
        <AdminActionList actions={module.quickActions} />
      </div>
    </div>
  )
}
